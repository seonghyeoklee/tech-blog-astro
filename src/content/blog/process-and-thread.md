---
title: '프로세스와 스레드 - 운영체제 기초'
description: '프로세스와 스레드의 차이, 메모리 구조, 멀티스레딩의 장단점을 정리했습니다'
pubDate: 'Jan 05 2025'
tags: ['CS', 'OS']
series: 'operating-system-fundamentals'
seriesOrder: 1
---

예를 들어, API 서버에 트래픽이 몰리면 응답이 느려지는 상황을 생각해봅시다. "스레드 풀 크기를 늘리면 되겠지"라는 생각으로 200개에서 500개로 올렸는데 오히려 더 느려지는 경우가 있습니다. 프로세스와 스레드를 제대로 이해하지 못하면 이런 문제를 해결하기 어렵습니다.

## 프로세스란

프로세스는 실행 중인 프로그램입니다. IntelliJ로 Spring Boot 애플리케이션을 실행하면 JVM 프로세스가 하나 생성됩니다. 이 프로세스는 운영체제로부터 독립된 메모리 공간을 할당받습니다.

```bash
# 실행 중인 Java 프로세스 확인
$ jps
12345 Application
```

프로세스 메모리는 크게 4가지 영역으로 나뉩니다.

```
┌─────────────────┐ 높은 주소
│      Stack      │ ← 지역 변수, 함수 호출 정보
├─────────────────┤
│        ↓        │
│                 │
│        ↑        │
├─────────────────┤
│      Heap       │ ← 동적 할당 메모리 (new)
├─────────────────┤
│      Data       │ ← 전역 변수, static 변수
├─────────────────┤
│      Code       │ ← 실행할 코드 (.class 파일)
└─────────────────┘ 낮은 주소
```

- **Code**: 컴파일된 바이트코드가 저장됩니다. 읽기 전용입니다.
- **Data**: static 변수, 상수가 저장됩니다. 프로그램 시작 시 할당되고 종료 시 해제됩니다.
- **Heap**: `new`로 생성한 객체가 저장됩니다. JVM의 Garbage Collector가 관리합니다.
- **Stack**: 메서드 호출 시 생성되는 지역 변수, 매개변수, 리턴 주소가 저장됩니다.

각 프로세스는 이 메모리 공간을 독립적으로 가집니다. Spring Boot 애플리케이션 A가 프로세스 B의 메모리에 직접 접근할 수 없습니다. 프로세스 간 격리 덕분에 한 애플리케이션이 죽어도 다른 애플리케이션에 영향을 주지 않습니다.

## 스레드란

스레드는 프로세스 내에서 실행되는 흐름의 단위입니다. Spring Boot 애플리케이션은 하나의 프로세스지만, 내부에서 수십~수백 개의 스레드가 동작합니다.

```bash
# 특정 프로세스의 스레드 수 확인
$ jstack 12345 | grep "^\"" | wc -l
237
```

Tomcat 기본 설정으로 애플리케이션을 띄우면 최대 200개 스레드가 생성됩니다. HTTP 요청 하나당 스레드 하나가 처리합니다.

스레드의 핵심은 **메모리 공유**입니다. 같은 프로세스 내의 스레드들은 Code, Data, Heap 영역을 공유합니다. 각 스레드가 독립적으로 가지는 것은 Stack뿐입니다.

