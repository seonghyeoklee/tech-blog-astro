---
title: 'GC 동작 원리 - Mark and Sweep에서 G1GC까지'
description: 'Garbage Collection이 어떻게 동작하는지, 실무에서 어떻게 튜닝하는지 정리했습니다'
pubDate: 'Dec 16 2024'
tags: ['Java', 'CS']
series: 'java-fundamentals'
seriesOrder: 2
quiz:
  - question: "GC가 객체의 생존 여부를 판단하는 기준은?"
    options:
      - "객체의 생성 시간"
      - "객체의 크기"
      - "루트에서 도달 가능한지 여부"
      - "객체의 참조 횟수"
    correctAnswer: 2
    explanation: "GC는 GC Root(스택, 메서드 영역 등)에서 시작하여 참조 체인을 따라가며 도달 가능한 객체를 찾습니다. 도달할 수 없는 객체는 더 이상 사용되지 않는 것으로 판단하여 제거합니다."
  - question: "Minor GC가 발생하는 영역은?"
    options:
      - "Old Generation"
      - "Young Generation"
      - "Metaspace"
      - "전체 Heap"
    correctAnswer: 1
    explanation: "Minor GC는 Young Generation(Eden, Survivor 영역)에서 발생합니다. 대부분의 객체는 금방 사라지기 때문에 Minor GC는 빠르고 자주 발생합니다."
  - question: "다음 중 Stop-the-World 시간이 가장 짧은 GC는?"
    options:
      - "Serial GC"
      - "Parallel GC"
      - "G1 GC"
      - "ZGC"
    correctAnswer: 3
    explanation: "ZGC는 초저지연을 목표로 설계되었으며, 대부분의 GC 작업을 애플리케이션과 동시에 수행하여 Stop-the-World 시간을 10ms 미만으로 유지합니다."
  - question: "객체가 Young Generation에서 Old Generation으로 이동하는 것을 무엇이라 하는가?"
    options:
      - "Migration"
      - "Promotion"
      - "Allocation"
      - "Compaction"
    correctAnswer: 1
    explanation: "Young Generation에서 여러 번의 Minor GC에서 살아남은 객체는 Old Generation으로 승격(Promotion)됩니다. 이를 통해 오래 사용되는 객체와 금방 사라지는 객체를 분리합니다."
  - question: "Java 11 이상에서 기본 GC는?"
    options:
      - "Serial GC"
      - "Parallel GC"
      - "G1 GC"
      - "ZGC"
    correctAnswer: 2
    explanation: "Java 9부터 G1 GC(Garbage First Garbage Collector)가 기본 GC로 설정되었습니다. G1 GC는 큰 힙 메모리에서 예측 가능한 일시 정지 시간을 제공합니다."
---

JVM 메모리 구조 글에서 GC를 간단히 소개했습니다. 이번에는 GC가 실제로 어떻게 동작하는지, 어떤 알고리즘이 있는지 정리하겠습니다.

운영 중 GC 로그를 보면 "Minor GC", "Major GC", "Full GC" 같은 용어가 나옵니다. 각각 무엇이 다른지, 왜 Stop-the-World 시간이 중요한지 알아야 문제를 해결할 수 있습니다.

## GC는 언제 필요한가

Java는 메모리를 자동으로 관리합니다. 개발자가 직접 `free()`를 호출할 필요가 없습니다.

```java
public void process() {
    User user = new User("kim");
    // user 사용
}  // 메서드 종료 → user는 어떻게 될까?
```

메서드가 끝나면 `user` 변수는 사라집니다. 하지만 Heap에 있는 User 객체는 그대로 남아있습니다. 이 객체를 정리하는 것이 GC의 역할입니다.

### 메모리 누수

GC가 있어도 메모리 누수는 발생합니다.

```java
public class Cache {
    private static Map<String, User> cache = new HashMap<>();

    public void add(String key, User user) {
        cache.put(key, user);  // 계속 쌓임
    }
}
```

static Map에 객체를 계속 넣으면 GC가 회수하지 못합니다. 참조가 계속 유지되기 때문입니다.

## GC의 기본 원리

GC는 두 가지 질문에 답해야 합니다.

1. 어떤 객체를 제거할 것인가?
2. 언제 제거할 것인가?

### Mark and Sweep

대부분의 GC는 Mark and Sweep 알고리즘을 기반으로 합니다.

**Mark 단계**: 살아있는 객체를 찾습니다.

