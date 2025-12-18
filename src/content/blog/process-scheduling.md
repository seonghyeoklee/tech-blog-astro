---
title: '프로세스 스케줄링 - CPU는 어떻게 작업을 분배하는가'
description: 'CPU 스케줄링 알고리즘을 은행 창구, 응급실 비유로 쉽게 이해합니다'
pubDate: 'Dec 15 2024'
tags: ['CS', 'OS']
series: 'operating-system-fundamentals'
seriesOrder: 2
---

예를 들어, API 서버의 응답 시간이 들쑥날쑥한 상황을 생각해봅시다. 같은 요청인데 어떨 때는 50ms, 어떨 때는 500ms가 걸립니다. 로그를 확인해보면 특정 시간대에 요청이 몰리면 모든 요청이 느려지는 패턴이 보입니다. CPU 사용률은 30%밖에 안 되는데 왜 느릴까요? 스레드가 100개인데 20개만 실행되고 나머지는 대기 중인 것입니다. 이게 바로 스케줄링 문제입니다.

## 왜 스케줄링이 필요한가

서버 CPU가 8코어라고 가정하겠습니다. 하지만 Tomcat 스레드는 200개입니다. 8개 코어로 200개 스레드를 어떻게 처리할까요?

운영체제는 각 스레드에 CPU를 아주 짧은 시간(보통 10~100ms)만 할당합니다. 스레드 A에 20ms, 스레드 B에 20ms, 이런 식으로 빠르게 교체합니다. 사람 눈에는 동시에 실행되는 것처럼 보입니다.

```bash
# 실행 중인 스레드 확인 (Linux)
$ ps -eLf | grep java | wc -l
237
```

Spring Boot 애플리케이션을 띄우면 200개가 넘는 스레드가 생성됩니다. HTTP 요청 처리용 스레드, GC 스레드, 비동기 작업 스레드 등등. 이 많은 스레드를 8개 CPU 코어가 어떻게 나눠 쓸까요? 바로 스케줄링입니다.

## 스케줄링 알고리즘

### FCFS (First Come First Served)

은행 창구를 떠올려보세요. 먼저 온 사람부터 순서대로 처리합니다.

```
요청 큐: [A: 10초, B: 1초, C: 1초, D: 1초]

A가 끝날 때까지 B, C, D는 10초 대기
→ 평균 대기 시간: (0 + 10 + 11 + 12) / 4 = 8.25초
```

API 서버로 치면 이런 상황입니다:

```
요청 A: 대용량 파일 업로드 (10초)
요청 B: 간단한 조회 (1초)
요청 C: 간단한 조회 (1초)
요청 D: 간단한 조회 (1초)
```

A가 끝날 때까지 B, C, D는 10초를 기다립니다. 1초면 끝날 요청이 10초 걸리는 겁니다. 이런 현상을 **Convoy Effect**(호송 효과)라고 합니다. 느린 작업 하나가 뒤의 모든 작업을 지연시킵니다.

실무에서 파일 업로드 API가 조회 API를 막는 문제가 발생할 수 있습니다. 해결 방법은 별도 스레드 풀 분리입니다.

```java
@Configuration
public class ThreadPoolConfig {
    @Bean(name = "fileUploadExecutor")
    public Executor fileUploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);   // 파일 업로드용 별도 풀
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        return executor;
    }
}
```

### SJF (Shortest Job First)

응급실을 떠올려보세요. 치료 시간이 짧은 환자를 먼저 처리합니다.

```
요청 큐: [A: 10초, B: 1초, C: 1초, D: 1초]
→ 처리 순서: B → C → D → A

평균 대기 시간: (0 + 1 + 2 + 3) / 4 = 1.5초
```

FCFS보다 훨씬 효율적입니다. 하지만 문제가 있습니다. A는 영원히 실행 안 될 수도 있습니다. 1초짜리 작업이 계속 들어오면 10초짜리 A는 계속 밀립니다. 이게 **Starvation**(기아) 문제입니다.

