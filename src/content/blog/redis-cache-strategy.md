---
title: 'Redis 캐시 전략 - 읽기와 쓰기의 균형을 찾아서'
description: 'Cache-Aside, Write-Through, Write-Behind 패턴과 캐시 무효화 전략을 정리했습니다'
pubDate: 'Jan 12 2025'
tags: ['Redis', 'Database', 'Architecture']
series: 'redis-in-practice'
seriesOrder: 2
---

캐시를 도입하면 성능은 좋아지지만, 새로운 문제가 생깁니다. DB와 캐시의 데이터가 다르면 어떻게 할까요? 캐시가 만료되는 순간 수천 개의 요청이 DB로 몰리면요?

캐시는 단순히 "자주 쓰는 데이터를 메모리에 저장"하는 것이 아닙니다. 읽기와 쓰기의 특성, 데이터 일관성 요구사항, 장애 상황까지 고려한 전략이 필요합니다.

## 캐시가 필요한 이유

### DB 직접 조회의 한계

```
┌─────────────────────────────────────────────────────────┐
│                    DB 직접 조회                          │
│                                                          │
│   Client ──→ Application ──→ Database                   │
│              (10ms)          (50~200ms)                  │
│                                                          │
│   문제:                                                  │
│   - 동일 데이터 반복 조회 시 매번 DB 접근                │
│   - DB 부하 증가 → 응답 시간 저하                        │
│   - DB가 병목 지점이 됨                                  │
└─────────────────────────────────────────────────────────┘
```

### 캐시 도입 후

```
┌─────────────────────────────────────────────────────────┐
│                    캐시 적용                             │
│                                                          │
│   Client ──→ Application ──→ Redis ──→ Database         │
│              (10ms)          (1ms)     (50ms, 미스 시)   │
│                                                          │
│   효과:                                                  │
│   - 캐시 히트 시 1ms 이내 응답                           │
│   - DB 부하 80~90% 감소 (히트율에 따라)                  │
│   - 수평 확장 용이                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 캐시 전략 개요

| 전략 | 읽기 | 쓰기 | 특징 |
|------|------|------|------|
| **Cache-Aside** | 앱이 캐시 확인 → 미스 시 DB | 앱이 DB 쓰기 → 캐시 무효화 | 가장 일반적 |
| **Read-Through** | 캐시가 DB 조회 대행 | - | 캐시 라이브러리가 처리 |
| **Write-Through** | - | 캐시와 DB 동시 쓰기 | 강한 일관성 |
| **Write-Behind** | - | 캐시에만 쓰기 → 비동기 DB 반영 | 쓰기 성능 최적화 |

---

## Cache-Aside (Lazy Loading)

가장 널리 사용되는 패턴입니다. 애플리케이션이 캐시와 DB를 직접 관리합니다.

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│                  Cache-Aside 읽기                        │
│                                                          │
│   1. 캐시 조회                                           │
│      App ──→ Redis                                       │
│              ↓                                           │
│      Hit? ──→ Yes ──→ 반환                               │
│              ↓                                           │
│              No (Miss)                                   │
│              ↓                                           │
│   2. DB 조회                                             │
│      App ──→ Database                                    │
│              ↓                                           │
│   3. 캐시 저장                                           │
│      App ──→ Redis (TTL 설정)                            │
│              ↓                                           │
│   4. 반환                                                │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│                  Cache-Aside 쓰기                        │
│                                                          │
│   1. DB 업데이트                                         │
│      App ──→ Database                                    │
│              ↓                                           │
│   2. 캐시 삭제 (무효화)                                  │
│      App ──→ Redis (DELETE)                              │
│                                                          │
│   ⚠️ 캐시 업데이트가 아닌 삭제를 권장                    │
└─────────────────────────────────────────────────────────┘
```

