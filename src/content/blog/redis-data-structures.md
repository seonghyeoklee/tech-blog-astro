---
title: 'Redis 자료구조 - 상황에 맞는 선택이 성능을 결정한다'
description: 'Redis의 핵심 자료구조별 특징과 실무 활용법을 정리했습니다'
pubDate: 'Jan 11 2025'
tags: ['Redis', 'Database']
series: 'redis-in-practice'
seriesOrder: 1
---

"Redis는 캐시 아닌가요?" 맞습니다. 하지만 단순한 Key-Value 저장소로만 사용한다면 Redis의 10%도 활용하지 못하는 것입니다.

세션 저장은 String, 사용자 정보는 Hash, 최근 알림은 List, 좋아요 목록은 Set, 실시간 랭킹은 Sorted Set. 같은 기능도 어떤 자료구조를 선택하느냐에 따라 메모리 사용량과 성능이 크게 달라집니다.

## Redis 자료구조 개요

Redis는 단순 문자열부터 복잡한 스트림까지 다양한 자료구조를 제공합니다.

| 자료구조 | 설명 | 대표 사용 사례 |
|---------|------|---------------|
| **String** | 가장 기본적인 Key-Value | 캐시, 세션, 카운터 |
| **Hash** | 필드-값 쌍의 집합 | 사용자 정보, 상품 정보 |
| **List** | 순서가 있는 문자열 목록 | 최근 알림, 메시지 큐 |
| **Set** | 중복 없는 문자열 집합 | 태그, 좋아요 사용자 |
| **Sorted Set** | 점수로 정렬된 집합 | 랭킹, 리더보드 |
| **Bitmap** | 비트 단위 연산 | 출석 체크, 플래그 |
| **HyperLogLog** | 확률적 카디널리티 추정 | 고유 방문자 수 |
| **Stream** | 로그형 자료구조 | 이벤트 소싱, 메시지 브로커 |

---

## String - 모든 것의 기본

가장 단순하지만 가장 많이 사용됩니다. 최대 512MB까지 저장 가능합니다.

### 기본 명령어

```bash
# 저장과 조회
SET user:1:name "김철수"
GET user:1:name              # "김철수"

# TTL 설정 (초 단위)
SET session:abc123 "user_data" EX 3600    # 1시간 후 만료
SETEX session:abc123 3600 "user_data"     # 동일

# 존재하지 않을 때만 저장 (분산 락에 활용)
SETNX lock:order:123 "server1"            # 1(성공) 또는 0(실패)
SET lock:order:123 "server1" NX EX 30     # NX + TTL 조합

# 원자적 증감
INCR view:post:456           # 1씩 증가, 결과 반환
INCRBY view:post:456 10      # 10 증가
DECR stock:product:789       # 1씩 감소
```

### Spring에서 사용

```java
@Service
@RequiredArgsConstructor
public class CacheService {

    private final StringRedisTemplate redisTemplate;

    // 단순 캐시
    public void cacheUserName(Long userId, String name) {
        String key = "user:" + userId + ":name";
        redisTemplate.opsForValue().set(key, name, Duration.ofHours(1));
    }

    public String getCachedUserName(Long userId) {
        String key = "user:" + userId + ":name";
        return redisTemplate.opsForValue().get(key);
    }

    // 조회수 카운터
    public Long incrementViewCount(Long postId) {
        String key = "view:post:" + postId;
        return redisTemplate.opsForValue().increment(key);
    }

    // 분산 락 획득
    public boolean acquireLock(String lockKey, String value, Duration timeout) {
        Boolean result = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, value, timeout);
        return Boolean.TRUE.equals(result);
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `SET key value` | `opsForValue().set(key, value)` | 값 저장 |
| `SET key value EX 60` | `opsForValue().set(key, value, Duration.ofSeconds(60))` | TTL과 함께 저장 |
| `GET key` | `opsForValue().get(key)` | 값 조회 |
| `SETNX key value` | `opsForValue().setIfAbsent(key, value)` | 없을 때만 저장 |
| `SETEX key 60 value` | `opsForValue().set(key, value, Duration.ofSeconds(60))` | TTL 저장 |
| `INCR key` | `opsForValue().increment(key)` | 1 증가 |
| `INCRBY key 10` | `opsForValue().increment(key, 10)` | N 증가 |
| `DECR key` | `opsForValue().decrement(key)` | 1 감소 |
| `DEL key` | `delete(key)` | 키 삭제 |
| `EXPIRE key 60` | `expire(key, Duration.ofSeconds(60))` | TTL 설정 |
| `TTL key` | `getExpire(key)` | 남은 TTL 조회 |

### 실전 예시

**1. 세션 저장 (분산 환경)**

여러 서버에서 동일한 세션을 공유해야 할 때 사용합니다.

```java
@Service
@RequiredArgsConstructor
public class SessionService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void createSession(String sessionId, UserSession session) {
        String key = "session:" + sessionId;
        String value = objectMapper.writeValueAsString(session);
        redisTemplate.opsForValue().set(key, value, Duration.ofMinutes(30));
    }

    public UserSession getSession(String sessionId) {
        String key = "session:" + sessionId;
        String value = redisTemplate.opsForValue().get(key);
        if (value == null) return null;

        // 세션 접근 시 TTL 연장
        redisTemplate.expire(key, Duration.ofMinutes(30));
        return objectMapper.readValue(value, UserSession.class);
    }

    public void invalidateSession(String sessionId) {
        redisTemplate.delete("session:" + sessionId);
    }
}
```

**2. API Rate Limiting (슬라이딩 윈도우)**

사용자별 API 호출 횟수를 제한합니다.

```java
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private final StringRedisTemplate redisTemplate;

    /**
     * @return true면 허용, false면 차단
     */
    public boolean isAllowed(String userId, int maxRequests, Duration window) {
        String key = "ratelimit:" + userId;
        Long currentCount = redisTemplate.opsForValue().increment(key);

        if (currentCount == 1) {
            // 첫 요청일 때만 TTL 설정
            redisTemplate.expire(key, window);
        }

        return currentCount <= maxRequests;
    }

    public long getRemainingRequests(String userId, int maxRequests) {
        String key = "ratelimit:" + userId;
        String value = redisTemplate.opsForValue().get(key);
        long used = value != null ? Long.parseLong(value) : 0;
        return Math.max(0, maxRequests - used);
    }
}

// 컨트롤러에서 사용
@RestController
public class ApiController {

    @GetMapping("/api/resource")
    public ResponseEntity<?> getResource(@RequestHeader("X-User-Id") String userId) {
        if (!rateLimiter.isAllowed(userId, 100, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429)
                .body("Too Many Requests. Try again later.");
        }
        return ResponseEntity.ok(resourceService.get());
    }
}
```

**3. 분산 락 (재고 차감)**

동시에 여러 요청이 들어와도 재고가 정확하게 차감되도록 합니다.

```java
@Service
@RequiredArgsConstructor
public class StockService {

    private final StringRedisTemplate redisTemplate;
    private final StockRepository stockRepository;

    public boolean decreaseStock(Long productId, int quantity) {
        String lockKey = "lock:stock:" + productId;
        String lockValue = UUID.randomUUID().toString();

        try {
            // 락 획득 시도 (최대 3초 대기)
            boolean acquired = acquireLock(lockKey, lockValue, Duration.ofSeconds(10));
            if (!acquired) {
                throw new RuntimeException("락 획득 실패");
            }

            // 재고 차감 로직
            Stock stock = stockRepository.findById(productId).orElseThrow();
            if (stock.getQuantity() < quantity) {
                return false;  // 재고 부족
            }
            stock.decrease(quantity);
            stockRepository.save(stock);
            return true;

        } finally {
            releaseLock(lockKey, lockValue);
        }
    }