실제로 운영 중인 서버에서는 SJF를 쓰기 어렵습니다. 요청이 얼마나 걸릴지 미리 알 수 없으니까요. DB 조회 하나도 데이터 양에 따라 10ms~1000ms까지 천차만별입니다.

### Round Robin

놀이기구를 떠올려보세요. 한 번 타면 3분 후 내려와서 다시 줄을 섭니다.

```
요청 큐: [A: 10초, B: 1초, C: 1초]
타임 슬라이스: 2초

1회전: A(2초) → B(1초 완료) → C(1초 완료)
2회전: A(2초)
3회전: A(2초)
4회전: A(2초)
5회전: A(2초 완료)

평균 응답 시간: (10 + 3 + 4) / 3 = 5.67초
```

모든 요청이 공평하게 기회를 얻습니다. A도 최소한 2초마다 한 번씩 실행됩니다. 대부분의 운영체제가 이 방식을 기본으로 사용합니다.

타임 슬라이스를 **퀀텀(Quantum)**이라고 합니다. Linux는 보통 6~100ms입니다. 이 값이 중요합니다.

```bash
# Linux 스케줄러 타임 슬라이스 확인
$ sysctl kernel.sched_latency_ns
kernel.sched_latency_ns = 24000000  # 24ms
```

너무 짧으면 컨텍스트 스위칭 오버헤드가 커지고, 너무 길면 응답성이 나빠집니다.

## 실제 운영체제 스케줄링

실제 운영체제는 훨씬 복잡합니다. 우선순위, CPU 사용 패턴, I/O 대기 등을 모두 고려합니다.

**Linux CFS (Completely Fair Scheduler)**

모든 프로세스가 공평하게 CPU를 사용하도록 보장합니다. 적게 실행된 프로세스에 더 높은 우선순위를 줍니다.

```bash
# 프로세스 우선순위 확인
$ ps -eo pid,ni,comm | grep java
12345   0  java
```

`ni`는 nice 값입니다. -20(highest)~19(lowest) 범위입니다. 값이 낮을수록 우선순위가 높습니다.

### 우선순위 스케줄링

모든 작업이 동등하지는 않습니다.

```java
// Spring Boot 비동기 작업에 우선순위 설정
@Async("highPriorityExecutor")
public void criticalTask() {
    // 중요한 작업 (결제, 주문 등)
}

@Async("lowPriorityExecutor")
public void backgroundTask() {
    // 백그라운드 작업 (로그 정리, 통계 집계 등)
}
```

실무에서는 이렇게 작업 종류별로 스레드 풀을 분리합니다. 중요한 작업이 덜 중요한 작업에 밀리지 않도록요.

## CPU 바운드 vs I/O 바운드

스레드 풀 크기를 정할 때 이 개념이 핵심입니다.

**CPU 바운드 작업**
- CPU 계산이 많은 작업
- 예: 암호화, 이미지 처리, 데이터 집계, 복잡한 알고리즘
- CPU를 계속 사용하고 싶어함

```java
// CPU 바운드 예시
@Service
public class DataProcessor {
    public Statistics calculate(List<Integer> data) {
        // CPU 집약적 계산
        return data.stream()
            .mapToDouble(d -> Math.pow(d, 2))
            .average()
            .orElse(0.0);
    }
}
```

**I/O 바운드 작업**
- 디스크 읽기, 네트워크 요청 등 대기가 많은 작업
- 예: DB 조회, 외부 API 호출, 파일 읽기
- CPU를 조금 쓰다가 I/O 대기

```java
// I/O 바운드 예시
@Service
public class UserService {
    public User getUser(Long id) {
        // DB 조회 - 대부분 I/O 대기 시간
        return userRepository.findById(id);
    }
}
```

운영체제는 I/O 바운드 작업에 약간 더 높은 우선순위를 줍니다. 어차피 금방 I/O 대기 상태로 들어가서 CPU를 반납하기 때문입니다. 전체 시스템 응답성이 좋아집니다.

## 스레드 풀 크기 결정하기

가장 많이 받는 질문입니다. "스레드 풀 크기를 얼마로 해야 하나요?"