```
GC Root (스택, 메서드 영역)
    ↓
   A 객체 (마킹)
    ↓
   B 객체 (마킹)
    ↓
   C 객체 (마킹)

D 객체 (도달 불가 → 마킹 안 됨)
```

GC Root에서 시작하여 참조 체인을 따라갑니다. 도달할 수 있는 객체는 "살아있다"고 마킹합니다.

**Sweep 단계**: 마킹되지 않은 객체를 제거합니다.

```
Heap 메모리
[A][B][C][D][E]
     마킹됨  마킹 안 됨

Sweep 후
[A][B][C][ ][E]
         ↑ 빈 공간
```

### Reachability

객체의 생존 여부는 "도달 가능성(Reachability)"으로 판단합니다.

**GC Root가 될 수 있는 것들**:
- Stack의 지역 변수
- 메서드 영역의 static 변수
- JNI로 생성한 객체

```java
public class OrderService {
    private static Cache cache;  // GC Root (static)

    public void process(Order order) {  // order는 GC Root (스택)
        User user = findUser(order.getUserId());  // user는 GC Root (스택)

        // 메서드 종료 시
        // order, user 변수는 사라짐 → Order, User 객체는 GC 대상
        // cache는 static이므로 계속 유지
    }
}
```

## Generational GC

대부분의 객체는 금방 사라집니다. 이를 "Weak Generational Hypothesis"라고 합니다.

```java
@GetMapping("/orders")
public List<OrderDto> getOrders() {
    List<Order> orders = orderRepository.findAll();
    return orders.stream()
        .map(OrderDto::from)  // OrderDto 객체 생성
        .collect(Collectors.toList());
}
// 응답 후 OrderDto는 모두 GC 대상
```

HTTP 요청을 처리하면서 생성한 DTO, 임시 List 등은 응답이 끝나면 바로 사라집니다.

### Young Generation

새로 생성된 객체가 들어가는 영역입니다.

```
┌────────────────────────────────────┐
│       Young Generation             │
├──────────┬──────────┬──────────────┤
│   Eden   │    S0    │      S1      │
│          │(Survivor)│  (Survivor)  │
└──────────┴──────────┴──────────────┘
```

**동작 과정**:

1. 객체가 생성되면 Eden에 들어갑니다
2. Eden이 가득 차면 Minor GC 발생
3. 살아남은 객체는 S0으로 이동
4. 다음 Minor GC 때 Eden + S0을 검사하고 살아남은 객체는 S1으로 이동
5. S0과 S1을 번갈아가며 사용

**Age**: 객체가 Minor GC에서 살아남은 횟수를 기록합니다. Age가 일정 값(기본 15)을 넘으면 Old Generation으로 승격(Promotion)됩니다.

### Old Generation

오래 살아남은 객체가 저장되는 영역입니다.

```java
@Component
public class ApplicationConfig {
    private final Environment env;  // 애플리케이션 종료까지 유지
}
```

Spring Bean, 설정 객체, 캐시 등 오래 사용되는 객체는 Old Generation에 있습니다.

Old Generation이 가득 차면 Major GC(또는 Full GC)가 발생합니다. Major GC는 Minor GC보다 느립니다. 전체 Heap을 검사하기 때문입니다.

## GC 알고리즘 비교

### Serial GC

단일 스레드로 GC를 수행합니다.

```bash
java -XX:+UseSerialGC -jar app.jar
```

**특징**:
- 간단하고 오버헤드가 적음
- Stop-the-World 시간이 김
- CPU 코어가 1개이거나 힙이 작을 때 적합

**사용 사례**: 개발 환경, 배치 작업

### Parallel GC

여러 스레드로 GC를 수행합니다. Java 8의 기본 GC입니다.

```bash
java -XX:+UseParallelGC -XX:ParallelGCThreads=4 -jar app.jar
```

**특징**:
- 처리량(Throughput)을 우선시
- Stop-the-World 시간은 여전히 존재
- Young Generation과 Old Generation 모두 멀티 스레드

**사용 사례**: 배치 작업, 백그라운드 처리

### G1 GC (Garbage First)

Java 9부터 기본 GC입니다. 큰 힙(4GB 이상)에서 효율적입니다.

```bash
java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -jar app.jar
```

**특징**:
- Heap을 여러 Region으로 나눔
- 예측 가능한 일시 정지 시간
- 가비지가 많은 Region을 우선 처리

**동작 방식**:

```
Heap
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ E  │ S  │ O  │ E  │ O  │ H  │ E  │ O  │
└────┴────┴────┴────┴────┴────┴────┴────┘
E: Eden, S: Survivor, O: Old, H: Humongous
```

Region 단위로 GC를 수행하므로 전체 Heap을 검사하지 않아도 됩니다.

**사용 사례**: 대부분의 서버 애플리케이션, Spring Boot

### ZGC

초저지연을 목표로 하는 GC입니다. Java 15부터 정식 지원됩니다.

```bash
java -XX:+UseZGC -jar app.jar
```

**특징**:
- Stop-the-World 시간 10ms 미만
- 대용량 힙(TB 단위)에서도 일정한 성능
- 대부분의 작업을 동시(Concurrent)에 수행

**사용 사례**: 레이턴시가 중요한 서비스, 대용량 힙

## Stop-the-World

GC가 실행되는 동안 애플리케이션 스레드가 멈춥니다.

```
애플리케이션 실행 ────────│ STW │──────── 애플리케이션 실행
                         GC 실행
```

이 시간 동안 모든 요청이 대기하므로, STW 시간이 길면 응답 지연이 발생합니다.

```
평균 응답 시간: 100ms
GC STW: 500ms
→ 일부 요청이 600ms 이상 걸림
```

### STW 시간 줄이기

1. **적절한 GC 선택**: G1 GC, ZGC 사용
2. **힙 크기 조정**: 너무 크면 GC 시간 증가
3. **GC 튜닝**: 목표 일시 정지 시간 설정

```bash
# G1 GC에서 목표 일시 정지 시간 200ms로 설정
java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -jar app.jar
```

4. **객체 생성 최소화**: 불필요한 객체 생성 줄이기

```java
// 안티 패턴
for (int i = 0; i < 1000; i++) {
    String result = "Order: " + i;  // 매번 새 String 생성
}

// 개선
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.setLength(0);  // 재사용
    sb.append("Order: ").append(i);
}
```

## 실무에서 겪는 GC 문제

### Full GC 빈발

Old Generation이 계속 가득 차서 Full GC가 자주 발생하는 경우입니다.

**원인**:
- 메모리 누수 (static Collection에 계속 추가)
- 힙 크기 부족
- 큰 객체가 계속 Old Generation으로 승격

**해결**:
1. Heap Dump 분석으로 메모리 누수 확인
2. 힙 크기 증가
3. 객체 생명주기 단축

### Promotion Failed

Young Generation에서 Old Generation으로 승격할 때 Old Generation 공간이 부족한 경우입니다.

```
[GC pause (G1 Evacuation Pause) (to-space exhausted)
```

**해결**:
- Old Generation 크기 증가
- Young Generation 크기 조정

### 메모리 누수 찾기

```bash
# OutOfMemoryError 발생 시 Heap Dump 생성
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/var/log/heapdump.hprof \
     -jar app.jar
```

Eclipse MAT이나 VisualVM으로 힙 덤프를 분석하면 어떤 객체가 메모리를 많이 차지하는지 확인할 수 있습니다.

## 메모리 관리 전략

GC 알고리즘만이 메모리 관리의 전부가 아닙니다. 다양한 전략으로 Heap 압박을 줄일 수 있습니다.

### 1. Off-Heap Memory

Heap이 아닌 Native Memory를 사용하여 GC 부담을 줄입니다.

```java
// Direct Buffer (Off-Heap 메모리 사용)
ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024 * 1024);  // 1MB
// Heap을 거치지 않으므로 GC 대상이 아님

// vs Heap Buffer
ByteBuffer heapBuffer = ByteBuffer.allocate(1024 * 1024);
// Heap에 할당되어 GC 대상
```

**사용 사례**:
```java
// 대용량 파일 처리
try (FileChannel channel = FileChannel.open(path)) {
    MappedByteBuffer buffer = channel.map(
        FileChannel.MapMode.READ_ONLY, 0, channel.size()
    );
    // Memory-Mapped File: OS가 메모리 관리, GC 부담 없음
}

// Netty - 네트워크 I/O
ByteBuf buffer = PooledByteBufAllocator.DEFAULT.directBuffer(256);
// Direct Buffer + Pooling으로 GC 최소화
```

**트레이드오프**:
- **장점**: GC 부담 감소, I/O 성능 향상
- **단점**: 명시적 해제 필요, 디버깅 어려움, Native Memory 부족 위험

### 2. Object Pooling

