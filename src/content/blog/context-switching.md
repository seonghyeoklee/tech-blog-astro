---
title: '컨텍스트 스위칭 - 프로세스 전환의 비용'
description: '컨텍스트 스위칭이 무엇이고 왜 비용이 발생하는지 정리했습니다'
pubDate: 'Jan 08 2025'
tags: ['CS', 'OS']
series: 'operating-system-fundamentals'
seriesOrder: 3
---

예를 들어, 스레드 풀 크기를 500개로 설정했더니 서버 응답 시간이 2배 느려지는 경우가 있습니다. CPU 사용률을 확인해보면 30%는 실제 작업, 70%는 스레드 간 전환에 소모되고 있을 수 있습니다. 이게 컨텍스트 스위칭 오버헤드입니다. 스레드를 200개로 줄이면 응답 시간이 절반으로 줄어들 수 있습니다.

## 컨텍스트 스위칭이란

Spring Boot 애플리케이션을 띄우면 수백 개의 스레드가 생성됩니다. 하지만 CPU 코어는 8개뿐입니다. 8개 코어가 200개 스레드를 어떻게 처리할까요? 빠르게 전환하면서 조금씩 실행합니다.

```bash
# 실행 중인 스레드 확인
$ jstack <pid> | grep "^\"" | wc -l
237

# CPU 코어 수 확인
$ nproc
8
```

237개 스레드를 8개 코어가 처리합니다. 스레드 A를 10ms 실행하고, 스레드 B로 전환해서 10ms 실행하고, 다시 스레드 C로 전환합니다. 이 전환 과정이 **컨텍스트 스위칭**입니다.

전환할 때마다 현재 스레드의 상태를 저장하고, 다음 스레드의 상태를 복원해야 합니다. 이 "상태"를 컨텍스트라고 부릅니다.

## 컨텍스트에 포함되는 것

CPU가 스레드를 실행할 때 사용하는 정보들입니다.

```
┌─────────────────────────────┐
│         컨텍스트             │
├─────────────────────────────┤
│ Program Counter (PC)        │ ← 다음에 실행할 명령어 주소
│ Stack Pointer (SP)          │ ← 스택의 현재 위치
│ 범용 레지스터들 (eax, ebx)  │ ← 연산 중간 결과
│ 스레드 상태                  │ ← RUNNABLE, WAITING 등
│ 우선순위                     │ ← 스케줄링 정보
└─────────────────────────────┘
```

예를 들어 이런 코드를 실행 중이라면:

```java
@Service
public class OrderService {
    public void processOrder(Order order) {
        int total = 0;                    // ← 지역 변수 (Stack)
        for (Item item : order.getItems()) {
            total += item.getPrice();     // ← total이 레지스터에 있을 수 있음
        }
        // 여기서 컨텍스트 스위칭 발생 시
        // → total 값, 반복문 위치, Stack 포인터 등을 모두 저장
        paymentService.pay(total);
    }
}
```

컨텍스트 스위칭이 발생하면 `total` 값, 반복문의 현재 위치, Stack 포인터, 레지스터 값들을 모두 TCB(Thread Control Block)에 저장합니다.

## 컨텍스트 스위칭 과정

```
스레드 A 실행 중 (Tomcat HTTP 요청 처리)
        │
        ▼
┌───────────────────┐
│ 1. 인터럽트 발생   │ (타임 슬라이스 만료 or I/O 대기)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2. A 상태 저장     │ → TCB_A에 저장
│   - PC, SP 레지스터│
│   - 스택 위치      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 3. 스케줄러 실행   │ → 다음 스레드 선택 (Round Robin)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 4. B 상태 복원     │ ← TCB_B에서 로드
└───────────────────┘
        │
        ▼
스레드 B 실행 시작 (비동기 작업 처리)
```

이 과정이 초당 수천~수만 번 발생합니다. 각 전환마다 수 마이크로초가 소모되지만, 전환 횟수가 많으면 무시할 수 없습니다.

## 왜 비용이 발생하는가

컨텍스트 스위칭 비용은 두 가지입니다.

**직접 비용** (작음)

레지스터 저장/복원, TCB 업데이트 등. 현대 CPU에서 1~2μs 정도입니다.

```
8코어, 200개 스레드, 초당 1만 번 전환
→ 1μs × 10,000회 = 10ms
→ 전체 1초 중 10ms = 1% CPU 시간
```

1%만 보면 별거 아닌 것 같지만, 간접 비용이 더 큽니다.

**간접 비용** (큼)