**CPU 바운드 작업**
```java
int threadPoolSize = Runtime.getRuntime().availableProcessors() + 1;
// 8코어 서버 → 9개 스레드
```

스레드가 많아봐야 컨텍스트 스위칭만 늘어납니다. CPU는 8개인데 스레드가 100개면 계속 교체만 합니다.

실제 테스트 결과 (암호화 작업):
- 8개 스레드: 평균 100ms
- 50개 스레드: 평균 150ms (컨텍스트 스위칭 오버헤드)
- 100개 스레드: 평균 200ms

**I/O 바운드 작업**
```java
int threadPoolSize = Runtime.getRuntime().availableProcessors() * 2;
// 또는 더 많이 (50~200)
```

DB 조회나 API 호출은 대부분 대기입니다. 스레드가 많아야 CPU를 효율적으로 사용합니다. 한 스레드가 I/O 대기할 때 다른 스레드가 CPU를 쓰면 됩니다.

실제 Tomcat 기본값은 200입니다. 웹 요청은 I/O 바운드이기 때문입니다.

```yaml
# application.yml
server:
  tomcat:
    threads:
      max: 200    # 대부분의 경우 충분
      min-spare: 10
```

### 실무 판단 방법

```java
// 스레드 상태 모니터링
$ jstack <pid> | grep "java.lang.Thread.State"

# RUNNABLE이 많으면 → CPU 바운드
# WAITING이 많으면 → I/O 바운드
```

또는 VisualVM으로 확인:
- CPU 사용률 80% 이상 → CPU 바운드, 스레드 줄이기
- CPU 사용률 30% 이하, 응답 느림 → I/O 바운드, 스레드 늘리기

## 실무 예시

**예시 1: 과도한 스레드로 인한 성능 저하**

초기에 "스레드 많으면 좋겠지"라고 생각해서 500개로 설정하는 경우가 있습니다. 하지만 오히려 응답 시간이 2배 느려질 수 있습니다.

원인: 컨텍스트 스위칭 오버헤드. 8코어에서 500개 스레드를 계속 교체하느라 CPU 시간이 낭비됩니다.

해결 방법:
```yaml
server:
  tomcat:
    threads:
      max: 200  # 500 → 200으로 줄임
```

응답 시간이 200ms → 100ms로 개선될 수 있습니다.

**예시 2: CPU 바운드 작업이 서버 마비시킴**

엑셀 다운로드 기능에서 대용량 데이터를 집계하는 CPU 바운드 작업이 있는 경우를 생각해봅시다. Tomcat 스레드 200개가 모두 이 작업에 묶여서 일반 조회 API도 응답이 안 되는 상황이 발생할 수 있습니다.

해결 방법: CPU 바운드 작업을 별도 스레드 풀로 분리하고 크기 제한.

```java
@Bean(name = "heavyTaskExecutor")
public Executor heavyTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);   // CPU 코어의 절반만
    executor.setMaxPoolSize(4);
    executor.setQueueCapacity(10); // 큐도 제한
    executor.setRejectedExecutionHandler(
        new ThreadPoolExecutor.CallerRunsPolicy()
    );
    return executor;
}
```

일반 API는 정상 작동하면서 무거운 작업만 큐에서 대기하게 할 수 있습니다.

**예시 3: I/O 대기 시간을 고려 안 함**

외부 API 호출이 평균 3초 걸리는데 스레드는 20개뿐인 상황을 생각해봅시다. 동시 요청 100개가 들어오면 80개는 큐에서 대기해야 합니다.

해결 방법: I/O 바운드 작업은 스레드를 넉넉하게 설정.

```yaml
# AS-IS
executor.setMaxPoolSize(20);

# TO-BE
executor.setMaxPoolSize(50);  # I/O 대기 고려
```

## 고급 스케줄링 기법

전통적인 스케줄링 외에도 다양한 고급 기법이 있습니다.

### Multi-Level Feedback Queue (MLFQ)

작업의 특성을 학습해서 우선순위를 동적으로 조정하는 방식입니다.