```
┌───────────────────────────────────────┐
│         Spring Boot 프로세스            │
│  ┌─────────────────────────────────┐  │
│  │    Code (.class 파일들)          │  │
│  ├─────────────────────────────────┤  │
│  │    Data (static 변수들)          │  │
│  ├─────────────────────────────────┤  │
│  │    Heap (객체들)                 │  │
│  │    - Controller, Service 인스턴스 │  │
│  │    - 요청/응답 데이터             │  │
│  ├─────────────────────────────────┤  │
│  │  Stack 1  │  Stack 2  │  Stack 3 │  │ ← 스레드별 독립
│  │(요청 A 처리)│(요청 B 처리)│(요청 C 처리)│  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

스레드마다 독립적인 Stack을 가지는 이유는 요청 처리 흐름이 스레드마다 다르기 때문입니다. 스레드 1이 `/api/users`를 처리하는 동안 스레드 2는 `/api/orders`를 처리할 수 있습니다. 각자의 메서드 호출 스택이 필요합니다.

## 프로세스 vs 스레드

| 구분 | 프로세스 | 스레드 |
|------|----------|--------|
| 메모리 | 독립적 | 공유 (Stack만 독립) |
| 생성 비용 | 높음 (~10ms) | 낮음 (~1ms) |
| 컨텍스트 스위칭 | 느림 (~수 μs) | 빠름 (~1 μs 이하) |
| 통신 | IPC 필요 (Redis, RabbitMQ) | 메모리 직접 공유 |
| 안정성 | 다른 프로세스에 영향 없음 | 한 스레드 문제가 전체에 영향 |

프로세스를 새로 만들면 메모리 공간 전체를 새로 할당해야 합니다. 운영체제 입장에서 비용이 큽니다. 스레드는 Stack만 새로 할당하면 되니까 훨씬 가볍습니다.

컨텍스트 스위칭도 마찬가지입니다. 프로세스 간 전환은 메모리 맵 전체를 교체해야 하지만, 스레드 간 전환은 Stack과 레지스터만 교체하면 됩니다.

## 멀티프로세스 vs 멀티스레드

웹 서버는 동시에 수백~수천 개의 요청을 처리해야 합니다. 어떻게 처리할까요?

**멀티프로세스 방식 (Apache prefork, Nginx + PHP-FPM)**

요청마다 새 프로세스를 생성하거나, 미리 생성한 프로세스 풀을 사용합니다. 프로세스끼리 격리되어 있어서 한 프로세스가 죽어도 다른 프로세스에 영향이 없습니다. 하지만 프로세스 생성 비용이 크고, 메모리 사용량도 많습니다.

**멀티스레드 방식 (Tomcat, Undertow, Netty)**

요청마다 스레드 풀에서 스레드를 할당합니다. 스레드 생성 비용이 적고, 메모리를 공유하니까 효율적입니다. Spring Boot의 기본 내장 서버인 Tomcat이 이 방식입니다.

```yaml
# application.yml - Tomcat 스레드 풀 설정
server:
  tomcat:
    threads:
      max: 200        # 최대 스레드 수
      min-spare: 10   # 최소 유지 스레드 수
    accept-count: 100 # 큐 대기 가능한 요청 수
```

하지만 멀티스레드는 공유 메모리 접근 시 동기화 문제를 신경 써야 합니다.

```java
@Service
public class VisitorCounter {
    private int count = 0;  // 공유 자원 - 여러 스레드가 동시 접근

    public void increment() {
        count++;  // 이 연산은 원자적이지 않음!
        // 실제로는 1) count 읽기 → 2) +1 → 3) count 쓰기
    }

    public int getCount() {
        return count;
    }
}
```

`count++`는 단순해 보이지만 실제로는 읽기 → 증가 → 쓰기 3단계로 이루어집니다. 스레드 A와 B가 동시에 실행하면:

```
초기값: count = 0

스레드 A: count 읽기 (0)
스레드 B: count 읽기 (0)  ← 아직 A가 쓰기 전
스레드 A: 0 + 1 = 1
스레드 B: 0 + 1 = 1
스레드 A: count에 1 쓰기
스레드 B: count에 1 쓰기  ← B의 결과가 덮어씀