    private boolean acquireLock(String key, String value, Duration timeout) {
        return Boolean.TRUE.equals(
            redisTemplate.opsForValue().setIfAbsent(key, value, timeout)
        );
    }

    private void releaseLock(String key, String expectedValue) {
        // Lua 스크립트로 원자적 삭제 (본인이 획득한 락만 해제)
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;
        redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(key), expectedValue
        );
    }
}
```

---

## Hash - 객체를 효율적으로 저장

여러 필드를 하나의 키에 저장합니다. JSON 직렬화보다 개별 필드 접근이 효율적입니다.

### String vs Hash 비교

```bash
# String: 전체를 가져와서 파싱해야 함
SET user:1 '{"name":"김철수","email":"kim@example.com","age":30}'
GET user:1  # 전체 JSON 반환

# Hash: 필요한 필드만 조회 가능
HSET user:1 name "김철수" email "kim@example.com" age 30
HGET user:1 name           # "김철수"만 반환
HMGET user:1 name email    # 여러 필드 조회
HGETALL user:1             # 전체 필드 조회
```

### 기본 명령어

```bash
# 필드 저장
HSET user:1 name "김철수"
HSET user:1 email "kim@example.com" age 30  # 여러 필드

# 필드 조회
HGET user:1 name                 # 단일 필드
HMGET user:1 name email          # 여러 필드
HGETALL user:1                   # 전체 필드

# 필드 존재 확인
HEXISTS user:1 name              # 1 또는 0

# 숫자 필드 증감
HINCRBY user:1 point 100         # point 100 증가

# 필드 삭제
HDEL user:1 age
```

### Spring에서 사용

```java
@Service
@RequiredArgsConstructor
public class UserCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    public void cacheUser(User user) {
        String key = "user:" + user.getId();
        HashOperations<String, String, Object> ops = redisTemplate.opsForHash();

        Map<String, Object> fields = Map.of(
            "name", user.getName(),
            "email", user.getEmail(),
            "point", user.getPoint()
        );

        ops.putAll(key, fields);
        redisTemplate.expire(key, Duration.ofHours(24));
    }

    public String getUserName(Long userId) {
        String key = "user:" + userId;
        Object name = redisTemplate.opsForHash().get(key, "name");
        return name != null ? name.toString() : null;
    }

    // 포인트 증감 (원자적)
    public Long addUserPoint(Long userId, int amount) {
        String key = "user:" + userId;
        return redisTemplate.opsForHash().increment(key, "point", amount);
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `HSET key field value` | `opsForHash().put(key, field, value)` | 필드 저장 |
| `HMSET key f1 v1 f2 v2` | `opsForHash().putAll(key, map)` | 여러 필드 저장 |
| `HGET key field` | `opsForHash().get(key, field)` | 필드 조회 |
| `HMGET key f1 f2` | `opsForHash().multiGet(key, List.of(f1, f2))` | 여러 필드 조회 |
| `HGETALL key` | `opsForHash().entries(key)` | 전체 조회 |
| `HEXISTS key field` | `opsForHash().hasKey(key, field)` | 필드 존재 확인 |
| `HDEL key field` | `opsForHash().delete(key, field)` | 필드 삭제 |
| `HINCRBY key field 10` | `opsForHash().increment(key, field, 10)` | 숫자 증가 |
| `HLEN key` | `opsForHash().size(key)` | 필드 개수 |
| `HKEYS key` | `opsForHash().keys(key)` | 모든 필드명 |
| `HVALS key` | `opsForHash().values(key)` | 모든 값 |

### 실전 예시

**1. 장바구니**

상품별 수량을 필드로 관리합니다. 전체 조회, 개별 수량 변경 모두 효율적입니다.

```java
@Service
@RequiredArgsConstructor
public class CartService {

    private final RedisTemplate<String, Object> redisTemplate;

    private String cartKey(Long userId) {
        return "cart:" + userId;
    }

    // 상품 추가/수량 변경
    public void addItem(Long userId, Long productId, int quantity) {
        redisTemplate.opsForHash()
            .put(cartKey(userId), productId.toString(), quantity);
    }

    // 수량 증가
    public Long increaseQuantity(Long userId, Long productId, int delta) {
        return redisTemplate.opsForHash()
            .increment(cartKey(userId), productId.toString(), delta);
    }

    // 상품 제거
    public void removeItem(Long userId, Long productId) {
        redisTemplate.opsForHash()
            .delete(cartKey(userId), productId.toString());
    }

    // 장바구니 전체 조회
    public Map<Long, Integer> getCart(Long userId) {
        Map<Object, Object> entries = redisTemplate.opsForHash()
            .entries(cartKey(userId));

        return entries.entrySet().stream()
            .collect(Collectors.toMap(
                e -> Long.parseLong(e.getKey().toString()),
                e -> Integer.parseInt(e.getValue().toString())
            ));
    }

    // 장바구니 비우기
    public void clearCart(Long userId) {
        redisTemplate.delete(cartKey(userId));
    }

    // 장바구니 상품 개수
    public Long getItemCount(Long userId) {
        return redisTemplate.opsForHash().size(cartKey(userId));
    }
}
```

**2. 사용자 프로필 캐시 (부분 업데이트)**

프로필 전체를 캐싱하면서 특정 필드만 업데이트할 때 유용합니다.

```java
@Service
@RequiredArgsConstructor
public class UserProfileCache {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;

    public UserProfile getProfile(Long userId) {
        String key = "profile:" + userId;
        Map<Object, Object> cached = redisTemplate.opsForHash().entries(key);

        if (cached.isEmpty()) {
            // 캐시 미스: DB에서 조회 후 캐싱
            User user = userRepository.findById(userId).orElseThrow();
            cacheProfile(user);
            return UserProfile.from(user);
        }

        return UserProfile.fromMap(cached);
    }

    private void cacheProfile(User user) {
        String key = "profile:" + user.getId();
        Map<String, Object> fields = Map.of(
            "name", user.getName(),
            "email", user.getEmail(),
            "profileImage", user.getProfileImage(),
            "point", user.getPoint()
        );
        redisTemplate.opsForHash().putAll(key, fields);
        redisTemplate.expire(key, Duration.ofHours(24));
    }

    // 포인트만 업데이트 (전체 캐시 갱신 없이)
    public void addPoint(Long userId, int amount) {
        String key = "profile:" + userId;
        redisTemplate.opsForHash().increment(key, "point", amount);
    }

    // 프로필 이미지만 업데이트
    public void updateProfileImage(Long userId, String imageUrl) {
        String key = "profile:" + userId;
        redisTemplate.opsForHash().put(key, "profileImage", imageUrl);
    }
}
```

### 언제 Hash를 선택할까?

| 상황 | 권장 | 이유 |
|------|------|------|
| 객체 전체를 항상 조회 | String + JSON | 직렬화/역직렬화 1회 |
| 특정 필드만 자주 조회/수정 | Hash | 필드 단위 접근 효율적 |
| 숫자 필드 원자적 증감 필요 | Hash | HINCRBY 활용 |
| 필드별 만료 시간 다름 | String 여러 개 | Hash는 키 단위로만 TTL |

---

## List - 순서가 중요할 때

양방향 연결 리스트로 구현되어 있어 양쪽 끝에서의 삽입/삭제가 O(1)입니다.

### 기본 명령어

```bash
# 삽입
LPUSH notifications:user:1 "새 댓글이 달렸습니다"    # 왼쪽(앞)에 추가
RPUSH notifications:user:1 "주문이 완료되었습니다"   # 오른쪽(뒤)에 추가

# 조회
LRANGE notifications:user:1 0 9      # 처음 10개
LRANGE notifications:user:1 0 -1     # 전체 조회
LLEN notifications:user:1            # 길이

# 삭제
LPOP notifications:user:1            # 왼쪽에서 제거
RPOP notifications:user:1            # 오른쪽에서 제거
LTRIM notifications:user:1 0 99      # 처음 100개만 유지

# 블로킹 팝 (메시지 큐용)
BLPOP queue:tasks 30                 # 30초 대기
```

### Spring에서 사용

```java
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final StringRedisTemplate redisTemplate;
    private static final int MAX_NOTIFICATIONS = 100;

    public void addNotification(Long userId, String message) {
        String key = "notifications:" + userId;

        // 최신 알림을 앞에 추가
        redisTemplate.opsForList().leftPush(key, message);

        // 최대 100개만 유지
        redisTemplate.opsForList().trim(key, 0, MAX_NOTIFICATIONS - 1);
    }

    public List<String> getRecentNotifications(Long userId, int count) {
        String key = "notifications:" + userId;
        return redisTemplate.opsForList().range(key, 0, count - 1);
    }
}
```

### 간단한 메시지 큐

```java
@Service
@RequiredArgsConstructor
public class SimpleMessageQueue {

    private final StringRedisTemplate redisTemplate;

    // Producer
    public void enqueue(String queueName, String message) {
        redisTemplate.opsForList().rightPush("queue:" + queueName, message);
    }

    // Consumer (블로킹)
    public String dequeue(String queueName, Duration timeout) {
        return redisTemplate.opsForList()
            .leftPop("queue:" + queueName, timeout);
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `LPUSH key value` | `opsForList().leftPush(key, value)` | 왼쪽에 추가 |
| `RPUSH key value` | `opsForList().rightPush(key, value)` | 오른쪽에 추가 |
| `LPUSH key v1 v2 v3` | `opsForList().leftPushAll(key, v1, v2, v3)` | 왼쪽에 여러 개 추가 |
| `LPOP key` | `opsForList().leftPop(key)` | 왼쪽에서 제거 |
| `RPOP key` | `opsForList().rightPop(key)` | 오른쪽에서 제거 |
| `BLPOP key 30` | `opsForList().leftPop(key, Duration.ofSeconds(30))` | 블로킹 팝 |
| `LRANGE key 0 9` | `opsForList().range(key, 0, 9)` | 범위 조회 |
| `LINDEX key 0` | `opsForList().index(key, 0)` | 인덱스로 조회 |
| `LLEN key` | `opsForList().size(key)` | 길이 |
| `LTRIM key 0 99` | `opsForList().trim(key, 0, 99)` | 범위만 유지 |
| `LSET key 0 value` | `opsForList().set(key, 0, value)` | 인덱스 위치 수정 |

### 실전 예시

**1. 최근 본 상품**

사용자가 본 상품을 최신순으로 저장하고, 최대 개수를 제한합니다.

```java
@Service
@RequiredArgsConstructor
public class RecentViewService {

    private final StringRedisTemplate redisTemplate;
    private static final int MAX_RECENT_ITEMS = 20;

    public void addRecentView(Long userId, Long productId) {
        String key = "recent:view:" + userId;
        String value = productId.toString();

        // 이미 있으면 제거 (중복 방지, 최신으로 이동)
        redisTemplate.opsForList().remove(key, 1, value);

        // 맨 앞에 추가
        redisTemplate.opsForList().leftPush(key, value);

        // 최대 개수 유지
        redisTemplate.opsForList().trim(key, 0, MAX_RECENT_ITEMS - 1);

        // 30일 후 만료
        redisTemplate.expire(key, Duration.ofDays(30));
    }

    public List<Long> getRecentViews(Long userId, int count) {
        String key = "recent:view:" + userId;
        List<String> values = redisTemplate.opsForList()
            .range(key, 0, count - 1);

        return values != null
            ? values.stream().map(Long::parseLong).toList()
            : List.of();
    }
}
```

**2. 알림 피드**

최신 알림을 앞에 추가하고, 오래된 알림은 자동으로 제거합니다.

```java
@Service
@RequiredArgsConstructor
public class NotificationFeedService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private static final int MAX_NOTIFICATIONS = 100;

    public void pushNotification(Long userId, Notification notification) {
        String key = "notifications:" + userId;
        String json = objectMapper.writeValueAsString(notification);

        redisTemplate.opsForList().leftPush(key, json);
        redisTemplate.opsForList().trim(key, 0, MAX_NOTIFICATIONS - 1);
    }

    // 페이지네이션 조회
    public List<Notification> getNotifications(Long userId, int page, int size) {
        String key = "notifications:" + userId;
        int start = page * size;
        int end = start + size - 1;

        List<String> values = redisTemplate.opsForList().range(key, start, end);

        return values != null
            ? values.stream()
                .map(json -> objectMapper.readValue(json, Notification.class))
                .toList()
            : List.of();
    }

    public Long getUnreadCount(Long userId) {
        // 별도 카운터로 관리하거나 List 길이 활용
        return redisTemplate.opsForList().size("notifications:" + userId);
    }
}
```

**3. 작업 큐 (Producer-Consumer)**

백그라운드 작업을 큐에 넣고, Worker가 처리합니다.

```java
// Producer: 작업 등록
@Service
@RequiredArgsConstructor
public class EmailQueueProducer {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void enqueue(EmailTask task) {
        String json = objectMapper.writeValueAsString(task);
        redisTemplate.opsForList().rightPush("queue:email", json);
    }
}