```
높은 우선순위 큐: [짧고 빠른 작업]  ← 타임 슬라이스 작음 (8ms)
     ↓ (계속 CPU 사용하면 강등)
중간 우선순위 큐: [보통 작업]      ← 타임 슬라이스 보통 (16ms)
     ↓ (계속 CPU 사용하면 강등)
낮은 우선순위 큐: [CPU 집약적]    ← 타임 슬라이스 큼 (32ms)
```

**동작 방식**:
1. 새 작업은 최상위 큐에서 시작
2. CPU를 많이 쓰면 아래 큐로 강등
3. I/O 대기 후 다시 실행되면 상위 큐로 승격
4. 주기적으로 모든 작업을 최상위 큐로 올려서 Starvation 방지

**장점**:
- 작업 특성을 자동 학습
- I/O 바운드 작업에 우선순위 (응답성 좋음)
- CPU 바운드 작업도 공평하게 처리
- Starvation 방지 (Aging)

**단점**:
- 구현 복잡도 높음
- 큐 개수와 타임 슬라이스 조정 필요
- 우선순위 역전 문제 가능

### Work-Stealing (ForkJoinPool)

Java의 ForkJoinPool이 사용하는 방식입니다. 각 스레드가 자신의 작업 큐를 가지고, 일이 없으면 다른 스레드 큐에서 작업을 훔칩니다.

```java
// ForkJoinPool의 Work-Stealing
ForkJoinPool pool = new ForkJoinPool();
RecursiveTask<Long> task = new FibonacciTask(40);
Long result = pool.invoke(task);

class FibonacciTask extends RecursiveTask<Long> {
    private final long n;

    @Override
    protected Long compute() {
        if (n <= 1) return n;

        // 작업을 분할해서 각 스레드 큐에 할당
        FibonacciTask f1 = new FibonacciTask(n - 1);
        FibonacciTask f2 = new FibonacciTask(n - 2);

        f1.fork();  // 다른 스레드가 가져갈 수 있도록 큐에 넣음
        return f2.compute() + f1.join();
    }
}
```

**동작 방식**:
```
Thread 1 큐: [Task A, Task B, Task C]  ← 바쁨
Thread 2 큐: []                        ← 비어있음, 다른 큐에서 훔침
Thread 3 큐: [Task D]                  ← 보통

Thread 2가 Thread 1의 큐에서 Task C를 훔쳐옴 (LIFO에서 FIFO로)
```

**장점**:
- 작업 분산 자동화
- CPU 활용률 높음
- Lock contention 적음 (각자 큐 소유)

**단점**:
- 작업 분할이 필요 (Divide & Conquer)
- 작업 크기가 불균등하면 비효율

### Priority Queue Scheduling

작업마다 우선순위를 부여하는 방식입니다.

```java
// Spring에서 우선순위 스레드 풀
@Configuration
public class PriorityThreadPoolConfig {
    @Bean(name = "priorityExecutor")
    public ThreadPoolTaskExecutor priorityExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadPriority(Thread.MAX_PRIORITY);  // 우선순위 설정
        return executor;
    }
}

// 실시간 작업에 높은 우선순위
@Async("priorityExecutor")
public void criticalPayment() {
    // 결제 처리 - 높은 우선순위
}

// 백그라운드 작업에 낮은 우선순위
@Async("backgroundExecutor")
public void generateReport() {
    // 보고서 생성 - 낮은 우선순위
}
```

**우선순위 역전 문제**:
```
낮은 우선순위 작업 L이 자원 X를 획득
높은 우선순위 작업 H가 자원 X를 필요로 함
→ H는 L이 끝날 때까지 대기 (우선순위가 역전됨)
```

**해결 방법**: Priority Inheritance (우선순위 상속)
- L이 자원 X를 가지고 있는 동안 H의 우선순위를 상속
- L이 빨리 끝나고 자원을 반환하면 원래 우선순위로 복귀

### Real-Time Scheduling

정해진 시간 내에 반드시 실행되어야 하는 작업에 사용합니다.

**EDF (Earliest Deadline First)**:
```
작업 A: 실행 시간 3ms, 마감 시간 10ms
작업 B: 실행 시간 2ms, 마감 시간 5ms
작업 C: 실행 시간 1ms, 마감 시간 3ms

처리 순서: C(마감 3ms) → B(마감 5ms) → A(마감 10ms)
```