### Spring 구현

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final Duration CACHE_TTL = Duration.ofHours(1);

    // 읽기: 캐시 확인 → 미스 시 DB 조회 → 캐시 저장
    public Product getProduct(Long productId) {
        String cacheKey = "product:" + productId;

        // 1. 캐시 조회
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserialize(cached, Product.class);
        }

        // 2. DB 조회
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        // 3. 캐시 저장
        redisTemplate.opsForValue().set(
            cacheKey,
            serialize(product),
            CACHE_TTL
        );

        return product;
    }

    // 쓰기: DB 업데이트 → 캐시 삭제
    @Transactional
    public Product updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        product.update(request);
        productRepository.save(product);

        // 캐시 무효화 (업데이트가 아닌 삭제)
        String cacheKey = "product:" + productId;
        redisTemplate.delete(cacheKey);

        return product;
    }

    private String serialize(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Serialization failed", e);
        }
    }

    private <T> T deserialize(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Deserialization failed", e);
        }
    }
}
```

### Spring Cache 어노테이션 활용

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Cacheable(value = "products", key = "#productId")
    public Product getProduct(Long productId) {
        return productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    @CacheEvict(value = "products", key = "#productId")
    @Transactional
    public Product updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        product.update(request);
        return productRepository.save(product);
    }

    @CacheEvict(value = "products", key = "#productId")
    @Transactional
    public void deleteProduct(Long productId) {
        productRepository.deleteById(productId);
    }

    // 여러 캐시 무효화
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#productId"),
        @CacheEvict(value = "productList", allEntries = true)
    })
    @Transactional
    public Product updateProductWithListInvalidation(Long productId, ProductUpdateRequest request) {
        // ...
    }
}
```

### 장단점

| 장점 | 단점 |
|------|------|
| 구현이 단순함 | 첫 요청은 항상 느림 (Cold Start) |
| 캐시 장애 시에도 DB로 서비스 가능 | 캐시와 DB 간 일시적 불일치 가능 |
| 실제로 사용되는 데이터만 캐싱 | 캐시 미스 시 DB 부하 집중 가능 |

---

## Read-Through

캐시 라이브러리가 DB 조회를 대행합니다. 애플리케이션은 캐시만 바라봅니다.

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│                    Read-Through                          │
│                                                          │
│   App ──→ Cache Library ──→ (미스 시) Database           │
│                    │                                     │
│                    └──→ 자동으로 캐시 저장               │
│                                                          │
│   특징:                                                  │
│   - 앱은 캐시만 호출                                     │
│   - 캐시 라이브러리가 DB 조회 로직 포함                  │
│   - Cache-Aside보다 코드가 단순                          │
└─────────────────────────────────────────────────────────┘
```

### 구현 예시

```java
// CacheLoader를 통한 Read-Through 구현
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory,
                                     ProductRepository productRepository) {
        // Caffeine + Redis 조합으로 Read-Through 구현
        return new RedisCacheManager(
            RedisCacheWriter.nonLockingRedisCacheWriter(connectionFactory),
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
        );
    }
}

// 서비스 계층은 단순해짐
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Cacheable(value = "products", key = "#productId")
    public Product getProduct(Long productId) {
        // 캐시 미스 시에만 실행됨
        return productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
    }
}
```

### Cache-Aside vs Read-Through

| 구분 | Cache-Aside | Read-Through |
|------|------------|--------------|
| DB 조회 주체 | 애플리케이션 | 캐시 라이브러리 |
| 코드 복잡도 | 높음 | 낮음 |
| 유연성 | 높음 | 낮음 (라이브러리 의존) |
| 제어권 | 애플리케이션 | 캐시 라이브러리 |

---

## Write-Through

쓰기 시 캐시와 DB에 동시에 저장합니다. 항상 캐시에 최신 데이터가 있습니다.

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│                    Write-Through                         │
│                                                          │
│   App ──→ Cache ──→ Database                             │
│           (동기)    (동기)                               │
│                                                          │
│   순서:                                                  │
│   1. 캐시에 저장                                         │
│   2. DB에 저장 (동기)                                    │
│   3. 둘 다 성공 시 응답                                  │
│                                                          │
│   특징:                                                  │
│   - 강한 일관성 보장                                     │
│   - 쓰기 지연 시간 증가 (캐시 + DB)                      │
└─────────────────────────────────────────────────────────┘
```

