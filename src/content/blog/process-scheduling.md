---
title: '프로세스 스케줄링 - CPU는 어떻게 작업을 분배하는가'
description: 'CPU 스케줄링 알고리즘을 은행 창구, 응급실 비유로 쉽게 이해합니다'
pubDate: 'Dec 15 2024'
tags: ['CS', 'OS']
series: 'backend-cs-fundamentals'
seriesOrder: 2
---

API 서버의 응답 시간이 들쑥날쑥했습니다. 같은 요청인데 어떨 때는 50ms, 어떨 때는 500ms였습니다. 로그를 확인해보니 특정 시간대에 요청이 몰리면 모든 요청이 느려졌습니다. CPU 사용률은 30%밖에 안 되는데 왜 느릴까요? 스레드가 100개인데 20개만 실행되고 나머지는 대기 중이었습니다. 이게 바로 스케줄링 문제였습니다.

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

실제로 파일 업로드 API가 조회 API를 막는 문제를 겪었습니다. 해결책은 별도 스레드 풀 분리였습니다.

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

## 실무에서 마주친 문제

**문제 1: 과도한 스레드로 인한 성능 저하**

초기에 "스레드 많으면 좋겠지"라고 생각해서 500개로 설정했습니다. 오히려 응답 시간이 2배 느려졌습니다.

원인: 컨텍스트 스위칭 오버헤드. 8코어에서 500개 스레드를 계속 교체하느라 CPU 시간이 낭비됐습니다.

해결:
```yaml
server:
  tomcat:
    threads:
      max: 200  # 500 → 200으로 줄임
```

응답 시간이 200ms → 100ms로 개선됐습니다.

**문제 2: CPU 바운드 작업이 서버 마비시킴**

엑셀 다운로드 기능에서 대용량 데이터를 집계하는 CPU 바운드 작업이 있었습니다. Tomcat 스레드 200개가 모두 이 작업에 묶여서 일반 조회 API도 응답이 안 됐습니다.

해결: CPU 바운드 작업을 별도 스레드 풀로 분리하고 크기 제한.

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

일반 API는 정상 작동하면서 무거운 작업만 큐에서 대기하게 됐습니다.

**문제 3: I/O 대기 시간을 고려 안 함**

외부 API 호출이 평균 3초 걸리는데 스레드는 20개뿐이었습니다. 동시 요청 100개가 들어오면 80개는 큐에서 대기해야 합니다.

해결: I/O 바운드 작업은 스레드를 넉넉하게.

```yaml
# AS-IS
executor.setMaxPoolSize(20);

# TO-BE
executor.setMaxPoolSize(50);  # I/O 대기 고려
```

## 정리

- CPU 스케줄링은 제한된 CPU를 여러 스레드에 분배하는 방법입니다
- FCFS는 단순하지만 Convoy Effect로 평균 대기 시간이 깁니다
- SJF는 효율적이지만 긴 작업이 Starvation될 수 있습니다
- Round Robin은 공평하고 응답성이 좋아서 가장 많이 씁니다
- CPU 바운드는 스레드를 적게 (코어 수 정도), I/O 바운드는 많게 (수십~수백 개)
- 실무에서는 작업 종류별로 스레드 풀을 분리하고 모니터링하며 튜닝합니다
- VisualVM으로 스레드 상태를 확인하면 CPU/I/O 바운드를 판단할 수 있습니다
