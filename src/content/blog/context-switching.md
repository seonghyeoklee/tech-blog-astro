---
title: '컨텍스트 스위칭 - 프로세스 전환의 비용'
description: '컨텍스트 스위칭이 무엇이고 왜 비용이 발생하는지 정리했습니다'
pubDate: 'Jan 08 2025'
tags: ['CS', 'OS']
series: 'backend-cs-fundamentals'
seriesOrder: 3
---

스레드 풀 크기를 500개로 설정했더니 서버 응답 시간이 2배 느려진 적이 있습니다. CPU 사용률을 확인해보니 30%는 실제 작업, 70%는 스레드 간 전환에 소모되고 있었습니다. 이게 컨텍스트 스위칭 오버헤드입니다. 스레드를 200개로 줄이자 응답 시간이 절반으로 줄었습니다.

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

## 실무에서 겪은 컨텍스트 스위칭 문제

**문제 1: 과도한 스레드로 CPU 낭비**

```yaml
# 문제가 있던 설정
server:
  tomcat:
    threads:
      max: 500  # 너무 많음
```

8코어 서버에 500개 스레드를 띄웠더니:
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

해결: 스레드 수를 200개로 줄임 → 응답 시간 100ms, 컨텍스트 스위칭 20,000회로 감소.

**문제 2: CPU 바운드 작업의 스레드 낭비**

대용량 Excel 생성 기능에서 CPU 집약적 계산이 많았습니다. 스레드를 100개 할당했더니 오히려 느렸습니다.

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

8코어에 100개 스레드 → 계속 전환하면서 캐시 미스 발생.

해결: CPU 바운드 작업은 코어 수에 맞춤.

```java
executor.setMaxPoolSize(8);  // CPU 코어 수
```

처리 시간: 10초 → 5초로 개선.

**문제 3: I/O 바운드 vs CPU 바운드 혼재**

일반 API는 I/O 바운드인데, 일부 무거운 작업이 CPU 바운드였습니다. 같은 스레드 풀을 쓰니까 무거운 작업이 Tomcat 스레드를 독점했습니다.

해결: 작업 종류별로 스레드 풀 분리.

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

## 정리

- 컨텍스트 스위칭은 CPU가 스레드를 전환할 때 발생하는 오버헤드입니다
- 직접 비용보다 캐시 무효화로 인한 간접 비용이 훨씬 큽니다 (200배 차이)
- 스레드 전환이 프로세스 전환보다 10배 가볍습니다
- CPU 바운드 작업은 스레드를 코어 수에 맞춰야 합니다
- I/O 바운드 작업은 스레드가 많아도 괜찮습니다 (대기 시간 활용)
- vmstat으로 컨텍스트 스위칭 횟수를 모니터링하세요
- 실무에서는 작업 특성에 맞춰 스레드 풀을 분리하는 게 중요합니다