### 구현 예시

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public Product createProduct(ProductCreateRequest request) {
        // 1. DB 저장
        Product product = productRepository.save(request.toEntity());

        // 2. 캐시 저장 (동기)
        String cacheKey = "product:" + product.getId();
        redisTemplate.opsForValue().set(
            cacheKey,
            serialize(product),
            Duration.ofHours(1)
        );

        return product;
    }

    @Transactional
    public Product updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        product.update(request);

        // 1. DB 저장
        Product saved = productRepository.save(product);

        // 2. 캐시 업데이트 (동기)
        String cacheKey = "product:" + productId;
        redisTemplate.opsForValue().set(
            cacheKey,
            serialize(saved),
            Duration.ofHours(1)
        );

        return saved;
    }
}
```

### Write-Through + Read-Through 조합

```java
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    // Read-Through: 캐시 → (미스 시) DB
    @Cacheable(value = "users", key = "#userId")
    public User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }

    // Write-Through: 캐시 + DB 동시 쓰기
    @CachePut(value = "users", key = "#result.id")
    @Transactional
    public User updateUser(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        user.update(request);
        return userRepository.save(user);
    }
}
```

### 장단점

| 장점 | 단점 |
|------|------|
| 캐시와 DB 항상 일치 | 쓰기 지연 시간 증가 |
| 캐시 미스 감소 | 사용하지 않는 데이터도 캐싱 |
| 읽기 성능 최적화 | 캐시 장애 시 쓰기도 실패 |

---

## Write-Behind (Write-Back)

캐시에만 먼저 쓰고, DB는 비동기로 나중에 반영합니다.

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│                    Write-Behind                          │
│                                                          │
│   App ──→ Cache ──→ (비동기) Database                    │
│           (즉시)    (나중에 배치)                        │
│                                                          │
│   순서:                                                  │
│   1. 캐시에 저장 → 즉시 응답                             │
│   2. 변경 내역을 큐에 저장                               │
│   3. 백그라운드에서 DB에 배치 반영                       │
│                                                          │
│   특징:                                                  │
│   - 쓰기 성능 최적화                                     │
│   - DB 부하 분산                                         │
│   - 데이터 유실 위험                                     │
└─────────────────────────────────────────────────────────┘
```

### 구현 예시

```java
@Service
@RequiredArgsConstructor
public class ViewCountService {

    private final StringRedisTemplate redisTemplate;
    private final ViewCountRepository viewCountRepository;

    // 조회수 증가: 캐시에만 반영 (즉시)
    public Long incrementViewCount(Long postId) {
        String cacheKey = "viewcount:" + postId;
        Long newCount = redisTemplate.opsForValue().increment(cacheKey);

        // 변경된 키를 별도 Set에 기록 (나중에 DB 반영용)
        redisTemplate.opsForSet().add("viewcount:dirty", postId.toString());

        return newCount;
    }

    // 조회수 조회: 캐시에서
    public Long getViewCount(Long postId) {
        String cacheKey = "viewcount:" + postId;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            return Long.parseLong(cached);
        }

        // 캐시 미스: DB에서 조회 후 캐시
        Long count = viewCountRepository.findByPostId(postId)
            .map(ViewCount::getCount)
            .orElse(0L);

        redisTemplate.opsForValue().set(cacheKey, count.toString());
        return count;
    }
}

// 백그라운드에서 DB 동기화
@Component
@RequiredArgsConstructor
@Slf4j
public class ViewCountSyncJob {

    private final StringRedisTemplate redisTemplate;
    private final ViewCountRepository viewCountRepository;

    @Scheduled(fixedDelay = 60000)  // 1분마다
    public void syncToDatabase() {
        Set<String> dirtyKeys = redisTemplate.opsForSet().members("viewcount:dirty");

        if (dirtyKeys == null || dirtyKeys.isEmpty()) {
            return;
        }

        for (String postIdStr : dirtyKeys) {
            try {
                Long postId = Long.parseLong(postIdStr);
                String cacheKey = "viewcount:" + postId;
                String countStr = redisTemplate.opsForValue().get(cacheKey);

                if (countStr != null) {
                    Long count = Long.parseLong(countStr);
                    viewCountRepository.upsert(postId, count);
                }

                // 동기화 완료된 키 제거
                redisTemplate.opsForSet().remove("viewcount:dirty", postIdStr);

            } catch (Exception e) {
                log.error("Failed to sync view count for post: {}", postIdStr, e);
            }
        }
    }
}
```