**Rate Monotonic Scheduling**:
- 주기가 짧은 작업에 높은 우선순위
- 정적 우선순위 (한 번 정해지면 고정)

```
작업 A: 주기 10ms (높은 우선순위)
작업 B: 주기 20ms (중간 우선순위)
작업 C: 주기 50ms (낮은 우선순위)
```

**실무 예시** (Spring Scheduler):
```java
@Scheduled(fixedRate = 1000)  // 1초마다 실행, 높은 우선순위
public void criticalMonitoring() {
    // 실시간 모니터링
}

@Scheduled(fixedRate = 60000)  // 1분마다 실행, 낮은 우선순위
public void statisticsAggregation() {
    // 통계 집계
}
```

### Gang Scheduling

여러 스레드를 한 그룹으로 묶어서 동시에 스케줄링하는 방식입니다.

```
Group 1: [Thread A1, Thread A2, Thread A3, Thread A4]
Group 2: [Thread B1, Thread B2]

CPU 1    CPU 2    CPU 3    CPU 4
------   ------   ------   ------
 A1       A2       A3       A4     ← 동시에 실행
 B1       B2       idle     idle   ← 동시에 실행
 A1       A2       A3       A4
```

**장점**:
- 스레드 간 동기화 대기 시간 감소
- 병렬 처리 효율 증가

**단점**:
- CPU 낭비 가능 (idle 상태)
- 스케줄링 복잡도 증가

## 아키텍처 레벨의 해결책

스케줄링 문제를 시스템 아키텍처로 해결하는 방법들입니다.

### Container Orchestration (Kubernetes)

컨테이너 레벨에서 리소스를 스케줄링하는 방식입니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-server
spec:
  containers:
  - name: app
    image: my-app:1.0
    resources:
      requests:
        cpu: "500m"      # 0.5 CPU 코어 요청
        memory: "1Gi"
      limits:
        cpu: "1000m"     # 최대 1 CPU 코어
        memory: "2Gi"
    priorityClassName: high-priority  # 우선순위 클래스
```

**Kubernetes Scheduling**:
1. **Filtering**: 조건을 만족하는 노드 찾기 (리소스, affinity)
2. **Scoring**: 각 노드에 점수 부여 (리소스 여유, 분산)
3. **Binding**: 가장 높은 점수의 노드에 Pod 할당

**우선순위 기반 스케줄링**:
```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000      # 높은 값 = 높은 우선순위
globalDefault: false
description: "Critical business workload"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
description: "Background batch jobs"
```

**Preemption** (선점):
- 리소스 부족 시 낮은 우선순위 Pod를 종료하고 높은 우선순위 Pod 실행
- 중요한 서비스가 항상 실행되도록 보장

### NUMA-Aware Scheduling

NUMA (Non-Uniform Memory Access) 아키텍처를 고려한 스케줄링입니다.

```
Node 0: [CPU 0-7, Memory 32GB]  ← 로컬 메모리 접근 빠름
Node 1: [CPU 8-15, Memory 32GB] ← 원격 메모리 접근 느림

스레드를 같은 NUMA 노드의 CPU에 고정하면 성능 향상
```

```bash
# 특정 NUMA 노드에 프로세스 고정
$ numactl --cpunodebind=0 --membind=0 java -jar app.jar

# NUMA 상태 확인
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5 6 7
node 0 size: 32768 MB
node 1 cpus: 8 9 10 11 12 13 14 15
node 1 size: 32768 MB
```

### Distributed Task Scheduling

분산 시스템에서의 작업 스케줄링입니다.

**Apache Spark** (YARN Scheduler):
```scala
// Fair Scheduler - 여러 사용자가 리소스 공평하게 분배
val conf = new SparkConf()
  .set("spark.scheduler.mode", "FAIR")
  .set("spark.scheduler.allocation.file", "fairscheduler.xml")

// 우선순위 풀 설정
sc.setLocalProperty("spark.scheduler.pool", "high-priority")
val result = data.map(x => heavyComputation(x)).collect()