객체를 재사용하여 생성/소멸 비용을 줄입니다.

```java
// Apache Commons Pool
GenericObjectPool<Connection> pool = new GenericObjectPool<>(
    new ConnectionFactory()
);

// 사용
Connection conn = pool.borrowObject();
try {
    // 작업 수행
} finally {
    pool.returnObject(conn);  // 재사용을 위해 반환
}
```

**실무 예제**:
```java
// Thread Pool
ExecutorService executor = Executors.newFixedThreadPool(10);
// 스레드 재사용, 매번 생성하지 않음

// DB Connection Pool (HikariCP)
HikariConfig config = new HikariConfig();
config.setMaximumPoolSize(20);
HikariDataSource dataSource = new HikariDataSource(config);
// Connection 재사용
```

**트레이드오프**:
- **장점**: 객체 생성 비용 제거, GC 압박 감소
- **단점**: 상태 관리 복잡, 메모리 고정 사용, 스레드 안전성 고려 필요

### 3. Weak/Soft References

메모리가 부족할 때 GC가 회수할 수 있는 참조입니다.

```java
// Soft Reference - 메모리 부족 시 회수
public class ImageCache {
    private Map<String, SoftReference<BufferedImage>> cache = new HashMap<>();

    public BufferedImage get(String key) {
        SoftReference<BufferedImage> ref = cache.get(key);
        if (ref != null) {
            BufferedImage image = ref.get();
            if (image != null) {
                return image;  // 캐시 히트
            }
        }
        // 캐시 미스 - 새로 로드
        BufferedImage image = loadImage(key);
        cache.put(key, new SoftReference<>(image));
        return image;
    }
}
```

**Weak vs Soft**:
```java
// Weak Reference - 다음 GC에서 무조건 회수
WeakReference<User> weakRef = new WeakReference<>(user);

// Soft Reference - 메모리 부족할 때만 회수
SoftReference<User> softRef = new SoftReference<>(user);
```

**사용 사례**:
- **WeakReference**: WeakHashMap (캐시 키)
- **SoftReference**: 이미지, 문서 캐시

**트레이드오프**:
- **장점**: 메모리 부족 시 자동 회수, OOM 방지
- **단점**: 예측 불가능한 회수 시점, 캐시 미스 증가 가능

## GC 모니터링

### GC 로그 활성화

```bash
# Java 11+
java -Xlog:gc*:file=gc.log:time,level,tags \
     -jar app.jar
```

**로그 예시**:

```
[2024-12-16 15:30:21.123] [info] GC(12) Pause Young (Normal) 45M->12M(512M) 8.234ms
[2024-12-16 15:32:15.456] [info] GC(13) Pause Full (Allocation Failure) 480M->350M(512M) 1234.567ms
```

- Pause Young: Minor GC
- Pause Full: Full GC
- 45M->12M: GC 전후 사용량
- 8.234ms: Stop-the-World 시간

### 주요 지표

**Minor GC**:
- 빈도: 1~2초마다
- 시간: 10~50ms
- 너무 자주 발생하면: Young Generation 크기 증가

**Major GC/Full GC**:
- 빈도: 수 분~수 시간에 1번
- 시간: 수백 ms ~ 수 초
- 너무 자주 발생하면: 메모리 누수 의심

## GC 튜닝 전략

### 1. 측정부터

GC 튜닝은 측정 없이 시작하면 안 됩니다.

```bash
# GC 로그 수집
# 운영 환경에서 1~2주 관찰
```

### 2. 목표 설정

- 목표 일시 정지 시간: 200ms
- Full GC 빈도: 하루 1~2회 이하
- GC로 인한 CPU 사용률: 5% 이하

### 3. 힙 크기 조정

```bash
# 전체 메모리의 50~75% 정도
# 컨테이너 메모리 4GB라면
java -Xms2g -Xmx3g -jar app.jar
```

### 4. GC 알고리즘 선택

- 레이턴시 중요: G1 GC, ZGC
- 처리량 중요: Parallel GC
- 작은 힙: Serial GC

### 5. 애플리케이션 최적화

GC 튜닝보다 코드 개선이 더 효과적일 때가 많습니다.

```java
// 객체 재사용
private static final DateTimeFormatter FORMATTER =
    DateTimeFormatter.ofPattern("yyyy-MM-dd");

// 불필요한 객체 생성 방지
if (user.getStatus() == Status.ACTIVE) {  // enum 비교는 ==
    // ...
}
```