캐시 무효화가 진짜 문제입니다.

```
스레드 A 실행 중:
┌──────────────┐
│ L1 캐시 (32KB)│ ← UserRepository, User 객체들 (Cache Hot)
│ - User 데이터 │
│ - Repository  │
└──────────────┘
히트율: 95%

컨텍스트 스위칭 후:
┌──────────────┐
│ L1 캐시       │ ← User 데이터가 있지만 스레드 B는 Order 처리 중
│ - User 데이터 │ (쓸모없음, Cache Cold)
└──────────────┘
히트율: 20% → 메모리 접근 증가
```

실제 측정 결과:
- L1 캐시 히트: 0.5ns
- 메모리 접근: 100ns
- **200배 차이**

스레드가 바뀌면 캐시가 다시 채워질 때까지 메모리 접근이 잦아집니다. 이게 성능 저하의 주범입니다.

## 프로세스 vs 스레드 컨텍스트 스위칭

스레드 전환이 프로세스 전환보다 훨씬 가볍습니다.

| 구분 | 프로세스 전환 | 스레드 전환 |
|------|--------------|------------|
| 레지스터 저장/복원 | O | O |
| 메모리 맵 교체 | O | X (같은 주소 공간) |
| TLB 플러시 | O | X |
| 캐시 영향 | 큼 | 상대적으로 작음 |
| 비용 | ~10μs | ~1μs |

Spring Boot 같은 멀티스레드 애플리케이션에서는 스레드 전환만 발생합니다. 같은 JVM 프로세스 내에서 스레드만 바뀌니까, Heap 영역(객체들)은 그대로 공유됩니다. 메모리 맵도 그대로입니다.

```java
// 같은 프로세스 내 스레드들
@Service
public class UserService {
    private final UserRepository userRepository;  // 모든 스레드가 공유
}
```

`UserService` 인스턴스는 모든 Tomcat 스레드가 공유합니다. 스레드가 바뀌어도 이 객체는 같은 메모리 주소에 있습니다.

## 실무 예시

**예시 1: 과도한 스레드로 CPU 낭비**

```yaml
# 문제가 있던 설정
server:
  tomcat:
    threads:
      max: 500  # 너무 많음
```

8코어 서버에 500개 스레드를 띄우면 이런 현상이 발생할 수 있습니다:
- 응답 시간: 200ms (기대값: 100ms)
- CPU 사용률: 70%인데 응답 느림
- `vmstat` 확인 결과: 컨텍스트 스위칭 초당 50,000회

```bash
$ vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
30  0      0 500000  50000 200000    0    0     0     0 8000 50000 40 30 30  0  0
                                                              ↑
                                                        초당 50,000회
```

해결 방법: 스레드 수를 200개로 줄이면 → 응답 시간 100ms, 컨텍스트 스위칭 20,000회로 감소.

**예시 2: CPU 바운드 작업의 스레드 낭비**

대용량 Excel 생성 기능에서 CPU 집약적 계산이 많은 경우를 생각해봅시다. 스레드를 100개 할당하면 오히려 느릴 수 있습니다.

```java
// 문제 코드
@Async("excelExecutor")
public void generateExcel(List<Data> data) {
    // CPU 바운드: 복잡한 계산과 포맷팅
    for (Data d : data) {
        calculate(d);  // CPU 사용
    }
}

// 설정
executor.setMaxPoolSize(100);  // 너무 많음
```

8코어에 100개 스레드 → 계속 전환하면서 캐시 미스 발생합니다.

해결 방법: CPU 바운드 작업은 코어 수에 맞춤.

```java
executor.setMaxPoolSize(8);  // CPU 코어 수
```

처리 시간: 10초 → 5초로 개선될 수 있습니다.

**예시 3: I/O 바운드 vs CPU 바운드 혼재**

일반 API는 I/O 바운드인데, 일부 무거운 작업이 CPU 바운드인 상황을 생각해봅시다. 같은 스레드 풀을 쓰면 무거운 작업이 Tomcat 스레드를 독점할 수 있습니다.

해결 방법: 작업 종류별로 스레드 풀 분리.

```java
@Configuration
public class ThreadPoolConfig {
    @Bean(name = "ioExecutor")
    public Executor ioExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setMaxPoolSize(50);   // I/O 바운드는 많이
        return executor;
    }

    @Bean(name = "cpuExecutor")
    public Executor cpuExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setMaxPoolSize(8);    // CPU 바운드는 코어 수
        return executor;
    }
}
```