// Consumer: 작업 처리
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailQueueConsumer {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final EmailSender emailSender;

    @Scheduled(fixedDelay = 100)  // 100ms마다 폴링
    public void processQueue() {
        // 블로킹 팝: 최대 5초 대기
        String json = redisTemplate.opsForList()
            .leftPop("queue:email", Duration.ofSeconds(5));

        if (json != null) {
            try {
                EmailTask task = objectMapper.readValue(json, EmailTask.class);
                emailSender.send(task);
            } catch (Exception e) {
                log.error("이메일 발송 실패", e);
                // 실패한 작업은 별도 큐로 이동 (Dead Letter Queue)
                redisTemplate.opsForList().rightPush("queue:email:failed", json);
            }
        }
    }
}
```

### List 주의사항

- 중간 요소 접근은 O(n) → `LINDEX list 50000`은 느림
- 양 끝 작업은 O(1) → `LPUSH`, `RPUSH`, `LPOP`, `RPOP`은 빠름
- 대용량은 `LTRIM`으로 크기 관리 필요

---

## Set - 중복 없는 집합

중복을 허용하지 않고, 집합 연산(합집합, 교집합, 차집합)을 지원합니다.

### 기본 명령어

```bash
# 추가
SADD likes:post:123 user:1 user:2 user:3
SADD tags:post:123 "redis" "database" "cache"

# 조회
SMEMBERS likes:post:123          # 모든 멤버
SISMEMBER likes:post:123 user:1  # 멤버 여부 (1 또는 0)
SCARD likes:post:123             # 멤버 수
SRANDMEMBER likes:post:123 3     # 랜덤 3개

# 삭제
SREM likes:post:123 user:1

# 집합 연산
SINTER tags:post:123 tags:post:456     # 교집합 (공통 태그)
SUNION tags:post:123 tags:post:456     # 합집합
SDIFF tags:post:123 tags:post:456      # 차집합
```

### Spring에서 사용

```java
@Service
@RequiredArgsConstructor
public class LikeService {

    private final StringRedisTemplate redisTemplate;

    public void like(Long postId, Long userId) {
        String key = "likes:post:" + postId;
        redisTemplate.opsForSet().add(key, userId.toString());
    }

    public void unlike(Long postId, Long userId) {
        String key = "likes:post:" + postId;
        redisTemplate.opsForSet().remove(key, userId.toString());
    }

    public boolean isLiked(Long postId, Long userId) {
        String key = "likes:post:" + postId;
        Boolean result = redisTemplate.opsForSet()
            .isMember(key, userId.toString());
        return Boolean.TRUE.equals(result);
    }