### 장단점

| 장점 | 단점 |
|------|------|
| 쓰기 성능 최고 | 데이터 유실 위험 (캐시 장애 시) |
| DB 부하 분산 (배치 처리) | 구현 복잡도 높음 |
| 쓰기 스파이크 흡수 | 일시적 불일치 발생 |

### 사용 적합 케이스

```
✅ Write-Behind가 적합한 경우:
- 조회수, 좋아요 수 (정확도보다 성능 중요)
- 로그, 통계 데이터
- 일시적 불일치 허용 가능한 경우

❌ Write-Behind가 부적합한 경우:
- 결제, 재고 (데이터 정확성 필수)
- 트랜잭션이 중요한 경우
- 데이터 유실이 치명적인 경우
```

---

## 캐시 무효화 전략

캐시의 가장 어려운 문제는 "언제, 어떻게 무효화할 것인가"입니다.

### 1. TTL (Time To Live)

가장 단순한 방법. 일정 시간 후 자동 만료.

```java
@Service
public class ProductService {

    // TTL 기반 캐시 (1시간 후 자동 만료)
    @Cacheable(value = "products", key = "#productId")
    public Product getProduct(Long productId) {
        return productRepository.findById(productId).orElseThrow();
    }
}

// Redis 설정에서 TTL 지정
@Configuration
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1))  // 기본 TTL 1시간
            .disableCachingNullValues();

        // 캐시별 TTL 다르게 설정
        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
            "products", config.entryTtl(Duration.ofHours(1)),
            "categories", config.entryTtl(Duration.ofDays(1)),
            "users", config.entryTtl(Duration.ofMinutes(30))
        );

        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

### 2. 명시적 삭제 (Cache Eviction)

데이터 변경 시 즉시 캐시 삭제.

```java
@Service
public class ProductService {

    @CacheEvict(value = "products", key = "#productId")
    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId).orElseThrow();
        product.update(request);
        productRepository.save(product);
    }

    // 관련 캐시 모두 삭제
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#productId"),
        @CacheEvict(value = "productsByCategory", key = "#product.categoryId"),
        @CacheEvict(value = "productList", allEntries = true)
    })
    @Transactional
    public void updateProductWithRelated(Long productId, ProductUpdateRequest request) {
        // ...
    }
}
```

### 3. 이벤트 기반 무효화

도메인 이벤트를 발행하여 관련 캐시를 무효화합니다.

```java
// 이벤트 정의
public record ProductUpdatedEvent(Long productId, Long categoryId) {}

// 이벤트 발행
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId).orElseThrow();
        Long oldCategoryId = product.getCategoryId();

        product.update(request);
        productRepository.save(product);

        // 이벤트 발행
        eventPublisher.publishEvent(new ProductUpdatedEvent(productId, oldCategoryId));

        if (!oldCategoryId.equals(product.getCategoryId())) {
            eventPublisher.publishEvent(new ProductUpdatedEvent(productId, product.getCategoryId()));
        }
    }
}

// 이벤트 리스너에서 캐시 무효화
@Component
@RequiredArgsConstructor
public class ProductCacheInvalidator {

    private final StringRedisTemplate redisTemplate;

