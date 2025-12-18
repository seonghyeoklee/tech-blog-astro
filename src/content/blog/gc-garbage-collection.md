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

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- GC는 Mark and Sweep 방식으로 도달 불가능한 객체를 제거합니다
- Young/Old Generation으로 나눠서 효율적으로 관리합니다
- Minor GC는 빠르고 자주, Major GC는 느리고 가끔 발생합니다
- G1 GC는 큰 힙에서 예측 가능한 일시 정지 시간을 제공합니다
- Stop-the-World 시간을 줄이는 것이 GC 튜닝의 목표입니다

GC 문제가 발생하면 먼저 GC 로그와 Heap Dump를 분석하세요. 성급한 튜닝보다 정확한 원인 파악이 중요합니다.