sc.setLocalProperty("spark.scheduler.pool", "low-priority")
val batch = data.map(x => batchProcess(x)).collect()
```

**Hadoop YARN** (Capacity Scheduler):
```xml
<configuration>
  <property>
    <name>yarn.scheduler.capacity.root.queues</name>
    <value>production,development,batch</value>
  </property>

  <property>
    <name>yarn.scheduler.capacity.root.production.capacity</name>
    <value>70</value>  <!-- 프로덕션에 70% 할당 -->
  </property>

  <property>
    <name>yarn.scheduler.capacity.root.development.capacity</name>
    <value>20</value>  <!-- 개발에 20% 할당 -->
  </property>

  <property>
    <name>yarn.scheduler.capacity.root.batch.capacity</name>
    <value>10</value>  <!-- 배치에 10% 할당 -->
  </property>
</configuration>
```

### Message Queue Based Task Distribution

메시지 큐로 작업을 분산하는 방식입니다.

```java
// RabbitMQ Priority Queue
@Configuration
public class RabbitConfig {
    @Bean
    public Queue priorityQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-max-priority", 10);  // 우선순위 0-10
        return new Queue("task.queue", true, false, false, args);
    }
}

// Producer - 우선순위 부여
@Service
public class TaskProducer {
    public void sendHighPriorityTask(Task task) {
        rabbitTemplate.convertAndSend("task.queue", task, message -> {
            message.getMessageProperties().setPriority(10);  // 높은 우선순위
            return message;
        });
    }

    public void sendLowPriorityTask(Task task) {
        rabbitTemplate.convertAndSend("task.queue", task, message -> {
            message.getMessageProperties().setPriority(1);  // 낮은 우선순위
            return message;
        });
    }
}
```

### Cron-based Scheduling (분산 Cron)

여러 서버에서 스케줄 작업을 분산 실행하는 방식입니다.

```java
// Spring Quartz with Cluster
@Configuration
public class QuartzConfig {
    @Bean
    public SchedulerFactoryBean schedulerFactory() {
        SchedulerFactoryBean factory = new SchedulerFactoryBean();

        Properties properties = new Properties();
        properties.setProperty("org.quartz.scheduler.instanceId", "AUTO");
        properties.setProperty("org.quartz.jobStore.isClustered", "true");
        properties.setProperty("org.quartz.jobStore.class",
            "org.quartz.impl.jdbcjobstore.JobStoreTX");

        factory.setQuartzProperties(properties);
        return factory;
    }
}

// 분산 환경에서 중복 실행 방지
@Component
public class ScheduledTasks {
    @Scheduled(cron = "0 0 2 * * ?")  // 매일 새벽 2시
    public void dailyBatchJob() {
        // Quartz 클러스터가 한 서버에서만 실행되도록 보장
    }
}
```

## 스케줄링 기법 비교

### 스케줄링 알고리즘 트레이드오프

| 알고리즘 | 평균 대기 시간 | 응답성 | 공평성 | Starvation | 구현 복잡도 | 주요 용도 |
|---------|--------------|--------|--------|------------|------------|----------|
| FCFS | 나쁨 | 나쁨 | 좋음 | 없음 | 낮음 | 배치 처리 |
| SJF | 좋음 | 좋음 | 나쁨 | 있음 | 중간 | 이론적 |
| Round Robin | 보통 | 좋음 | 좋음 | 없음 | 낮음 | 범용 OS |
| Priority | 보통 | 보통 | 나쁨 | 있음 | 중간 | 실시간 시스템 |
| MLFQ | 좋음 | 좋음 | 좋음 | 없음 (Aging) | 높음 | 현대 OS |
| Work-Stealing | 좋음 | 좋음 | 좋음 | 없음 | 높음 | 병렬 처리 |

### 스레드 풀 vs 메시지 큐

| 기준 | 스레드 풀 | 메시지 큐 |
|------|----------|----------|
| 처리 속도 | 빠름 (메모리 내) | 느림 (네트워크, 디스크) |
| 확장성 | 단일 서버 제한 | 여러 서버로 분산 |
| 안정성 | 서버 죽으면 작업 유실 | 메시지 저장 (영속성) |
| 우선순위 | Java PriorityQueue | RabbitMQ Priority Queue |
| 재시도 | 직접 구현 | DLQ, Requeue 지원 |
| 모니터링 | JMX, 로그 | Queue 깊이, Consumer 수 |

### 동기 vs 비동기 스케줄링

| 기준 | 동기 (Thread-per-Request) | 비동기 (Event Loop) |
|------|--------------------------|---------------------|
| 프로그래밍 모델 | 직관적 | 복잡 (콜백, Promise) |
| 컨텍스트 스위칭 | 많음 | 적음 |
| 동시 처리 수 | ~수천 | 수만~수십만 |
| 메모리 사용 | 높음 (스레드당 1MB) | 낮음 |
| 블로킹 작업 | 가능 | 불가 (Worker Pool 필요) |

## 진화 경로

실무에서는 단계적으로 진화하는 것이 좋습니다.

```
1단계: 단순 스레드 풀
  - Tomcat 기본 설정
  - 단일 스레드 풀
  - 모니터링 없음