최종값: count = 1 (기대값: 2)
```

이런 상황을 **Race Condition**이라고 합니다. 실무에서 방문자 수가 제대로 안 올라가는 버그가 발생하는 경우가 있는데, 이것이 원인인 경우가 많습니다.

해결 방법:

```java
@Service
public class VisitorCounter {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();  // 원자적 연산
    }

    public int getCount() {
        return count.get();
    }
}
```

## 스레드 풀

스레드를 매번 생성하고 삭제하는 것도 비용입니다. 그래서 실무에서는 스레드 풀을 사용합니다.

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);        // 기본 스레드 수
        executor.setMaxPoolSize(20);         // 최대 스레드 수
        executor.setQueueCapacity(100);      // 큐 크기
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

@Service
public class NotificationService {
    @Async("taskExecutor")
    public void sendEmail(String to, String content) {
        // 이메일 발송 - 별도 스레드에서 비동기 처리
        // 메인 요청 스레드를 블로킹하지 않음
    }
}
```

100개의 이메일 발송 작업이 들어와도 스레드는 최대 20개만 사용합니다. 작업이 끝난 스레드가 큐에서 다음 작업을 가져갑니다.

## 스레드 풀 크기, 어떻게 정할까?

가장 많이 받는 질문입니다. 정답은 "측정해봐야 안다"입니다. 하지만 기준은 있습니다.

**CPU 바운드 작업** (암호화, 이미지 처리, 데이터 계산)
```java
int threadPoolSize = Runtime.getRuntime().availableProcessors() + 1;
```

CPU를 계속 사용하는 작업이라면 코어 수만큼만 스레드를 만드는 게 효율적입니다. 더 많이 만들어봐야 컨텍스트 스위칭 오버헤드만 증가합니다.

**I/O 바운드 작업** (DB 조회, API 호출, 파일 읽기)
```java
int threadPoolSize = Runtime.getRuntime().availableProcessors() * 2;
// 또는 더 많이 (50~200)
```

대부분의 시간을 I/O 대기에 쓰는 작업이라면 스레드가 많아야 CPU를 효율적으로 사용합니다. 한 스레드가 DB 응답을 기다리는 동안 다른 스레드가 CPU를 쓸 수 있습니다.

실무 권장값:
- **Tomcat 기본값 200**: 일반적인 웹 애플리케이션에 적당합니다
- **DB 커넥션 풀 기본값 10**: HikariCP 기본값. DB 서버 부하를 고려한 값입니다
- **비동기 작업 풀**: CPU 바운드면 코어 수, I/O 바운드면 20~50

실무 팁: VisualVM이나 JConsole로 스레드 상태를 모니터링하세요. `RUNNABLE` 상태가 많으면 CPU 바운드, `WAITING`이 많으면 I/O 바운드입니다.

## 실무 예시

**예시 1: 스레드 고갈**

서비스가 느려지는 상황에서 Tomcat 스레드 200개가 모두 `WAITING` 상태인 경우가 있습니다. 외부 API 호출이 느려서 스레드가 대기 중인 것입니다.

해결 방법: 외부 API 호출을 별도 스레드 풀로 분리하고 타임아웃 설정.

```java
@Bean
public RestTemplate restTemplate() {
    HttpComponentsClientHttpRequestFactory factory =
        new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(3000);  // 3초
    factory.setReadTimeout(5000);     // 5초
    return new RestTemplate(factory);
}
```

**예시 2: 과도한 스레드 생성**

모니터링 툴에서 스레드가 500개까지 치솟는 경우를 발견할 수 있습니다. 스레드 풀 설정을 제대로 안 해서 작업마다 새 스레드를 생성하는 것입니다.

해결 방법: `@Async` 사용 시 반드시 커스텀 Executor 지정.

```java
@Async("taskExecutor")  // 기본 Executor 대신 커스텀 사용
public void processHeavyTask() { }
```

## 동시성 처리 기술 선택

전통적인 OS 스레드 외에도 다양한 동시성 처리 기술이 있습니다.

### Virtual Thread (Java 21+, Project Loom)

JVM이 관리하는 경량 스레드입니다. OS 스레드가 아니라 JVM이 스케줄링합니다.

```java
// Virtual Thread 생성
Thread.startVirtualThread(() -> {
    System.out.println("Virtual Thread: " + Thread.currentThread());
});

// Executors로 사용
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return i;
        });
    });
}  // 1만 개의 Virtual Thread가 동시 실행 가능
```