    @EventListener
    public void handleProductUpdated(ProductUpdatedEvent event) {
        // 관련 캐시 모두 삭제
        redisTemplate.delete("product:" + event.productId());
        redisTemplate.delete("productsByCategory:" + event.categoryId());

        // 패턴으로 삭제 (주의: 성능 이슈 가능)
        Set<String> keys = redisTemplate.keys("productList:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
```

### 4. 버전 기반 무효화

캐시 키에 버전을 포함시켜 데이터 변경 시 버전을 올립니다.

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final StringRedisTemplate redisTemplate;
    private final ProductRepository productRepository;

    private static final String VERSION_KEY = "product:version:";

    public Product getProduct(Long productId) {
        // 현재 버전 조회
        String version = redisTemplate.opsForValue().get(VERSION_KEY + productId);
        if (version == null) {
            version = "1";
            redisTemplate.opsForValue().set(VERSION_KEY + productId, version);
        }

        // 버전이 포함된 캐시 키
        String cacheKey = "product:" + productId + ":v" + version;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            return deserialize(cached);
        }

        Product product = productRepository.findById(productId).orElseThrow();
        redisTemplate.opsForValue().set(cacheKey, serialize(product), Duration.ofHours(1));

        return product;
    }

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId).orElseThrow();
        product.update(request);
        productRepository.save(product);

        // 버전 증가 (기존 캐시는 자연스럽게 무효화)
        redisTemplate.opsForValue().increment(VERSION_KEY + productId);
    }
}
```

### 무효화 전략 비교

| 전략 | 일관성 | 구현 복잡도 | 적합한 경우 |
|------|--------|------------|------------|
| TTL | 약함 | 낮음 | 일시적 불일치 허용 가능 |
| 명시적 삭제 | 강함 | 중간 | 변경 지점이 명확할 때 |
| 이벤트 기반 | 강함 | 높음 | 복잡한 의존 관계 |
| 버전 기반 | 강함 | 중간 | 동시성 이슈 방지 |

---

## 캐시 문제와 해결책

### 1. Cache Stampede (Thundering Herd)

캐시 만료 시 수많은 요청이 동시에 DB로 몰리는 현상.

```
┌─────────────────────────────────────────────────────────┐
│                  Cache Stampede                          │
│                                                          │
│   TTL 만료!                                              │
│       │                                                  │
│   Request 1 ──→ Cache Miss ──→ DB Query                  │
│   Request 2 ──→ Cache Miss ──→ DB Query                  │
│   Request 3 ──→ Cache Miss ──→ DB Query                  │
│   ...                                                    │
│   Request N ──→ Cache Miss ──→ DB Query                  │
│                                                          │
│   → DB 과부하, 응답 지연, 장애 가능                      │
└─────────────────────────────────────────────────────────┘
```

**해결책 1: 락을 이용한 단일 로딩**

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final StringRedisTemplate redisTemplate;
    private final ProductRepository productRepository;

    public Product getProductWithLock(Long productId) {
        String cacheKey = "product:" + productId;
        String lockKey = "lock:product:" + productId;

        // 1. 캐시 확인
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserialize(cached);
        }

        // 2. 락 획득 시도
        boolean lockAcquired = Boolean.TRUE.equals(
            redisTemplate.opsForValue().setIfAbsent(lockKey, "1", Duration.ofSeconds(10))
        );

        if (lockAcquired) {
            try {
                // 락 획득 성공: DB 조회 후 캐시 저장
                Product product = productRepository.findById(productId).orElseThrow();
                redisTemplate.opsForValue().set(cacheKey, serialize(product), Duration.ofHours(1));
                return product;
            } finally {
                redisTemplate.delete(lockKey);
            }
        } else {
            // 락 획득 실패: 잠시 대기 후 캐시 재확인
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return getProductWithLock(productId);  // 재귀 호출
        }
    }
}
```

**해결책 2: 확률적 조기 재계산 (Probabilistic Early Recomputation)**

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final StringRedisTemplate redisTemplate;
    private final ProductRepository productRepository;

    public Product getProductWithEarlyRecomputation(Long productId) {
        String cacheKey = "product:" + productId;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            CachedProduct cachedProduct = deserialize(cached, CachedProduct.class);
            long ttl = redisTemplate.getExpire(cacheKey, TimeUnit.SECONDS);

            // TTL이 일정 비율 이하로 남으면 확률적으로 재계산
            if (shouldRecompute(ttl, cachedProduct.getOriginalTtl())) {
                // 비동기로 캐시 갱신
                CompletableFuture.runAsync(() -> refreshCache(productId));
            }

            return cachedProduct.getProduct();
        }

        return loadAndCache(productId);
    }

    private boolean shouldRecompute(long remainingTtl, long originalTtl) {
        double ratio = (double) remainingTtl / originalTtl;
        // 남은 TTL이 10% 이하면 높은 확률로 재계산
        return ratio < 0.1 && Math.random() < (1 - ratio);
    }
}
```

### 2. Cache Penetration

존재하지 않는 데이터를 반복 요청하여 매번 DB를 조회하는 공격.

```
┌─────────────────────────────────────────────────────────┐
│                  Cache Penetration                       │
│                                                          │
│   공격자: id=-1 요청 (존재하지 않는 데이터)              │
│                                                          │
│   Request ──→ Cache Miss ──→ DB (없음) ──→ 캐시 안 함    │
│   Request ──→ Cache Miss ──→ DB (없음) ──→ 캐시 안 함    │
│   ...                                                    │
│                                                          │
│   → 매번 DB 조회, 캐시 효과 없음                         │
└─────────────────────────────────────────────────────────┘
```

**해결책 1: Null 캐싱**

```java
@Service
public class ProductService {

    private static final String NULL_VALUE = "NULL";

    public Product getProduct(Long productId) {
        String cacheKey = "product:" + productId;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        // Null 캐시 확인
        if (NULL_VALUE.equals(cached)) {
            return null;  // 또는 예외 발생
        }

        if (cached != null) {
            return deserialize(cached);
        }

        Product product = productRepository.findById(productId).orElse(null);

        if (product != null) {
            redisTemplate.opsForValue().set(cacheKey, serialize(product), Duration.ofHours(1));
        } else {
            // 존재하지 않는 데이터도 캐싱 (짧은 TTL)
            redisTemplate.opsForValue().set(cacheKey, NULL_VALUE, Duration.ofMinutes(5));
        }

        return product;
    }
}
```

**해결책 2: Bloom Filter**

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final StringRedisTemplate redisTemplate;
    private final ProductRepository productRepository;