## 아키텍처로 풀어내는 GC 문제

GC 튜닝만으로는 해결되지 않는 문제가 많습니다. 아키텍처 설계로 근본적으로 해결할 수 있습니다.

### 1. 캐시 외부화

Heap 메모리에 캐시를 두면 GC 부담이 커집니다. 외부 캐시로 분리합니다.

```java
// Before: Heap 메모리에 캐시 (GC 부담)
@Component
public class ProductService {
    private final Map<Long, Product> cache = new ConcurrentHashMap<>();

    public Product getProduct(Long id) {
        return cache.computeIfAbsent(id, this::loadFromDb);
    }
    // 캐시가 커지면 Old Generation 압박 → Full GC 빈발
}

// After: Redis로 외부화 (GC 부담 제거)
@Component
public class ProductService {
    private final RedisTemplate<String, Product> redis;

    public Product getProduct(Long id) {
        String key = "product:" + id;
        Product product = redis.opsForValue().get(key);
        if (product == null) {
            product = loadFromDb(id);
            redis.opsForValue().set(key, product, 1, TimeUnit.HOURS);
        }
        return product;
    }
    // Redis가 메모리 관리, JVM Heap은 가벼움
}
```

**효과**:
- Heap 사용량 감소
- Old Generation 압박 감소
- Full GC 빈도 감소

**트레이드오프**:
- 네트워크 지연 추가 (1~5ms)
- Redis 인프라 운영 필요
- 직렬화/역직렬화 오버헤드

### 2. Stateless 설계

서버에 상태를 저장하지 않으면 Heap 사용량이 일정합니다.

```java
// Before: Session을 메모리에 저장 (Stateful)
@Component
public class SessionManager {
    private final Map<String, HttpSession> sessions = new ConcurrentHashMap<>();
    // 사용자 증가 → Heap 증가 → GC 압박
}

// After: Session을 외부에 저장 (Stateless)
@Configuration
@EnableRedisHttpSession
public class SessionConfig {
    // Spring Session + Redis
    // 서버는 Stateless, 스케일 아웃 가능
}
```

**효과**:
- Heap 사용량 예측 가능
- 서버 재시작 시 세션 유지
- 수평 확장 용이

**트레이드오프**:
- 외부 스토리지 의존성
- 네트워크 오버헤드

### 3. 마이크로서비스 분리

큰 Heap 하나보다 작은 Heap 여러 개가 GC에 유리합니다.

```
Before: Monolith (16GB Heap)
┌────────────────────────────────────────┐
│  Order + User + Product + Payment      │
│  Heap: 16GB                            │
│  Full GC: 5초                          │
└────────────────────────────────────────┘

After: Microservices (각 4GB Heap)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Order   │ │   User   │ │ Product  │ │ Payment  │
│ Heap: 4GB│ │ Heap: 4GB│ │ Heap: 4GB│ │ Heap: 4GB│
│ GC: 500ms│ │ GC: 500ms│ │ GC: 500ms│ │ GC: 500ms│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**효과**:
- GC 시간 단축 (Heap 크기에 비례)
- 장애 격리
- 독립적인 GC 튜닝 가능

**트레이드오프**:
- 분산 시스템 복잡도
- 네트워크 통신 오버헤드
- 트랜잭션 관리 어려움

### 4. Read Replica 분리

조회 부하를 분산하여 각 서버의 Heap 부담을 줄입니다.

```
Before: Single Server
┌────────────────────────┐
│   Application          │
│   Heap: 8GB            │
│   읽기 + 쓰기 모두 처리  │
│   Full GC 빈발         │
└────────────────────────┘

After: Read/Write 분리
┌─────────────────┐  ┌──────────────┐
│   Write Server  │  │  Read Server │ (스케일 아웃)
│   Heap: 4GB     │  │  Heap: 2GB   │ x 3
│   쓰기만 처리    │  │  읽기만 처리  │
│   GC 안정적     │  │  캐시 활용   │
└─────────────────┘  └──────────────┘
```

**효과**:
- 읽기 서버는 캐시 활용, GC 적음
- 쓰기 서버는 부하 분산
- 독립적인 확장 가능

**트레이드오프**:
- Eventual Consistency
- 인프라 복잡도

### 5. 컨테이너 환경에서의 GC 설정

Docker/Kubernetes에서는 JVM이 컨테이너 메모리를 인식하도록 설정해야 합니다.

```dockerfile
# Dockerfile
FROM openjdk:17-jdk-slim