## 컨텍스트 스위칭 측정 방법

**Linux vmstat**
```bash
$ vmstat 1
# cs 컬럼이 초당 컨텍스트 스위칭 횟수
# 일반적으로 10,000~20,000이 정상
# 50,000 이상이면 스레드가 너무 많음
```

**Java VisualVM**
- Threads 탭에서 스레드 상태 확인
- RUNNABLE이 80% 이상 → CPU 바운드 → 스레드 줄이기
- WAITING이 80% 이상 → I/O 바운드 → 스레드 늘려도 됨

**Spring Boot Actuator**
```yaml
management:
  endpoint:
    metrics:
      enabled: true
```

`/actuator/metrics/jvm.threads.states`에서 스레드 상태 비율 확인.

## 컨텍스트 스위칭 최적화 기법

컨텍스트 스위칭을 줄이는 다양한 기법이 있습니다.

### CPU Affinity (CPU 친화도)

스레드를 특정 CPU 코어에 고정하는 방식입니다. 캐시 지역성(Cache Locality)을 높여서 성능을 개선합니다.

```bash
# Linux에서 특정 CPU 코어에 프로세스 고정
$ taskset -c 0,1,2,3 java -jar app.jar
# CPU 0, 1, 2, 3번만 사용

# 이미 실행 중인 프로세스에 적용
$ taskset -cp 0-3 <pid>

# 확인
$ taskset -p <pid>
pid 12345's current affinity mask: f  # 0-3번 코어 (바이너리 1111)
```

**Java에서 Thread Affinity 설정** (net.openhft:affinity 라이브러리):
```java
import net.openhft.affinity.AffinityLock;

// 스레드를 특정 CPU 코어에 고정
try (AffinityLock lock = AffinityLock.acquireLock()) {
    // 이 스레드는 특정 코어에서만 실행
    cpuBoundTask();
}
```

**장점**:
- L1/L2 캐시 히트율 증가
- NUMA 환경에서 메모리 접근 속도 향상
- 컨텍스트 스위칭으로 인한 캐시 미스 감소

**단점**:
- 부하 분산이 안 됨 (다른 코어가 놀 수 있음)
- 코어 장애 시 영향 큼
- 수동 관리 필요

**실무 사용**:
- 고성능 거래 시스템 (HFT)
- 실시간 데이터 처리
- Latency-sensitive 애플리케이션

### Lock-Free 자료구조

락 대기로 인한 컨텍스트 스위칭을 제거하는 방식입니다.

```java
// 일반 방식 (Lock 사용) - Context Switch 발생
public class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;  // 다른 스레드가 락 대기 → Context Switch
    }
}

// Lock-Free 방식 - Context Switch 없음
public class LockFreeCounter {
    private AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();  // CAS (Compare-And-Swap)로 원자적 연산
    }
}
```

**CAS (Compare-And-Swap) 동작 방식**:
```java
// CAS 내부 동작 (의사 코드)
do {
    int oldValue = count.get();
    int newValue = oldValue + 1;
} while (!count.compareAndSet(oldValue, newValue));
// 성공할 때까지 재시도 (Busy-waiting, Context Switch 없음)
```

**Lock-Free 자료구조 예시**:
```java
// ConcurrentLinkedQueue - Lock-Free Queue
Queue<Task> taskQueue = new ConcurrentLinkedQueue<>();
taskQueue.offer(task);  // Non-blocking

// ConcurrentHashMap - Segment Lock (Java 8+에서는 CAS)
Map<String, User> userCache = new ConcurrentHashMap<>();
userCache.put("user1", user);  // Fine-grained locking

// AtomicReference - Lock-Free 참조
AtomicReference<Config> configRef = new AtomicReference<>(initialConfig);
configRef.compareAndSet(oldConfig, newConfig);
```

**장점**:
- 락 대기 없음 → Context Switch 감소
- Deadlock 불가능
- 높은 동시성

**단점**:
- Busy-waiting으로 CPU 사용 증가 가능
- ABA 문제 (값이 A→B→A로 변경되어도 감지 못함)
- 복잡한 로직 구현 어려움

### Busy-Waiting vs Sleeping

대기 전략에 따른 컨텍스트 스위칭 트레이드오프입니다.