    private static final String BLOOM_FILTER_KEY = "bf:products";

    // 상품 생성 시 Bloom Filter에 추가
    @Transactional
    public Product createProduct(ProductCreateRequest request) {
        Product product = productRepository.save(request.toEntity());

        // Bloom Filter에 ID 추가 (Redis Bloom Filter 모듈 필요)
        redisTemplate.execute((RedisCallback<Boolean>) conn ->
            conn.execute("BF.ADD", BLOOM_FILTER_KEY.getBytes(),
                product.getId().toString().getBytes())
        );

        return product;
    }

    // 조회 시 Bloom Filter 먼저 확인
    public Product getProduct(Long productId) {
        // Bloom Filter 확인 (없으면 확실히 없음)
        Boolean mayExist = redisTemplate.execute((RedisCallback<Boolean>) conn ->
            conn.execute("BF.EXISTS", BLOOM_FILTER_KEY.getBytes(),
                productId.toString().getBytes())
        );

        if (Boolean.FALSE.equals(mayExist)) {
            return null;  // 확실히 없음
        }

        // 있을 수도 있음 → 캐시/DB 조회
        return getProductFromCacheOrDb(productId);
    }
}
```

### 3. Cache Avalanche

많은 캐시가 동시에 만료되어 DB에 부하가 집중되는 현상.

```
┌─────────────────────────────────────────────────────────┐
│                  Cache Avalanche                         │
│                                                          │
│   모든 캐시 TTL = 1시간                                  │
│   서버 시작 시 모든 캐시 생성                            │
│       ↓                                                  │
│   1시간 후 모든 캐시 동시 만료                           │
│       ↓                                                  │
│   모든 요청이 DB로 → DB 과부하                           │
└─────────────────────────────────────────────────────────┘
```

**해결책: TTL 랜덤화**

```java
@Service
public class ProductService {

    private static final long BASE_TTL_SECONDS = 3600;  // 1시간
    private static final long JITTER_SECONDS = 600;     // ±10분

    public Product getProduct(Long productId) {
        String cacheKey = "product:" + productId;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            return deserialize(cached);
        }

        Product product = productRepository.findById(productId).orElseThrow();

        // TTL에 랜덤 지터 추가
        long ttl = BASE_TTL_SECONDS + ThreadLocalRandom.current()
            .nextLong(-JITTER_SECONDS, JITTER_SECONDS);