**장점**:
- OS 스레드보다 훨씬 가볍습니다 (수백만 개 생성 가능)
- 블로킹 I/O를 사용해도 OS 스레드를 점유하지 않습니다
- 기존 Thread API를 그대로 사용 (학습 곡선 낮음)

**단점**:
- Java 21 이상에서만 사용 가능
- CPU 바운드 작업에는 이점이 없습니다
- Pinning 이슈 (synchronized 블록 내에서 블로킹하면 OS 스레드 점유)

### Coroutine (Kotlin)

함수 실행을 중단하고 재개할 수 있는 경량 스레드입니다.

```kotlin
// Coroutine으로 비동기 처리
suspend fun fetchUser(id: Long): User {
    delay(100)  // 스레드 블로킹 없이 중단
    return userRepository.findById(id)
}

fun main() = runBlocking {
    // 10만 개의 코루틴 동시 실행
    val jobs = List(100_000) {
        launch {
            delay(1000)
            println("Coroutine $it")
        }
    }
    jobs.forEach { it.join() }
}
```

**장점**:
- Virtual Thread보다 더 가볍습니다
- 구조적 동시성 (Structured Concurrency) 지원
- 취소, 타임아웃 등 고급 기능 내장

**단점**:
- Kotlin 전용
- suspend 함수로 변환 필요 (기존 코드 수정)
- Java와 혼용 시 복잡도 증가

### Thread-Safe 자료구조

멀티스레드 환경에서 안전하게 사용할 수 있는 자료구조입니다.

```java
// ConcurrentHashMap - 세그먼트 단위 락
Map<String, User> userCache = new ConcurrentHashMap<>();
userCache.putIfAbsent("user1", new User());  // 원자적 연산

// CopyOnWriteArrayList - 쓰기 시 복사
List<String> listeners = new CopyOnWriteArrayList<>();
listeners.add("listener1");  // 쓰기는 느리지만 읽기는 빠름

// BlockingQueue - 생산자-소비자 패턴
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(100);
queue.put(task);     // 큐가 가득 차면 대기
Task t = queue.take(); // 큐가 비어 있으면 대기
```

### 동기화 메커니즘

```java
// synchronized - 가장 간단하지만 성능 낮음
public synchronized void increment() {
    count++;
}

// ReentrantLock - 더 유연한 제어
private final ReentrantLock lock = new ReentrantLock();
public void increment() {
    lock.lock();
    try {
        count++;
    } finally {
        lock.unlock();
    }
}

// ReadWriteLock - 읽기는 동시, 쓰기는 독점
private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
public int read() {
    rwLock.readLock().lock();
    try {
        return count;  // 여러 스레드가 동시 읽기 가능
    } finally {
        rwLock.readLock().unlock();
    }
}
public void write(int value) {
    rwLock.writeLock().lock();
    try {
        count = value;  // 쓰기는 독점
    } finally {
        rwLock.writeLock().unlock();
    }
}

// StampedLock - 낙관적 읽기 지원 (Java 8+)
private final StampedLock sl = new StampedLock();
public int optimisticRead() {
    long stamp = sl.tryOptimisticRead();  // 락 없이 읽기
    int currentCount = count;
    if (!sl.validate(stamp)) {  // 쓰기가 발생했는지 검증
        stamp = sl.readLock();  // 실패 시 읽기 락 획득
        try {
            currentCount = count;
        } finally {
            sl.unlockRead(stamp);
        }
    }
    return currentCount;
}
```

### 병렬 처리 라이브러리