```java
// Busy-Waiting - Context Switch 없음, CPU 낭비
public void busyWait() {
    while (!condition) {
        // CPU를 계속 사용 (Context Switch 없음)
    }
}

// Sleeping - Context Switch 있음, CPU 절약
public void sleep() {
    while (!condition) {
        Thread.sleep(10);  // Context Switch 발생
    }
}

// Hybrid - 짧게 Busy-Wait 후 Sleep
public void hybridWait() {
    int spinCount = 0;
    while (!condition) {
        if (spinCount++ < 1000) {
            // 1000번은 Busy-Wait
        } else {
            Thread.sleep(1);  // 그 이후 Sleep
        }
    }
}
```

**Busy-Waiting이 유리한 경우**:
- 대기 시간이 매우 짧음 (~수 μs)
- 레이턴시가 중요함
- CPU 코어 여유 있음

**Sleeping이 유리한 경우**:
- 대기 시간이 김 (>1ms)
- CPU 절약이 중요
- 많은 스레드가 대기 중

### User-Space Scheduling (Green Threads / Fibers)

OS 스케줄러 대신 애플리케이션이 직접 스케줄링하는 방식입니다.

**Virtual Thread (Java 21+, Project Loom)**:
```java
// Platform Thread - OS 스레드, Context Switch 발생
Thread platformThread = new Thread(() -> {
    // OS 스케줄러가 관리
});

// Virtual Thread - JVM이 스케줄링, Context Switch 적음
Thread virtualThread = Thread.startVirtualThread(() -> {
    // JVM이 Carrier Thread에 마운트/언마운트
});

// Virtual Thread Executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 100_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(1000);  // Blocking이지만 Carrier Thread 해제
            return i;
        });
    });
}  // 10만 개 Virtual Thread도 문제없음
```

**동작 방식**:
```
OS Thread (Carrier Thread): [Thread 1] [Thread 2] [Thread 3] [Thread 4]
                                ↓          ↓          ↓          ↓
Virtual Threads:              [VT 1-100] [VT 101-200] [VT 201-300] [VT 301-400]

VT가 블로킹되면 Carrier Thread에서 언마운트 (다른 VT가 사용 가능)
→ OS 레벨 Context Switch 감소
```

**Kotlin Coroutine**:
```kotlin
// 경량 스레드, JVM이 스케줄링
suspend fun fetchUser(id: Long): User {
    delay(100)  // 중단점, Context Switch 없이 다른 코루틴 실행
    return userRepository.findById(id)
}

fun main() = runBlocking {
    // 10만 개 코루틴 동시 실행
    val jobs = List(100_000) {
        launch {
            val user = fetchUser(it.toLong())
            println(user)
        }
    }
    jobs.forEach { it.join() }
}
```

**장점**:
- OS Context Switch 대폭 감소
- 수백만 개 경량 스레드 생성 가능
- 메모리 효율적 (~1KB vs 1MB)

**단점**:
- Pinning 이슈 (Virtual Thread가 Carrier Thread 점유)
- 기존 코드 마이그레이션 필요
- 디버깅 복잡도 증가

### Thread Pool 크기 최적화

적절한 스레드 수로 컨텍스트 스위칭을 최소화하는 방식입니다.

```java
// CPU 바운드 - 코어 수
int cpuThreads = Runtime.getRuntime().availableProcessors();

// I/O 바운드 - Little's Law 적용
// 동시 요청 수 = 처리율 × 평균 응답 시간
// 스레드 수 = (코어 수) × (1 + 대기 시간 / 실행 시간)

// 예: 8코어, 실행 10ms, DB 대기 90ms
int ioThreads = 8 * (1 + 90 / 10) = 80;

@Bean
public ThreadPoolTaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(cpuThreads);
    executor.setMaxPoolSize(ioThreads);
    executor.setQueueCapacity(100);

    // Keep-Alive 설정 (유휴 스레드 제거)
    executor.setKeepAliveSeconds(60);
    executor.setAllowCoreThreadTimeOut(true);

    return executor;
}
```

## 아키텍처 레벨의 해결책

컨텍스트 스위칭 문제를 아키텍처로 해결하는 방법들입니다.

### Event-Driven Architecture (Event Loop)

단일 스레드 또는 적은 스레드로 많은 요청을 처리하는 방식입니다.

**Node.js / Netty 모델**:
```java
// Netty Event Loop
EventLoopGroup bossGroup = new NioEventLoopGroup(1);      // Accept 전용
EventLoopGroup workerGroup = new NioEventLoopGroup(8);    // I/O 처리 (코어 수)

ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)
 .channel(NioServerSocketChannel.class)
 .childHandler(new ChannelInitializer<SocketChannel>() {
     @Override
     public void initChannel(SocketChannel ch) {
         ch.pipeline().addLast(new HttpServerHandler());
     }
 });
```