# Container-aware JVM 설정
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:InitialRAMPercentage=50.0 \
               -XX:+UseG1GC \
               -XX:MaxGCPauseMillis=200"

CMD java $JAVA_OPTS -jar app.jar
```

**설정 예시**:
```yaml
# Kubernetes Pod
resources:
  limits:
    memory: "4Gi"
  requests:
    memory: "2Gi"

# JVM은 limits의 75%를 Heap으로 사용 (3GB)
```

**주의사항**:
- JVM은 Heap 외에도 Native Memory 사용 (Thread, GC, Code Cache 등)
- Container 메모리 limits = Heap + Native Memory + OS
- 보통 Container Memory의 75% 정도를 Heap으로 설정

### 아키텍처 선택 가이드

| GC 문제 | 아키텍처 해결책 |
|---------|----------------|
| 캐시로 인한 Old Generation 압박 | Redis/Memcached 외부화 |
| 사용자 증가로 Heap 증가 | Stateless 설계 + Session 외부화 |
| Full GC가 너무 김 (5초+) | 마이크로서비스 분리 (작은 Heap) |
| 조회 부하로 GC 빈발 | Read Replica 분리 + 캐시 |
| Container OOM Killed | Container-aware JVM 설정 |

**진화 경로**:
```
1단계: GC 알고리즘 선택 (G1, ZGC)
  ↓
2단계: Heap 튜닝 + 객체 생성 최적화
  ↓
3단계: 캐시 외부화 (Redis)
  ↓
4단계: Stateless 설계
  ↓
5단계: 마이크로서비스 분리
```

## 정리

GC 문제 해결은 **기술**과 **아키텍처** 두 가지 차원의 접근이 필요합니다.

**GC 기본 원리**:
- Mark and Sweep: GC Root에서 도달 가능한 객체만 유지
- Generational GC: Young/Old Generation 분리로 효율성 향상
- Minor GC (빠름, 자주) vs Major/Full GC (느림, 가끔)
- Stop-the-World: GC 동안 애플리케이션 일시 정지

**GC 알고리즘 선택**:
- **Serial GC**: 작은 힙, 단일 CPU (개발 환경)
- **Parallel GC**: 처리량 중심, 배치 작업
- **G1 GC**: 큰 힙(4GB+), 예측 가능한 일시 정지 (기본 추천)
- **ZGC**: 초저지연(10ms 미만), 대용량 힙 (레이턴시 중요)

**메모리 관리 전략**:
- **Off-Heap Memory**: Direct Buffer로 GC 부담 제거 (I/O 성능 향상 트레이드오프)
- **Object Pooling**: 재사용으로 생성 비용 절감 (상태 관리 복잡도 트레이드오프)
- **Weak/Soft References**: 메모리 부족 시 자동 회수 (예측 불가능성 트레이드오프)

**아키텍처 레벨 해결책**:
- **캐시 외부화**: Redis/Memcached로 Heap 압박 감소 (네트워크 지연 트레이드오프)
- **Stateless 설계**: Session 외부화로 Heap 일정 유지 (외부 의존성 트레이드오프)
- **마이크로서비스**: 큰 Heap → 작은 Heap 여러 개로 GC 시간 단축 (분산 복잡도 트레이드오프)
- **Read Replica**: 조회 부하 분산 (Eventual Consistency 트레이드오프)
- **Container-aware**: JVM이 컨테이너 메모리 인식 (설정 복잡도)

**문제 해결 순서**:
1. **측정**: GC 로그, Heap Dump 수집 및 분석
2. **원인 파악**: 메모리 누수 vs 용량 부족 vs 설계 문제
3. **기술 레벨**: GC 알고리즘 선택, Heap 튜닝, 객체 생성 최적화
4. **아키텍처 레벨**: 캐시 외부화, Stateless 설계, 마이크로서비스 분리

**핵심 원칙**:
- 측정 없는 튜닝은 추측일 뿐입니다
- GC 튜닝보다 코드 개선이 더 효과적일 때가 많습니다
- Heap이 너무 크면 GC 시간이 길어지고, 너무 작으면 GC가 자주 발생합니다
- GC 문제가 계속되면 아키텍처 재설계를 고려하세요

성급한 GC 튜닝보다 정확한 원인 파악이 중요합니다. 문제의 본질이 애플리케이션 설계에 있다면, 아키텍처 레벨의 해결책이 더 효과적입니다.