```java
// Fork/Join Framework - 작업 분할 정복
ForkJoinPool pool = new ForkJoinPool();
RecursiveTask<Long> task = new SumTask(array, 0, array.length);
long result = pool.invoke(task);

// Parallel Stream - 간편한 병렬 처리
List<Integer> numbers = List.of(1, 2, 3, 4, 5);
int sum = numbers.parallelStream()
    .mapToInt(Integer::intValue)
    .sum();

// CompletableFuture - 비동기 파이프라인
CompletableFuture<User> userFuture = CompletableFuture
    .supplyAsync(() -> userService.getUser(id))
    .thenApplyAsync(user -> enrichUser(user))
    .exceptionally(ex -> getDefaultUser());
```

### 동시성 기술 비교

| 기술 | 스레드 수 제한 | 메모리 사용 | 블로킹 I/O | 학습 곡선 | 주요 용도 |
|------|---------------|-------------|------------|-----------|----------|
| OS Thread | ~수천 개 | 높음 (1MB/스레드) | OS 스레드 점유 | 낮음 | 전통적 서버 |
| Virtual Thread | 수백만 개 | 낮음 (~1KB/스레드) | JVM 관리 | 낮음 | I/O 집약적 |
| Coroutine | 수백만 개 | 매우 낮음 | 중단/재개 | 중간 | 비동기 로직 |
| Reactive | 제한 없음 | 낮음 | Non-blocking | 높음 | 스트림 처리 |
| Event Loop | 단일 스레드 | 매우 낮음 | Non-blocking | 중간 | 고성능 I/O |

## 아키텍처 레벨의 해결책

스레드 모델 자체를 바꾸는 아키텍처 패턴들입니다.

### Event Loop (Node.js, Netty, Vert.x)

단일 스레드가 이벤트 큐를 처리하는 방식입니다. 블로킹 작업이 없다면 매우 효율적입니다.

```java
// Netty Event Loop 예시
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
EventLoopGroup workerGroup = new NioEventLoopGroup();
try {
    ServerBootstrap b = new ServerBootstrap();
    b.group(bossGroup, workerGroup)
     .channel(NioServerSocketChannel.class)
     .childHandler(new ChannelInitializer<SocketChannel>() {
         @Override
         public void initChannel(SocketChannel ch) {
             ch.pipeline().addLast(new HttpServerHandler());
         }
     });
    ChannelFuture f = b.bind(8080).sync();
} finally {
    workerGroup.shutdownGracefully();
    bossGroup.shutdownGracefully();
}
```

**특징**:
- CPU 코어 수만큼 Event Loop 스레드 생성
- 블로킹 없이 수만 개 연결 처리 가능
- C10K 문제 해결 (10,000 동시 연결)

**주의사항**:
- Event Loop에서 블로킹 작업 금지
- CPU 집약적 작업은 별도 스레드 풀로 위임

### Reactive Streams (Project Reactor, RxJava)

데이터 스트림을 비동기로 처리하는 방식입니다. Spring WebFlux가 이 모델을 사용합니다.

```java
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        return userService.findById(id)  // Non-blocking
            .flatMap(user -> enrichmentService.enrich(user))
            .timeout(Duration.ofSeconds(3))
            .onErrorReturn(User.getDefault());
    }

    @GetMapping("/users")
    public Flux<User> getUsers() {
        return userService.findAll()  // 스트림 처리
            .filter(user -> user.isActive())
            .take(100);
    }
}
```

**장점**:
- Backpressure 지원 (소비자가 처리 속도 조절)
- 적은 스레드로 높은 처리량
- 함수형 프로그래밍 스타일

**단점**:
- 학습 곡선 높음
- 디버깅 어려움
- JDBC는 블로킹이라 R2DBC 필요

### Actor Model (Akka)

각 Actor가 독립적인 상태를 가지고 메시지로만 통신하는 방식입니다.

```java
// Akka Actor 예시
public class UserActor extends AbstractActor {
    private Map<Long, User> users = new HashMap<>();

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(GetUser.class, msg -> {
                User user = users.get(msg.getId());
                getSender().tell(user, getSelf());
            })
            .match(UpdateUser.class, msg -> {
                users.put(msg.getUser().getId(), msg.getUser());
                getSender().tell("OK", getSelf());
            })
            .build();
    }
}

// Actor 사용
ActorSystem system = ActorSystem.create("MySystem");
ActorRef userActor = system.actorOf(Props.create(UserActor.class));
userActor.tell(new GetUser(1L), ActorRef.noSender());
```