**동작 방식**:
```
Thread 1 (Event Loop):
  → 이벤트 큐: [Accept, Read, Write, Close, ...]
  → 각 이벤트를 순차 처리 (Non-blocking I/O)
  → Context Switch 거의 없음 (같은 스레드에서 계속 실행)
```

**장점**:
- Context Switch 최소화 (CPU 코어 수만큼만 스레드)
- C10K 문제 해결 (10,000+ 동시 연결)
- 높은 처리량

**단점**:
- CPU 바운드 작업 시 블로킹
- 디버깅 어려움 (비동기 콜백)
- 학습 곡선 높음

### Reactive Programming (WebFlux)

Non-blocking I/O로 컨텍스트 스위칭을 줄이는 방식입니다.

```java
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        return userService.findById(id)  // Non-blocking
            .flatMap(user -> enrichmentService.enrich(user))
            .timeout(Duration.ofSeconds(3))
            .subscribeOn(Schedulers.boundedElastic());  // Scheduler 제어
    }
}

// Scheduler 종류
Schedulers.immediate()       // 현재 스레드 (Context Switch 없음)
Schedulers.single()          // 단일 스레드
Schedulers.parallel()        // CPU 코어 수만큼
Schedulers.boundedElastic()  // I/O 작업용 (탄력적)
```

**장점**:
- Non-blocking I/O로 스레드 효율 높음
- Backpressure 지원
- 적은 스레드로 높은 처리량

**단점**:
- 학습 곡선 매우 높음
- 디버깅 어려움
- JDBC 블로킹 (R2DBC 필요)

### Actor Model (Akka)

메시지 전달로 공유 상태를 제거하여 락을 없앤 방식입니다.

```java
public class UserActor extends AbstractActor {
    private Map<Long, User> users = new HashMap<>();  // 단일 스레드 접근, 락 불필요

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(GetUserMsg.class, msg -> {
                User user = users.get(msg.getId());
                getSender().tell(user, getSelf());
            })
            .match(UpdateUserMsg.class, msg -> {
                users.put(msg.getUser().getId(), msg.getUser());
            })
            .build();
    }
}
```

**장점**:
- 락 불필요 (단일 Actor는 단일 스레드)
- Context Switch 감소
- 장애 격리

**단점**:
- 메시지 전달 오버헤드
- 디버깅 복잡
- 러닝 커브

### SEDA (Staged Event-Driven Architecture)

작업 단계별로 스레드 풀을 분리하여 컨텍스트 스위칭을 최적화하는 방식입니다.

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Accept  │──→│  Parse  │──→│ Process │──→│Response │
│ Pool: 2 │   │ Pool: 8 │   │ Pool:20 │   │ Pool: 4 │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
  ↓ Queue      ↓ Queue       ↓ Queue       ↓ Queue

각 단계마다 최적 스레드 수 설정 → Context Switch 최소화
```

**장점**:
- 단계별 최적화 가능
- 병목 지점 파악 쉬움
- 리소스 격리

**단점**:
- 설계 복잡도
- 레이턴시 증가 (큐 대기)

### Thread-Per-Core Pattern

CPU 코어 수만큼만 스레드를 생성하여 컨텍스트 스위칭을 제거하는 방식입니다.

```java
// Vert.x의 Thread-Per-Core 모델
Vertx vertx = Vertx.vertx(new VertxOptions()
    .setEventLoopPoolSize(Runtime.getRuntime().availableProcessors())
);

vertx.createHttpServer()
    .requestHandler(req -> {
        // Event Loop 스레드에서 실행 (Context Switch 없음)
        req.response()
            .putHeader("content-type", "text/plain")
            .end("Hello");
    })
    .listen(8080);