        redisTemplate.opsForValue().set(cacheKey, serialize(product), Duration.ofSeconds(ttl));

        return product;
    }
}
```

---

## 캐시 워밍업 (Cache Warming)

서비스 시작 시 주요 데이터를 미리 캐시에 로드합니다.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class CacheWarmer {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCache() {
        log.info("Starting cache warm-up...");

        // 인기 상품 Top 100 미리 캐싱
        List<Product> popularProducts = productRepository.findTop100ByOrderByViewCountDesc();

        for (Product product : popularProducts) {
            String cacheKey = "product:" + product.getId();
            redisTemplate.opsForValue().set(
                cacheKey,
                serialize(product),
                Duration.ofHours(1)
            );
        }

        log.info("Cache warm-up completed. {} products cached.", popularProducts.size());
    }
}
```

---

## 다중 레벨 캐시 (Multi-Level Cache)

로컬 캐시 + Redis를 조합하여 더 빠른 응답을 제공합니다.

```
┌─────────────────────────────────────────────────────────┐
│                  Multi-Level Cache                       │
│                                                          │
│   L1: Local Cache (Caffeine)                             │
│       - 메모리 내 저장                                   │
│       - 1ms 이내 응답                                    │
│       - 용량 제한, 서버별 상이                           │
│              ↓ Miss                                      │
│   L2: Distributed Cache (Redis)                          │
│       - 네트워크 통신                                    │
│       - 1~5ms 응답                                       │
│       - 서버 간 공유                                     │
│              ↓ Miss                                      │
│   L3: Database                                           │
│       - 10~100ms 응답                                    │
└─────────────────────────────────────────────────────────┘
```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;

    // L1: Caffeine 로컬 캐시
    private final Cache<Long, Product> localCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(Duration.ofMinutes(5))
        .build();

    public Product getProduct(Long productId) {
        // L1: 로컬 캐시 확인
        Product localCached = localCache.getIfPresent(productId);
        if (localCached != null) {
            return localCached;
        }

        // L2: Redis 캐시 확인
        String cacheKey = "product:" + productId;
        String redisCached = redisTemplate.opsForValue().get(cacheKey);
        if (redisCached != null) {
            Product product = deserialize(redisCached);
            localCache.put(productId, product);  // L1에도 저장
            return product;
        }

        // L3: DB 조회
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        // L1, L2 모두 저장
        localCache.put(productId, product);
        redisTemplate.opsForValue().set(cacheKey, serialize(product), Duration.ofHours(1));

        return product;
    }

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId).orElseThrow();
        product.update(request);
        productRepository.save(product);

        // L1, L2 모두 무효화
        localCache.invalidate(productId);
        redisTemplate.delete("product:" + productId);
    }
}
```

---

## 정리

### 캐시 전략 선택 가이드

| 상황 | 권장 전략 |
|------|----------|
| 읽기 위주, 단순한 구조 | Cache-Aside |
| 항상 최신 데이터 필요 | Write-Through |
| 쓰기 성능 중요, 일관성 덜 중요 | Write-Behind |
| 빈번한 읽기 + 가끔 쓰기 | Cache-Aside + TTL |

### 캐시 무효화 선택 가이드

| 상황 | 권장 전략 |
|------|----------|
| 단순한 구조, 일시적 불일치 허용 | TTL |
| 변경 지점이 명확 | 명시적 삭제 (@CacheEvict) |
| 복잡한 의존 관계 | 이벤트 기반 |
| 동시성 이슈 방지 필요 | 버전 기반 |

### 핵심 원칙

- **캐시는 DB의 부담을 덜어주는 도구**이지, DB를 대체하지 않습니다
- **일관성 vs 성능**은 트레이드오프. 비즈니스 요구사항에 맞게 선택합니다
- **캐시 장애에 대비**하여 항상 DB 폴백을 고려합니다
- **TTL은 필수**. 무한 캐시는 메모리 문제와 일관성 문제를 유발합니다
- **캐시 히트율 모니터링**. 히트율이 낮으면 캐시의 의미가 없습니다