    public Long getLikeCount(Long postId) {
        String key = "likes:post:" + postId;
        return redisTemplate.opsForSet().size(key);
    }
}
```

### 실전 예시

**1. 좋아요 기능**

누가 좋아요를 눌렀는지 저장하고, 중복을 자동으로 방지합니다.

```java
@Service
@RequiredArgsConstructor
public class LikeService {

    private final StringRedisTemplate redisTemplate;
    private final LikeRepository likeRepository;  // DB 영속화용

    public boolean toggleLike(Long postId, Long userId) {
        String key = "likes:post:" + postId;
        String member = userId.toString();

        Boolean isLiked = redisTemplate.opsForSet().isMember(key, member);

        if (Boolean.TRUE.equals(isLiked)) {
            // 이미 좋아요 → 취소
            redisTemplate.opsForSet().remove(key, member);
            likeRepository.delete(postId, userId);  // DB 동기화
            return false;
        } else {
            // 좋아요 추가
            redisTemplate.opsForSet().add(key, member);
            likeRepository.save(new Like(postId, userId));
            return true;
        }
    }

    public LikeInfo getLikeInfo(Long postId, Long currentUserId) {
        String key = "likes:post:" + postId;
        Long count = redisTemplate.opsForSet().size(key);
        Boolean isLiked = redisTemplate.opsForSet()
            .isMember(key, currentUserId.toString());

        return new LikeInfo(count, Boolean.TRUE.equals(isLiked));
    }

    // 좋아요 누른 사용자 목록 (페이지네이션은 SSCAN 활용)
    public Set<Long> getLikedUsers(Long postId) {
        String key = "likes:post:" + postId;
        Set<String> members = redisTemplate.opsForSet().members(key);
        return members != null
            ? members.stream().map(Long::parseLong).collect(Collectors.toSet())
            : Set.of();
    }
}

public record LikeInfo(Long count, boolean isLiked) {}
```

**2. 팔로우/팔로워 관계**

Set의 집합 연산으로 맞팔로우, 공통 팔로잉 등을 쉽게 구현합니다.

```java
@Service
@RequiredArgsConstructor
public class FollowService {

    private final StringRedisTemplate redisTemplate;

    // 팔로우
    public void follow(Long userId, Long targetId) {
        // 내가 팔로우하는 목록
        redisTemplate.opsForSet().add("following:" + userId, targetId.toString());
        // 상대방의 팔로워 목록
        redisTemplate.opsForSet().add("followers:" + targetId, userId.toString());
    }

    // 언팔로우
    public void unfollow(Long userId, Long targetId) {
        redisTemplate.opsForSet().remove("following:" + userId, targetId.toString());
        redisTemplate.opsForSet().remove("followers:" + targetId, userId.toString());
    }

    // 맞팔로우 여부
    public boolean isMutualFollow(Long userId1, Long userId2) {
        Boolean follows1to2 = redisTemplate.opsForSet()
            .isMember("following:" + userId1, userId2.toString());
        Boolean follows2to1 = redisTemplate.opsForSet()
            .isMember("following:" + userId2, userId1.toString());

        return Boolean.TRUE.equals(follows1to2) && Boolean.TRUE.equals(follows2to1);
    }

    // 공통 팔로잉 (함께 아는 사람)
    public Set<String> getCommonFollowing(Long userId1, Long userId2) {
        return redisTemplate.opsForSet().intersect(
            "following:" + userId1,
            "following:" + userId2
        );
    }

    // 팔로우 추천: 내 팔로잉의 팔로잉 - 내 팔로잉 - 나
    public Set<String> recommendUsers(Long userId) {
        String myFollowing = "following:" + userId;
        Set<String> following = redisTemplate.opsForSet().members(myFollowing);

        if (following == null || following.isEmpty()) {
            return Set.of();
        }

        // 팔로잉들의 팔로잉 합집합
        String[] followingKeys = following.stream()
            .map(id -> "following:" + id)
            .toArray(String[]::new);

        String tempKey = "temp:recommend:" + userId;
        redisTemplate.opsForSet().unionAndStore(followingKeys[0],
            Arrays.asList(followingKeys).subList(1, followingKeys.length), tempKey);

        // 이미 팔로우 중인 사람과 자신 제외
        Set<String> recommendations = redisTemplate.opsForSet()
            .difference(tempKey, myFollowing);

        redisTemplate.delete(tempKey);
        recommendations.remove(userId.toString());

        return recommendations;
    }
}
```

**3. 태그 기반 검색**

상품에 태그를 붙이고, 교집합으로 여러 태그를 모두 가진 상품을 찾습니다.

```java
@Service
@RequiredArgsConstructor
public class TagService {

    private final StringRedisTemplate redisTemplate;

    // 상품에 태그 추가
    public void addTags(Long productId, String... tags) {
        // 상품의 태그 목록
        redisTemplate.opsForSet().add("product:tags:" + productId, tags);

        // 태그별 상품 목록 (역인덱스)
        for (String tag : tags) {
            redisTemplate.opsForSet().add("tag:products:" + tag, productId.toString());
        }
    }

    // 특정 태그를 가진 상품들
    public Set<String> getProductsByTag(String tag) {
        return redisTemplate.opsForSet().members("tag:products:" + tag);
    }

    // 여러 태그를 모두 가진 상품 (AND 검색)
    public Set<String> getProductsByAllTags(String... tags) {
        String[] keys = Arrays.stream(tags)
            .map(tag -> "tag:products:" + tag)
            .toArray(String[]::new);

        return redisTemplate.opsForSet().intersect(keys[0],
            Arrays.asList(keys).subList(1, keys.length));
    }