2단계: 작업 분리
  - CPU 바운드 vs I/O 바운드 분리
  - 중요도별 스레드 풀 분리
  - 기본 모니터링 도입 (JMX)

3단계: 우선순위 도입
  - Priority Queue 사용
  - 실시간 작업 우선 처리
  - ThreadPoolExecutor 커스터마이징

4단계: 고급 스케줄링
  - Work-Stealing (ForkJoinPool)
  - MLFQ 패턴 적용
  - NUMA-aware 배치

5단계: 분산 스케줄링
  - 메시지 큐 도입 (RabbitMQ, Kafka)
  - 컨테이너 오케스트레이션 (Kubernetes)
  - 분산 작업 스케줄러 (Quartz Cluster, Airflow)
```

## 실전 선택 기준

**다음과 같은 경우 단순 스레드 풀을 유지하세요**:
- 단일 서버, 트래픽 적음
- 작업 특성이 비슷함
- 빠른 개발과 안정성 중요

**다음과 같은 경우 작업별 스레드 풀 분리를 고려하세요**:
- CPU 바운드와 I/O 바운드 혼재
- 중요한 작업과 배경 작업 구분 필요
- Convoy Effect 발생

**다음과 같은 경우 우선순위 스케줄링을 고려하세요**:
- 실시간 처리 요구사항
- SLA가 다른 작업 혼재
- 리소스 부족 시 중요 작업 우선

**다음과 같은 경우 메시지 큐를 고려하세요**:
- 마이크로서비스 아키텍처
- 작업 영속성 필요
- 서버 확장성 필요
- 재시도 및 DLQ 필요

**다음과 같은 경우 컨테이너 오케스트레이션을 고려하세요**:
- 여러 서비스 운영
- 자동 스케일링 필요
- 리소스 할당 자동화
- 장애 복구 자동화

## 정리

- CPU 스케줄링은 제한된 CPU를 여러 스레드에 분배하는 방법입니다
- FCFS는 단순하지만 Convoy Effect로 평균 대기 시간이 깁니다
- SJF는 효율적이지만 긴 작업이 Starvation될 수 있습니다
- Round Robin은 공평하고 응답성이 좋아서 가장 많이 씁니다
- CPU 바운드는 스레드를 적게 (코어 수 정도), I/O 바운드는 많게 (수십~수백 개)
- 실무에서는 작업 종류별로 스레드 풀을 분리하고 모니터링하며 튜닝합니다
- VisualVM으로 스레드 상태를 확인하면 CPU/I/O 바운드를 판단할 수 있습니다
- **고급 기법**: MLFQ, Work-Stealing, Priority Queue, Real-Time Scheduling으로 효율 개선
- **아키텍처 해결책**: Kubernetes, 메시지 큐, 분산 스케줄러로 확장성과 안정성 확보
- **진화적 접근**: 단순 스레드 풀에서 시작해서 필요에 따라 분산 스케줄링으로 발전