**특징**:
- Actor 간 상태 공유 없음 (Race Condition 없음)
- 메시지 전달로 통신
- 장애 격리 및 복구 (Supervision)

### SEDA (Staged Event-Driven Architecture)

작업을 여러 단계(Stage)로 나누고, 각 단계마다 큐와 스레드 풀을 할당하는 방식입니다.

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Request │────→│  Parse  │────→│ Process │────→│Response │
│  Queue  │     │  Queue  │     │  Queue  │     │  Queue  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
   ↓ Pool:5       ↓ Pool:10       ↓ Pool:20       ↓ Pool:5
```

**장점**:
- 단계별 스레드 풀 크기 최적화
- 병목 단계 파악 용이
- 장애 격리 (한 단계 문제가 전체에 영향 안 줌)

**단점**:
- 설계 복잡도 증가
- 레이턴시 증가 (큐 대기 시간)

### Message Queue 기반 아키텍처

여러 서비스가 메시지 큐로 통신하는 방식입니다.

```java
// RabbitMQ Producer
@Service
public class OrderService {
    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void createOrder(Order order) {
        orderRepository.save(order);
        rabbitTemplate.convertAndSend("order.created", order);
        // 이메일 발송은 Consumer가 비동기 처리
    }
}

// Consumer
@RabbitListener(queues = "order.created")
public void handleOrderCreated(Order order) {
    emailService.sendOrderConfirmation(order);
}
```

**장점**:
- 서비스 간 결합도 낮음
- 트래픽 버스트 흡수 (큐가 버퍼 역할)
- 재시도, DLQ (Dead Letter Queue) 지원

**단점**:
- 메시지 유실 가능성 (Acknowledgement 필요)
- 메시지 순서 보장 어려움
- 인프라 복잡도 증가

## 동시성 모델 선택 가이드

| 상황 | 추천 기술 | 이유 |
|------|----------|------|
| 전통적인 CRUD API | OS Thread + Thread Pool | 검증된 방식, 안정적 |
| I/O 대기가 많은 API | Virtual Thread (Java 21+) | 많은 동시 요청 처리, 간단 |
| 실시간 스트리밍 | Reactive (WebFlux) | Backpressure, 높은 처리량 |
| 고성능 네트워크 서버 | Event Loop (Netty) | C10K 문제 해결 |
| 복잡한 비동기 로직 | Coroutine (Kotlin) | 가독성 좋은 비동기 코드 |
| 마이크로서비스 간 통신 | Message Queue | 느슨한 결합, 재시도 |
| 분산 트랜잭션 | Saga Pattern + MQ | 보상 트랜잭션 |

## 트레이드오프

### OS Thread vs Virtual Thread

| 기준 | OS Thread | Virtual Thread |
|------|-----------|----------------|
| 스레드 수 | ~수천 개 | 수백만 개 |
| 컨텍스트 스위칭 | OS 커널 개입 (느림) | JVM 내부 (빠름) |
| 메모리 | 1MB/스레드 | ~1KB/스레드 |
| 블로킹 I/O | OS 스레드 점유 | Carrier Thread 해제 |
| 호환성 | 모든 Java 버전 | Java 21+ |
| Pinning 이슈 | 없음 | synchronized에서 발생 가능 |

### Thread-per-Request vs Event Loop

| 기준 | Thread-per-Request | Event Loop |
|------|-------------------|------------|
| 프로그래밍 모델 | 동기 (직관적) | 비동기 (콜백/Promise) |
| 동시 연결 수 | ~수천 | 수만~수십만 |
| 블로킹 작업 | 가능 | 불가 (별도 처리 필요) |
| CPU 사용률 | 낮음 (대기 많음) | 높음 (효율적) |
| 디버깅 | 쉬움 | 어려움 |
| 생태계 | 성숙 (JDBC, JPA) | 제한적 (R2DBC) |

### Reactive vs Imperative

| 기준 | Reactive | Imperative |
|------|----------|------------|
| 학습 곡선 | 높음 | 낮음 |
| 처리량 | 매우 높음 | 보통 |
| 메모리 효율 | 높음 | 보통 |
| 디버깅 | 어려움 | 쉬움 |
| 에러 처리 | 복잡 (onError) | 간단 (try-catch) |
| DB 접근 | R2DBC (제한적) | JDBC/JPA (성숙) |

## 진화 경로

실무에서는 단계적으로 진화하는 것이 좋습니다.

```
1단계: 단순 멀티스레드
  - Tomcat 기본 설정
  - Spring MVC
  - 검증된 방식, 낮은 리스크