    // 여러 태그 중 하나라도 가진 상품 (OR 검색)
    public Set<String> getProductsByAnyTag(String... tags) {
        String[] keys = Arrays.stream(tags)
            .map(tag -> "tag:products:" + tag)
            .toArray(String[]::new);

        return redisTemplate.opsForSet().union(keys[0],
            Arrays.asList(keys).subList(1, keys.length));
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `SADD key v1 v2` | `opsForSet().add(key, v1, v2)` | 멤버 추가 |
| `SREM key value` | `opsForSet().remove(key, value)` | 멤버 제거 |
| `SMEMBERS key` | `opsForSet().members(key)` | 전체 멤버 조회 |
| `SISMEMBER key value` | `opsForSet().isMember(key, value)` | 멤버 여부 확인 |
| `SCARD key` | `opsForSet().size(key)` | 멤버 수 |
| `SRANDMEMBER key 3` | `opsForSet().randomMembers(key, 3)` | 랜덤 N개 |
| `SPOP key` | `opsForSet().pop(key)` | 랜덤 제거 |
| `SINTER key1 key2` | `opsForSet().intersect(key1, key2)` | 교집합 |
| `SUNION key1 key2` | `opsForSet().union(key1, key2)` | 합집합 |
| `SDIFF key1 key2` | `opsForSet().difference(key1, key2)` | 차집합 |

---

## Sorted Set - 정렬된 집합

Set과 비슷하지만 각 멤버에 점수(score)가 있어 정렬 상태를 유지합니다. 랭킹 시스템에 최적입니다.

### 기본 명령어

```bash
# 추가 (점수와 함께)
ZADD leaderboard 1500 "player:1"
ZADD leaderboard 2000 "player:2" 1800 "player:3"

# 점수순 조회
ZRANGE leaderboard 0 9                    # 하위 10명
ZREVRANGE leaderboard 0 9                 # 상위 10명
ZREVRANGE leaderboard 0 9 WITHSCORES      # 점수도 함께

# 순위 조회
ZRANK leaderboard "player:1"              # 순위 (0부터)
ZREVRANK leaderboard "player:1"           # 역순위

# 점수 조회/수정
ZSCORE leaderboard "player:1"             # 점수 조회
ZINCRBY leaderboard 100 "player:1"        # 점수 100 증가

# 범위로 조회
ZRANGEBYSCORE leaderboard 1000 2000       # 점수 1000~2000
ZCOUNT leaderboard 1000 2000              # 해당 범위 멤버 수
```

### Spring에서 사용 - 랭킹 시스템

```java
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final StringRedisTemplate redisTemplate;
    private static final String KEY = "leaderboard:game:1";

    // 점수 갱신
    public void updateScore(String playerId, double score) {
        redisTemplate.opsForZSet().add(KEY, playerId, score);
    }

    // 점수 증가
    public Double addScore(String playerId, double delta) {
        return redisTemplate.opsForZSet().incrementScore(KEY, playerId, delta);
    }

    // 상위 N명 조회
    public List<PlayerRank> getTopPlayers(int count) {
        Set<ZSetOperations.TypedTuple<String>> results =
            redisTemplate.opsForZSet().reverseRangeWithScores(KEY, 0, count - 1);

        if (results == null) return List.of();

        AtomicInteger rank = new AtomicInteger(1);
        return results.stream()
            .map(tuple -> new PlayerRank(
                rank.getAndIncrement(),
                tuple.getValue(),
                tuple.getScore()
            ))
            .toList();
    }

    // 특정 플레이어 순위 조회
    public Long getPlayerRank(String playerId) {
        Long rank = redisTemplate.opsForZSet().reverseRank(KEY, playerId);
        return rank != null ? rank + 1 : null;  // 1부터 시작
    }
}

public record PlayerRank(int rank, String playerId, Double score) {}
```

### 실전 예시

**1. 게임 리더보드**

실시간 랭킹을 관리하고, 내 순위와 주변 플레이어를 조회합니다.

```java
@Service
@RequiredArgsConstructor
public class GameLeaderboardService {

    private final StringRedisTemplate redisTemplate;

    private String leaderboardKey(String gameId) {
        return "leaderboard:" + gameId;
    }

    // 점수 갱신 (게임 종료 시)
    public void submitScore(String gameId, Long userId, int score) {
        String key = leaderboardKey(gameId);
        Double currentScore = redisTemplate.opsForZSet().score(key, userId.toString());

        // 최고 점수만 저장
        if (currentScore == null || score > currentScore) {
            redisTemplate.opsForZSet().add(key, userId.toString(), score);
        }
    }

    // 상위 랭킹 조회
    public List<RankEntry> getTopRanks(String gameId, int count) {
        String key = leaderboardKey(gameId);
        Set<ZSetOperations.TypedTuple<String>> results =
            redisTemplate.opsForZSet().reverseRangeWithScores(key, 0, count - 1);

        if (results == null) return List.of();

        AtomicInteger rank = new AtomicInteger(1);
        return results.stream()
            .map(t -> new RankEntry(rank.getAndIncrement(), Long.parseLong(t.getValue()), t.getScore().intValue()))
            .toList();
    }

    // 내 순위 조회
    public RankEntry getMyRank(String gameId, Long userId) {
        String key = leaderboardKey(gameId);
        Long rank = redisTemplate.opsForZSet().reverseRank(key, userId.toString());
        Double score = redisTemplate.opsForZSet().score(key, userId.toString());

        if (rank == null || score == null) return null;

        return new RankEntry(rank.intValue() + 1, userId, score.intValue());
    }

    // 내 주변 순위 (위아래 N명)
    public List<RankEntry> getRanksAroundMe(String gameId, Long userId, int range) {
        String key = leaderboardKey(gameId);
        Long myRank = redisTemplate.opsForZSet().reverseRank(key, userId.toString());

        if (myRank == null) return List.of();

        long start = Math.max(0, myRank - range);
        long end = myRank + range;

        Set<ZSetOperations.TypedTuple<String>> results =
            redisTemplate.opsForZSet().reverseRangeWithScores(key, start, end);

        if (results == null) return List.of();

        AtomicInteger rank = new AtomicInteger((int) start + 1);
        return results.stream()
            .map(t -> new RankEntry(rank.getAndIncrement(), Long.parseLong(t.getValue()), t.getScore().intValue()))
            .toList();
    }
}

public record RankEntry(int rank, Long userId, int score) {}
```

**2. 실시간 인기 검색어**

검색할 때마다 점수를 1 올리고, 상위 N개를 보여줍니다.

```java
@Service
@RequiredArgsConstructor
public class TrendingSearchService {

    private final StringRedisTemplate redisTemplate;

    public void recordSearch(String keyword) {
        String key = "trending:" + LocalDate.now();
        redisTemplate.opsForZSet().incrementScore(key, keyword.toLowerCase(), 1);
        redisTemplate.expire(key, Duration.ofDays(2));
    }

    public List<TrendingKeyword> getTrendingKeywords(int count) {
        String key = "trending:" + LocalDate.now();
        Set<ZSetOperations.TypedTuple<String>> results =
            redisTemplate.opsForZSet().reverseRangeWithScores(key, 0, count - 1);

        if (results == null) return List.of();

        AtomicInteger rank = new AtomicInteger(1);
        return results.stream()
            .map(t -> new TrendingKeyword(rank.getAndIncrement(), t.getValue(), t.getScore().longValue()))
            .toList();
    }

    // 순위 변동 계산 (어제와 비교)
    public List<TrendingKeyword> getTrendingWithChange(int count) {
        String todayKey = "trending:" + LocalDate.now();
        String yesterdayKey = "trending:" + LocalDate.now().minusDays(1);

        Set<ZSetOperations.TypedTuple<String>> todayResults =
            redisTemplate.opsForZSet().reverseRangeWithScores(todayKey, 0, count - 1);

        if (todayResults == null) return List.of();

        AtomicInteger rank = new AtomicInteger(1);
        return todayResults.stream()
            .map(t -> {
                int currentRank = rank.getAndIncrement();
                Long yesterdayRank = redisTemplate.opsForZSet()
                    .reverseRank(yesterdayKey, t.getValue());

                Integer change = yesterdayRank != null
                    ? (int) (yesterdayRank + 1 - currentRank)  // 양수면 상승
                    : null;  // 신규 진입

                return new TrendingKeyword(currentRank, t.getValue(), t.getScore().longValue(), change);
            })
            .toList();
    }
}

public record TrendingKeyword(int rank, String keyword, long searchCount, Integer rankChange) {
    public TrendingKeyword(int rank, String keyword, long searchCount) {
        this(rank, keyword, searchCount, null);
    }
}
```

**3. 지연 작업 큐 (Delayed Queue)**

특정 시간이 지난 후 실행할 작업을 예약합니다.

```java
@Service
@RequiredArgsConstructor
public class DelayedQueueService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String DELAYED_QUEUE = "delayed:queue";

    // 작업 예약 (N초 후 실행)
    public void schedule(Task task, Duration delay) {
        long executeAt = System.currentTimeMillis() + delay.toMillis();
        String json = objectMapper.writeValueAsString(task);

        // score = 실행 예정 시간 (timestamp)
        redisTemplate.opsForZSet().add(DELAYED_QUEUE, json, executeAt);
    }

    // 실행 가능한 작업 조회 및 처리
    @Scheduled(fixedDelay = 1000)  // 1초마다 폴링
    public void processDueJobs() {
        long now = System.currentTimeMillis();

        // score가 현재 시간보다 작은 작업들 조회
        Set<String> dueJobs = redisTemplate.opsForZSet()
            .rangeByScore(DELAYED_QUEUE, 0, now);

        if (dueJobs == null || dueJobs.isEmpty()) return;

        for (String json : dueJobs) {
            // 원자적으로 제거 (다른 워커와 중복 처리 방지)
            Long removed = redisTemplate.opsForZSet().remove(DELAYED_QUEUE, json);

            if (removed != null && removed > 0) {
                Task task = objectMapper.readValue(json, Task.class);
                executeTask(task);
            }
        }
    }

    private void executeTask(Task task) {
        // 작업 실행 로직
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `ZADD key score member` | `opsForZSet().add(key, member, score)` | 멤버 추가 |
| `ZREM key member` | `opsForZSet().remove(key, member)` | 멤버 제거 |
| `ZSCORE key member` | `opsForZSet().score(key, member)` | 점수 조회 |
| `ZINCRBY key 10 member` | `opsForZSet().incrementScore(key, member, 10)` | 점수 증가 |
| `ZRANK key member` | `opsForZSet().rank(key, member)` | 순위 (낮은 점수 = 0) |
| `ZREVRANK key member` | `opsForZSet().reverseRank(key, member)` | 역순위 (높은 점수 = 0) |
| `ZRANGE key 0 9` | `opsForZSet().range(key, 0, 9)` | 범위 조회 (오름차순) |
| `ZREVRANGE key 0 9` | `opsForZSet().reverseRange(key, 0, 9)` | 범위 조회 (내림차순) |
| `ZRANGE key 0 9 WITHSCORES` | `opsForZSet().rangeWithScores(key, 0, 9)` | 점수와 함께 조회 |
| `ZRANGEBYSCORE key 0 100` | `opsForZSet().rangeByScore(key, 0, 100)` | 점수 범위로 조회 |
| `ZCOUNT key 0 100` | `opsForZSet().count(key, 0, 100)` | 점수 범위 내 멤버 수 |
| `ZCARD key` | `opsForZSet().size(key)` | 전체 멤버 수 |

---

## Bitmap - 비트 단위로 효율적인 저장

String의 각 비트를 독립적으로 조작합니다. 불리언 값을 대량으로 저장할 때 메모리 효율적입니다.

### 메모리 효율성

```
1억 명의 일일 활성 사용자(DAU) 저장:
- Set 사용: 약 400MB (userId당 4바이트)
- Bitmap 사용: 약 12MB (1억 비트)

→ 약 32배 메모리 절약
```

### 기본 명령어

```bash
# 비트 설정
SETBIT active:2025-01-11 1001 1    # userId 1001번 활성
SETBIT active:2025-01-11 1002 1    # userId 1002번 활성

# 비트 조회
GETBIT active:2025-01-11 1001      # 1 또는 0

# 비트 카운팅
BITCOUNT active:2025-01-11         # 활성 사용자 수

# 비트 연산
BITOP AND week active:01-06 active:01-07 ... active:01-11  # 연속 접속
BITOP OR week-any active:01-06 active:01-07 ...            # 한 번이라도 접속
```

### Spring에서 사용 - 출석 체크

```java
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final StringRedisTemplate redisTemplate;

    public void checkIn(Long userId) {
        String key = "attendance:" + LocalDate.now();
        redisTemplate.opsForValue().setBit(key, userId, true);
    }

    public boolean hasCheckedIn(Long userId) {
        String key = "attendance:" + LocalDate.now();
        Boolean result = redisTemplate.opsForValue().getBit(key, userId);
        return Boolean.TRUE.equals(result);
    }

    public Long getTodayAttendanceCount() {
        String key = "attendance:" + LocalDate.now();
        return redisTemplate.execute((RedisCallback<Long>) connection ->
            connection.stringCommands().bitCount(key.getBytes())
        );
    }
}
```

### 실전 예시

**1. 연속 출석 체크 이벤트**

7일 연속 출석 시 보상을 지급하는 이벤트입니다.

```java
@Service
@RequiredArgsConstructor
public class AttendanceEventService {

