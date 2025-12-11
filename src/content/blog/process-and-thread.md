---
title: '프로세스와 스레드 - 운영체제 기초'
description: '프로세스와 스레드의 차이, 메모리 구조, 멀티스레딩의 장단점을 정리했습니다'
pubDate: 'Jan 05 2025'
tags: ['CS', 'OS']
series: 'backend-cs-fundamentals'
seriesOrder: 1
---

신입 때 처음 맡은 API 서버가 트래픽이 몰리면 응답이 느려지는 문제가 있었습니다. 선배가 "스레드 풀 크기 늘려봐"라고 했는데, 왜 그래야 하는지 몰랐습니다. 무작정 200개에서 500개로 올렸더니 오히려 더 느려졌습니다. 그때 깨달았습니다. 프로세스와 스레드를 제대로 이해하지 못하면 실무에서 문제를 해결할 수 없다는 것을요.

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

이런 상황을 **Race Condition**이라고 합니다. 실제로 프로덕션에서 방문자 수가 제대로 안 올라가는 버그를 겪었는데, 이게 원인이었습니다.

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

실제 경험으로는:
- **Tomcat 기본값 200**: 일반적인 웹 애플리케이션에 적당합니다
- **DB 커넥션 풀 기본값 10**: HikariCP 기본값. DB 서버 부하를 고려한 값입니다
- **비동기 작업 풀**: CPU 바운드면 코어 수, I/O 바운드면 20~50

실무 팁: VisualVM이나 JConsole로 스레드 상태를 모니터링하세요. `RUNNABLE` 상태가 많으면 CPU 바운드, `WAITING`이 많으면 I/O 바운드입니다.

## 실무에서 마주친 문제

**문제 1: 스레드 고갈**

서비스가 느려져서 확인해보니 Tomcat 스레드 200개가 모두 `WAITING` 상태였습니다. 외부 API 호출이 느려서 스레드가 대기 중이었던 겁니다.

해결: 외부 API 호출을 별도 스레드 풀로 분리하고 타임아웃 설정.

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

**문제 2: 과도한 스레드 생성**

모니터링 툴에서 스레드가 500개까지 치솟는 것을 발견했습니다. 스레드 풀 설정을 제대로 안 해서 작업마다 새 스레드를 생성하고 있었습니다.

해결: `@Async` 사용 시 반드시 커스텀 Executor 지정.

```java
@Async("taskExecutor")  // 기본 Executor 대신 커스텀 사용
public void processHeavyTask() { }
```

## 정리

- 프로세스는 독립된 메모리 공간을 가지는 실행 단위입니다
- 스레드는 프로세스 내에서 Stack만 독립적으로 가지고 나머지는 공유합니다
- Tomcat은 멀티스레드 방식으로 요청을 처리합니다
- 공유 자원 접근 시 Race Condition을 주의해야 합니다 (AtomicInteger, synchronized)
- 스레드 풀은 CPU/I/O 바운드 특성에 따라 크기를 조절합니다
- 실무에서는 모니터링 도구로 스레드 상태를 확인하며 튜닝합니다