2단계: 스레드 풀 최적화
  - 작업 유형별 스레드 풀 분리
  - @Async로 비동기 처리
  - 모니터링 도구 도입

3단계: Virtual Thread 도입 (Java 21+)
  - I/O 대기가 많은 작업에 적용
  - 기존 코드 그대로 사용
  - Pinning 이슈만 주의

4단계: 아키텍처 레벨 개선
  - 상황에 따라 선택:
    - I/O 집약적: Event Loop (Netty)
    - 스트림 처리: Reactive (WebFlux)
    - 서비스 분리: Message Queue
    - 복잡한 상태: Actor Model (Akka)

5단계: 하이브리드
  - 동기 API (Spring MVC) + 비동기 처리 (Reactive)
  - Thread-per-Request + Event Loop (Netty)
  - 작업 특성에 따라 혼용
```

## 실전 선택 기준

**다음과 같은 경우 OS Thread를 유지하세요**:
- 기존 Spring MVC 애플리케이션이 잘 동작 중
- 트래픽이 크지 않음 (초당 수백 요청 이하)
- 팀이 멀티스레드 프로그래밍에 익숙
- 빠른 개발과 안정성이 중요

**다음과 같은 경우 Virtual Thread를 고려하세요** (Java 21+):
- I/O 대기가 많은 작업 (DB, API 호출)
- 동시 연결 수가 많음 (수천~수만)
- 기존 코드를 크게 바꾸고 싶지 않음
- 메모리 사용량을 줄이고 싶음

**다음과 같은 경우 Reactive를 고려하세요**:
- 매우 높은 처리량 필요 (초당 수만 요청)
- 스트림 데이터 처리
- Backpressure가 중요
- 팀의 학습 의지가 있음

**다음과 같은 경우 Event Loop를 고려하세요**:
- 네트워크 서버 (게임, 채팅)
- 수만 개 이상의 동시 연결
- 낮은 레이턴시가 중요
- 블로킹 작업이 거의 없음

**다음과 같은 경우 Message Queue를 고려하세요**:
- 마이크로서비스 아키텍처
- 서비스 간 느슨한 결합 필요
- 비동기 작업 처리 (이메일, 알림)
- 트래픽 버스트 대응

## 정리

- 프로세스는 독립된 메모리 공간을 가지는 실행 단위입니다
- 스레드는 프로세스 내에서 Stack만 독립적으로 가지고 나머지는 공유합니다
- Tomcat은 멀티스레드 방식으로 요청을 처리합니다
- 공유 자원 접근 시 Race Condition을 주의해야 합니다 (AtomicInteger, synchronized)
- 스레드 풀은 CPU/I/O 바운드 특성에 따라 크기를 조절합니다
- 실무에서는 모니터링 도구로 스레드 상태를 확인하며 튜닝합니다
- **동시성 기술 선택**: OS Thread, Virtual Thread, Coroutine, Reactive 중 상황에 맞게 선택
- **아키텍처 패턴**: Event Loop, Actor Model, SEDA, Message Queue로 스레드 모델 개선
- **진화적 접근**: 단순한 방식에서 시작해서 필요에 따라 고도화