    private final StringRedisTemplate redisTemplate;
    private final RewardService rewardService;

    private static final int CONSECUTIVE_DAYS = 7;

    // 출석 체크
    public AttendanceResult checkIn(Long userId) {
        String todayKey = attendanceKey(LocalDate.now());

        // 이미 출석했는지 확인
        Boolean alreadyChecked = redisTemplate.opsForValue().getBit(todayKey, userId);
        if (Boolean.TRUE.equals(alreadyChecked)) {
            return AttendanceResult.alreadyChecked();
        }

        // 출석 체크
        redisTemplate.opsForValue().setBit(todayKey, userId, true);

        // 연속 출석 확인
        int consecutiveDays = getConsecutiveDays(userId);

        if (consecutiveDays >= CONSECUTIVE_DAYS) {
            rewardService.grantReward(userId, "7일 연속 출석 보상");
            return AttendanceResult.rewardGranted(consecutiveDays);
        }

        return AttendanceResult.success(consecutiveDays);
    }

    // 연속 출석 일수 계산
    private int getConsecutiveDays(Long userId) {
        int count = 0;
        LocalDate date = LocalDate.now();

        for (int i = 0; i < CONSECUTIVE_DAYS; i++) {
            String key = attendanceKey(date.minusDays(i));
            Boolean attended = redisTemplate.opsForValue().getBit(key, userId);

            if (Boolean.TRUE.equals(attended)) {
                count++;
            } else {
                break;  // 연속 끊김
            }
        }

        return count;
    }

    // 오늘 출석자 수
    public Long getTodayAttendanceCount() {
        String key = attendanceKey(LocalDate.now());
        return redisTemplate.execute((RedisCallback<Long>) conn ->
            conn.stringCommands().bitCount(key.getBytes())
        );
    }

    private String attendanceKey(LocalDate date) {
        return "attendance:" + date;
    }
}

public record AttendanceResult(boolean success, boolean alreadyChecked, int consecutiveDays, boolean rewardGranted) {
    public static AttendanceResult success(int days) { return new AttendanceResult(true, false, days, false); }
    public static AttendanceResult alreadyChecked() { return new AttendanceResult(false, true, 0, false); }
    public static AttendanceResult rewardGranted(int days) { return new AttendanceResult(true, false, days, true); }
}
```

**2. 기능 플래그 (Feature Flag)**

사용자별로 특정 기능 활성화 여부를 관리합니다.

```java
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final StringRedisTemplate redisTemplate;

    // 특정 사용자에게 기능 활성화
    public void enableFeature(String featureName, Long userId) {
        String key = "feature:" + featureName;
        redisTemplate.opsForValue().setBit(key, userId, true);
    }

    // 기능 비활성화
    public void disableFeature(String featureName, Long userId) {
        String key = "feature:" + featureName;
        redisTemplate.opsForValue().setBit(key, userId, false);
    }

    // 사용자가 해당 기능 사용 가능한지 확인
    public boolean isFeatureEnabled(String featureName, Long userId) {
        String key = "feature:" + featureName;
        Boolean enabled = redisTemplate.opsForValue().getBit(key, userId);
        return Boolean.TRUE.equals(enabled);
    }

    // 특정 기능 활성화된 사용자 수
    public Long getEnabledUserCount(String featureName) {
        String key = "feature:" + featureName;
        return redisTemplate.execute((RedisCallback<Long>) conn ->
            conn.stringCommands().bitCount(key.getBytes())
        );
    }