```

**Rust의 Tokio 런타임**:
```rust
#[tokio::main]
async fn main() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(num_cpus::get())  // CPU 코어 수
        .build()
        .unwrap();

    // 각 코어에 Event Loop 할당
}
```

**장점**:
- Context Switch 최소 (코어 수 = 스레드 수)
- L1/L2 캐시 효율 최대
- 예측 가능한 성능

**단점**:
- 블로킹 작업 금지
- CPU 집약 작업 시 다른 요청 지연

## 컨텍스트 스위칭 최적화 비교

### 기법별 트레이드오프

| 기법 | Context Switch 감소 | CPU 효율 | 구현 복잡도 | 적용 범위 | 주요 용도 |
|------|-------------------|----------|------------|-----------|----------|
| CPU Affinity | 중간 | 높음 (캐시 히트) | 낮음 | 프로세스 | HFT, 실시간 |
| Lock-Free | 높음 | 중간 (Busy-Wait) | 높음 | 자료구조 | 고동시성 |
| User-Space Scheduling | 매우 높음 | 높음 | 중간 | 애플리케이션 | I/O 집약적 |
| Event Loop | 매우 높음 | 매우 높음 | 높음 | 시스템 | 네트워크 서버 |
| Reactive | 높음 | 높음 | 매우 높음 | 시스템 | 스트림 처리 |
| Actor Model | 높음 | 중간 | 높음 | 시스템 | 분산 시스템 |

### 스레드 모델 비교

| 모델 | 스레드 수 | Context Switch | 메모리 | 학습 곡선 | 블로킹 처리 |
|------|----------|---------------|--------|-----------|------------|
| Platform Thread | 수백~수천 | 많음 | 높음 (1MB/스레드) | 낮음 | 가능 |
| Virtual Thread | 수백만 | 적음 (JVM 내부) | 낮음 (~1KB) | 낮음 | 가능 (권장 안함) |
| Coroutine | 수백만 | 적음 | 매우 낮음 | 중간 | 불가 (suspend) |
| Event Loop | CPU 코어 수 | 최소 | 매우 낮음 | 높음 | 불가 (Worker) |

## 진화 경로

실무에서는 단계적으로 최적화하는 것이 좋습니다.

```
1단계: 기본 멀티스레드
  - Tomcat 기본 설정 (200 스레드)
  - 모니터링 도구 도입
  - vmstat, VisualVM으로 측정

2단계: 스레드 풀 최적화
  - CPU/I/O 바운드 분리
  - 스레드 수 조정
  - Keep-Alive 설정

3단계: Lock-Free 적용
  - AtomicInteger, ConcurrentHashMap
  - 공유 상태 최소화
  - Lock contention 제거

4단계: Virtual Thread 도입 (Java 21+)
  - I/O 바운드 작업에 적용
  - Pinning 이슈 해결
  - 기존 코드 유지

5단계: 아키텍처 전환
  - Event Loop (Netty, Vert.x)
  - Reactive (WebFlux)
  - Thread-Per-Core 패턴
```

## 실전 선택 기준

**다음과 같은 경우 Platform Thread를 유지하세요**:
- 기존 애플리케이션 잘 동작
- 트래픽 적음 (초당 수백 요청)
- 빠른 개발과 안정성 중요
- vmstat cs < 20,000

**다음과 같은 경우 Lock-Free를 고려하세요**:
- 공유 상태가 많음
- Lock contention 심각
- 높은 동시성 필요
- Atomic 연산으로 해결 가능

**다음과 같은 경우 Virtual Thread를 고려하세요** (Java 21+):
- I/O 대기가 많음
- 동시 연결 수 많음 (수천~수만)
- 기존 코드 유지하면서 개선
- vmstat cs > 50,000

**다음과 같은 경우 Event Loop를 고려하세요**:
- 매우 높은 동시 연결 (C10K+)
- I/O 집약적
- 낮은 레이턴시 중요
- 팀의 비동기 프로그래밍 경험

**다음과 같은 경우 CPU Affinity를 고려하세요**:
- 극도로 낮은 레이턴시 필요 (<1ms)
- 고빈도 거래 시스템
- NUMA 서버 환경
- CPU 캐시 히트율이 중요

## 정리

- 컨텍스트 스위칭은 CPU가 스레드를 전환할 때 발생하는 오버헤드입니다
- 직접 비용보다 캐시 무효화로 인한 간접 비용이 훨씬 큽니다 (200배 차이)
- 스레드 전환이 프로세스 전환보다 10배 가볍습니다
- CPU 바운드 작업은 스레드를 코어 수에 맞춰야 합니다
- I/O 바운드 작업은 스레드가 많아도 괜찮습니다 (대기 시간 활용)
- vmstat으로 컨텍스트 스위칭 횟수를 모니터링하세요
- 실무에서는 작업 특성에 맞춰 스레드 풀을 분리하는 게 중요합니다
- **최적화 기법**: CPU Affinity, Lock-Free, Virtual Thread, Thread Pool 튜닝
- **아키텍처 해결책**: Event Loop, Reactive, Actor Model, Thread-Per-Core 패턴
- **진화적 접근**: 기본 설정에서 시작해서 측정 기반으로 점진적 최적화