    // 퍼센트 기반 롤아웃 (userId % 100 < percentage면 활성화)
    public boolean isFeatureEnabledByPercentage(String featureName, Long userId, int percentage) {
        return userId % 100 < percentage;
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `SETBIT key offset 1` | `opsForValue().setBit(key, offset, true)` | 비트 설정 |
| `GETBIT key offset` | `opsForValue().getBit(key, offset)` | 비트 조회 |
| `BITCOUNT key` | `execute(conn -> conn.stringCommands().bitCount(key))` | 1인 비트 수 |
| `BITOP AND dest k1 k2` | `execute(conn -> conn.stringCommands().bitOp(...))` | 비트 AND 연산 |
| `BITOP OR dest k1 k2` | `execute(conn -> conn.stringCommands().bitOp(...))` | 비트 OR 연산 |

---

## HyperLogLog - 대략적인 카운팅

고유 값의 개수를 확률적으로 추정합니다. 0.81% 오차율로 12KB 고정 메모리만 사용합니다.

### Set vs HyperLogLog

```
1억 개의 고유 IP 카운팅:
- Set 사용: 약 1.5GB
- HyperLogLog 사용: 12KB (고정)

→ 정확도 99.19%, 메모리 10만 배 절약
```

### 기본 명령어

```bash
# 추가
PFADD visitors:2025-01-11 "ip:1.2.3.4"
PFADD visitors:2025-01-11 "ip:5.6.7.8" "ip:1.2.3.4"  # 중복 무시

# 개수 추정
PFCOUNT visitors:2025-01-11

# 병합
PFMERGE visitors:2025-01 visitors:2025-01-01 visitors:2025-01-02
```

### Spring에서 사용 - UV 카운팅

```java
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final StringRedisTemplate redisTemplate;

    public void recordVisit(String pageId, String visitorId) {
        String key = "uv:" + pageId + ":" + LocalDate.now();
        redisTemplate.opsForHyperLogLog().add(key, visitorId);
        redisTemplate.expire(key, Duration.ofDays(90));
    }

    public Long getUniqueVisitors(String pageId, LocalDate date) {
        String key = "uv:" + pageId + ":" + date;
        return redisTemplate.opsForHyperLogLog().size(key);
    }
}
```

### 실전 예시

**1. 페이지별 DAU/MAU 집계**

일별, 월별 고유 방문자 수를 메모리 효율적으로 집계합니다.

```java
@Service
@RequiredArgsConstructor
public class PageAnalyticsService {

    private final StringRedisTemplate redisTemplate;

    // 페이지 방문 기록
    public void recordPageView(String pageId, String visitorId) {
        String dailyKey = "pv:daily:" + pageId + ":" + LocalDate.now();
        String monthlyKey = "pv:monthly:" + pageId + ":" + YearMonth.now();

        // HyperLogLog에 방문자 추가
        redisTemplate.opsForHyperLogLog().add(dailyKey, visitorId);
        redisTemplate.opsForHyperLogLog().add(monthlyKey, visitorId);

        // 일별 키는 7일 후 만료
        redisTemplate.expire(dailyKey, Duration.ofDays(7));
        // 월별 키는 90일 후 만료
        redisTemplate.expire(monthlyKey, Duration.ofDays(90));
    }

    // 오늘 고유 방문자 수
    public Long getDailyUniqueVisitors(String pageId, LocalDate date) {
        String key = "pv:daily:" + pageId + ":" + date;
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    // 이번 달 고유 방문자 수
    public Long getMonthlyUniqueVisitors(String pageId, YearMonth month) {
        String key = "pv:monthly:" + pageId + ":" + month;
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    // 최근 7일 고유 방문자 수 (합산)
    public Long getWeeklyUniqueVisitors(String pageId) {
        List<String> keys = IntStream.range(0, 7)
            .mapToObj(i -> "pv:daily:" + pageId + ":" + LocalDate.now().minusDays(i))
            .toList();

        // 임시 키에 병합
        String tempKey = "pv:temp:" + UUID.randomUUID();
        redisTemplate.opsForHyperLogLog().union(tempKey, keys.toArray(new String[0]));

        Long count = redisTemplate.opsForHyperLogLog().size(tempKey);
        redisTemplate.delete(tempKey);

        return count;
    }
}
```

**2. 전체 서비스 DAU 대시보드**

서비스 전체의 일별 활성 사용자를 실시간으로 집계합니다.

```java
@Service
@RequiredArgsConstructor
public class DauDashboardService {

    private final StringRedisTemplate redisTemplate;

    // 사용자 활동 기록 (로그인, API 호출 등)
    public void recordUserActivity(Long userId) {
        String key = "dau:" + LocalDate.now();
        redisTemplate.opsForHyperLogLog().add(key, userId.toString());
        redisTemplate.expire(key, Duration.ofDays(90));
    }

    // 오늘 DAU
    public Long getTodayDAU() {
        String key = "dau:" + LocalDate.now();
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    // 최근 N일 DAU 추이
    public Map<LocalDate, Long> getDAUTrend(int days) {
        Map<LocalDate, Long> trend = new LinkedHashMap<>();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String key = "dau:" + date;
            Long count = redisTemplate.opsForHyperLogLog().size(key);
            trend.put(date, count);
        }

        return trend;
    }

    // MAU (최근 30일 합산)
    public Long getMAU() {
        List<String> keys = IntStream.range(0, 30)
            .mapToObj(i -> "dau:" + LocalDate.now().minusDays(i))
            .toList();

        String tempKey = "mau:temp:" + UUID.randomUUID();
        redisTemplate.opsForHyperLogLog().union(tempKey, keys.toArray(new String[0]));

        Long count = redisTemplate.opsForHyperLogLog().size(tempKey);
        redisTemplate.delete(tempKey);

        return count;
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `PFADD key v1 v2` | `opsForHyperLogLog().add(key, v1, v2)` | 값 추가 |
| `PFCOUNT key` | `opsForHyperLogLog().size(key)` | 추정 개수 |
| `PFCOUNT k1 k2` | `opsForHyperLogLog().size(k1, k2)` | 여러 키 합산 |
| `PFMERGE dest k1 k2` | `opsForHyperLogLog().union(dest, k1, k2)` | 병합 |

---

## Stream - 이벤트 로그와 메시지 브로커

Kafka와 유사한 로그형 자료구조입니다. 메시지 영속성, Consumer Group, 메시지 ACK를 지원합니다.

### 기본 명령어

```bash
# 메시지 추가
XADD orders * userId 1 productId 100 amount 2
# 결과: "1704931200000-0" (타임스탬프-시퀀스)

# 메시지 조회
XREAD COUNT 10 STREAMS orders 0           # 처음부터 10개
XREAD BLOCK 5000 STREAMS orders $         # 새 메시지 5초 대기

# Consumer Group 생성
XGROUP CREATE orders order-processors $ MKSTREAM

# Consumer Group으로 읽기
XREADGROUP GROUP order-processors consumer1 COUNT 1 STREAMS orders >

# 처리 완료 (ACK)
XACK orders order-processors 1704931200000-0
```

### Spring에서 사용

```java
// Producer
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final StringRedisTemplate redisTemplate;

    public String publish(OrderCreatedEvent event) {
        Map<String, String> message = Map.of(
            "eventType", "ORDER_CREATED",
            "orderId", event.getOrderId().toString(),
            "userId", event.getUserId().toString()
        );

        StringRecord record = StreamRecords.string(message)
            .withStreamKey("stream:orders");

        RecordId recordId = redisTemplate.opsForStream().add(record);
        return recordId.getValue();
    }
}

// Consumer
@Component
public class OrderEventConsumer
        implements StreamListener<String, MapRecord<String, String, String>> {

    @Override
    public void onMessage(MapRecord<String, String, String> message) {
        Map<String, String> body = message.getValue();
        // 이벤트 처리 로직
    }
}
```

### 실전 예시

**1. 주문 이벤트 처리 (이벤트 드리븐 아키텍처)**

주문 생성 시 이벤트를 발행하고, 여러 Consumer가 처리합니다.

```java
// 이벤트 발행 (Producer)
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String STREAM_KEY = "stream:orders";

    public String publishOrderCreated(Order order) {
        Map<String, String> fields = Map.of(
            "eventType", "ORDER_CREATED",
            "orderId", order.getId().toString(),
            "userId", order.getUserId().toString(),
            "totalAmount", order.getTotalAmount().toString(),
            "createdAt", Instant.now().toString()
        );

        StringRecord record = StreamRecords.string(fields)
            .withStreamKey(STREAM_KEY);

        RecordId recordId = redisTemplate.opsForStream().add(record);
        return recordId.getValue();
    }

    public String publishOrderPaid(Long orderId, String paymentId) {
        Map<String, String> fields = Map.of(
            "eventType", "ORDER_PAID",
            "orderId", orderId.toString(),
            "paymentId", paymentId,
            "paidAt", Instant.now().toString()
        );

        StringRecord record = StreamRecords.string(fields)
            .withStreamKey(STREAM_KEY);

        return redisTemplate.opsForStream().add(record).getValue();
    }
}

// 이벤트 소비 (Consumer)
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer implements StreamListener<String, MapRecord<String, String, String>> {

    private final StringRedisTemplate redisTemplate;
    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    private static final String STREAM_KEY = "stream:orders";
    private static final String GROUP_NAME = "order-processors";

    @Override
    public void onMessage(MapRecord<String, String, String> message) {
        Map<String, String> body = message.getValue();
        String eventType = body.get("eventType");

        try {
            switch (eventType) {
                case "ORDER_CREATED" -> handleOrderCreated(body);
                case "ORDER_PAID" -> handleOrderPaid(body);
                default -> log.warn("Unknown event type: {}", eventType);
            }

            // 처리 완료 ACK
            redisTemplate.opsForStream()
                .acknowledge(STREAM_KEY, GROUP_NAME, message.getId());

        } catch (Exception e) {
            log.error("Failed to process event: {}", message.getId(), e);
            // ACK하지 않으면 Pending 상태로 남아 재처리 대상
        }
    }

    private void handleOrderCreated(Map<String, String> body) {
        Long orderId = Long.parseLong(body.get("orderId"));
        Long userId = Long.parseLong(body.get("userId"));

        // 재고 차감
        inventoryService.decreaseStock(orderId);

        // 알림 발송
        notificationService.sendOrderConfirmation(userId, orderId);
    }

    private void handleOrderPaid(Map<String, String> body) {
        Long orderId = Long.parseLong(body.get("orderId"));
        // 배송 준비 시작
    }
}

// Consumer 설정
@Configuration
@RequiredArgsConstructor
public class RedisStreamConfig {

    private final RedisConnectionFactory connectionFactory;

    @Bean
    public StreamMessageListenerContainer<String, MapRecord<String, String, String>>
            orderStreamContainer(OrderEventConsumer consumer) {

        var options = StreamMessageListenerContainer.StreamMessageListenerContainerOptions
            .builder()
            .pollTimeout(Duration.ofSeconds(1))
            .build();

        var container = StreamMessageListenerContainer.create(connectionFactory, options);

        // Consumer Group 생성 (없으면)
        try {
            connectionFactory.getConnection().xGroupCreate(
                "stream:orders".getBytes(),
                "order-processors",
                ReadOffset.latest(),
                true  // MKSTREAM
            );
        } catch (Exception e) {
            // 이미 존재하면 무시
        }

        container.receive(
            Consumer.from("order-processors", "consumer-1"),
            StreamOffset.create("stream:orders", ReadOffset.lastConsumed()),
            consumer
        );

        container.start();
        return container;
    }
}
```

**2. 실시간 활동 로그**

사용자 활동을 Stream에 기록하고, 실시간으로 조회합니다.

```java
@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final StringRedisTemplate redisTemplate;

    private static final String STREAM_KEY = "stream:activity";
    private static final long MAX_STREAM_LENGTH = 10000;  // 최대 1만개 유지

    public void logActivity(Long userId, String action, Map<String, String> metadata) {
        Map<String, String> fields = new HashMap<>(metadata);
        fields.put("userId", userId.toString());
        fields.put("action", action);
        fields.put("timestamp", Instant.now().toString());

        StringRecord record = StreamRecords.string(fields)
            .withStreamKey(STREAM_KEY);

        // MAXLEN으로 스트림 크기 제한
        redisTemplate.opsForStream().add(record, RedisStreamCommands.XAddOptions.maxlen(MAX_STREAM_LENGTH));
    }

    // 최근 활동 조회
    public List<ActivityLog> getRecentActivities(int count) {
        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream()
            .reverseRange(STREAM_KEY, Range.unbounded(), Limit.limit().count(count));

        return records.stream()
            .map(r -> ActivityLog.from(r.getId().getValue(), r.getValue()))
            .toList();
    }

    // 특정 사용자의 활동 조회 (Stream에서 필터링은 비효율적, 별도 키 권장)
    public List<ActivityLog> getUserActivities(Long userId, int count) {
        String userStreamKey = STREAM_KEY + ":user:" + userId;
        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream()
            .reverseRange(userStreamKey, Range.unbounded(), Limit.limit().count(count));

        return records.stream()
            .map(r -> ActivityLog.from(r.getId().getValue(), r.getValue()))
            .toList();
    }
}
```

### 명령어 - Spring 매핑

| Redis 명령어 | Spring 메서드 | 설명 |
|-------------|--------------|------|
| `XADD key * field value` | `opsForStream().add(record)` | 메시지 추가 |
| `XREAD COUNT 10 STREAMS key 0` | `opsForStream().read(StreamReadOptions, StreamOffset)` | 메시지 조회 |
| `XRANGE key - +` | `opsForStream().range(key, Range.unbounded())` | 범위 조회 |
| `XLEN key` | `opsForStream().size(key)` | 메시지 수 |
| `XGROUP CREATE` | `opsForStream().createGroup(key, group)` | Consumer Group 생성 |
| `XREADGROUP GROUP` | `opsForStream().read(Consumer, StreamReadOptions, StreamOffset)` | 그룹으로 읽기 |
| `XACK key group id` | `opsForStream().acknowledge(key, group, id)` | 메시지 확인 |
| `XPENDING key group` | `opsForStream().pending(key, group)` | 미처리 메시지 |
| `XDEL key id` | `opsForStream().delete(key, id)` | 메시지 삭제 |

---

## 자료구조 선택 가이드

| 요구사항 | 자료구조 | 이유 |
|---------|---------|------|
| 단순 캐시, 세션 | String | 가장 단순, TTL 지원 |
| 객체의 일부 필드만 수정 | Hash | 필드 단위 접근 |
| 최근 N개 유지 | List + LTRIM | 순서 유지, 크기 제한 |
| 중복 제거, 멤버십 확인 | Set | O(1) 멤버십 체크 |
| 랭킹, 정렬 필요 | Sorted Set | 점수 기반 자동 정렬 |
| 불리언 대량 저장 | Bitmap | 메모리 효율 최고 |
| 대략적인 고유 카운트 | HyperLogLog | 고정 12KB |
| 이벤트 로그, 메시지 큐 | Stream | 영속성, Consumer Group |

### 메모리 효율성 비교

```
100만 개의 사용자 ID 저장:

String (JSON Array): ~15MB
Set: ~40MB
Bitmap (userId를 비트 위치로): ~125KB

→ 상황에 맞는 자료구조 선택이 메모리 비용을 결정
```

---

## 정리

- **String**: 기본 캐시, 카운터, 분산 락
- **Hash**: 객체 저장, 필드별 조회/수정
- **List**: 순서 있는 데이터, 간단한 큐
- **Set**: 중복 제거, 집합 연산
- **Sorted Set**: 랭킹, 실시간 정렬
- **Bitmap**: 대량 불리언 플래그
- **HyperLogLog**: 대략적 고유값 카운트
- **Stream**: 이벤트 로그, 메시지 브로커

Redis는 "만능 캐시"가 아닙니다. 각 자료구조의 특성을 이해하고 상황에 맞게 선택해야 성능과 메모리 효율을 모두 잡을 수 있습니다.
