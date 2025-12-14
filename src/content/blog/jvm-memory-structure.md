---
title: 'JVM 메모리 구조 - Java 심화'
description: 'Heap, Stack, Metaspace 등 JVM 메모리 영역과 GC의 동작 원리를 정리했습니다'
pubDate: 'Dec 12 2024'
tags: ['Java', 'CS']
series: 'java-fundamentals'
seriesOrder: 1
---

Spring Boot 애플리케이션을 운영하다 보면 OutOfMemoryError를 만날 때가 있습니다. "java.lang.OutOfMemoryError: Java heap space", "Metaspace" 같은 에러를 보면 JVM 메모리 구조를 알아야 원인을 파악할 수 있습니다.

## JVM 메모리 영역

JVM은 메모리를 여러 영역으로 나눠서 관리합니다.

```
┌─────────────────────────────────────────────────────┐
│                    JVM Memory                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Method Area (Metaspace)         │   │
│  │     클래스 정보, static 변수, 상수 풀         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                    Heap                      │   │
│  │              객체 인스턴스 저장               │   │
│  │  ┌─────────────┬─────────────────────────┐  │   │
│  │  │   Young     │          Old            │  │   │
│  │  │  (Eden,S0,S1)│                         │  │   │
│  │  └─────────────┴─────────────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  Stack    │  │  Stack    │  │  Stack    │ ...   │
│  │ (Thread1) │  │ (Thread2) │  │ (Thread3) │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Native Method Stack             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                PC Register                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Heap 영역

`new` 키워드로 생성한 객체는 모두 Heap에 저장됩니다.

```java
User user = new User("kim");  // User 객체는 Heap에 저장
List<Order> orders = new ArrayList<>();  // ArrayList도 Heap에
```

Heap은 다시 Young Generation과 Old Generation으로 나뉩니다.

### Young Generation

새로 생성된 객체가 저장되는 영역입니다.

```
┌────────────────────────────────────────┐
│           Young Generation              │
├──────────────┬──────────┬──────────────┤
│     Eden     │    S0    │     S1       │
│              │(Survivor)│ (Survivor)   │
└──────────────┴──────────┴──────────────┘
```

1. 객체가 생성되면 Eden에 들어갑니다
2. Eden이 가득 차면 Minor GC가 발생합니다
3. 살아남은 객체는 Survivor 영역으로 이동합니다
4. 여러 번 살아남으면 Old Generation으로 이동합니다 (Promotion)

대부분의 객체는 금방 사라집니다. HTTP 요청을 처리하면서 생성한 DTO, 임시 변수 등은 요청이 끝나면 참조가 사라집니다.

### Old Generation

오래 살아남은 객체가 저장되는 영역입니다. 여기서 발생하는 GC를 Major GC(또는 Full GC)라고 합니다.

```java
@Service
public class UserService {  // 싱글톤 빈은 애플리케이션 종료까지 유지
    private final UserRepository userRepository;  // 마찬가지
}
```

Spring Bean처럼 애플리케이션 생명주기 동안 유지되는 객체는 Old Generation에 있습니다.

## Stack 영역

메서드 호출 시 생성되는 지역 변수와 매개변수가 저장됩니다. 각 스레드마다 별도의 Stack을 가집니다.

```java
public void processOrder(Order order) {  // order 참조는 Stack에
    int quantity = order.getQuantity();   // quantity는 Stack에
    BigDecimal price = calculatePrice(order);  // price 참조는 Stack에
}                                          // 메서드 종료 시 Stack에서 제거
```

주의할 점: Stack에는 **참조값**만 저장됩니다. 실제 객체는 Heap에 있습니다.

```
Stack                     Heap
┌─────────────┐          ┌─────────────┐
│ order: 0x100│ ───────> │ Order 객체  │
│ price: 0x200│ ───────> │ BigDecimal  │
└─────────────┘          └─────────────┘
```

### StackOverflowError

재귀 호출이 너무 깊으면 Stack이 가득 차서 StackOverflowError가 발생합니다.

```java
// 무한 재귀 - StackOverflowError 발생
public int factorial(int n) {
    return n * factorial(n - 1);  // 종료 조건 없음
}
```

Stack 크기는 `-Xss` 옵션으로 조절할 수 있습니다. 기본값은 보통 512KB ~ 1MB입니다.

## Method Area (Metaspace)

클래스 정보, 메서드 정보, static 변수, 상수 풀이 저장됩니다.

```java
public class User {
    private static final String PREFIX = "USER_";  // Metaspace
    private String name;  // 인스턴스 변수는 Heap
}
```

Java 8 이전에는 PermGen이라고 불렀습니다. Java 8부터 Metaspace로 변경되었고, Native Memory를 사용합니다.

### Metaspace OOM

클래스를 동적으로 많이 생성하면 Metaspace가 부족해질 수 있습니다.

```
java.lang.OutOfMemoryError: Metaspace
```

흔한 원인:
- 리플렉션으로 클래스를 계속 생성하는 경우
- 클래스 로더 메모리 누수
- 많은 라이브러리 사용

`-XX:MaxMetaspaceSize` 옵션으로 제한할 수 있습니다.

## Garbage Collection

GC는 더 이상 참조되지 않는 객체를 찾아서 메모리를 회수합니다.

### GC 대상 판단

객체에 대한 참조가 없으면 GC 대상이 됩니다.

```java
public void process() {
    User user = new User("kim");  // user가 User 객체를 참조
    user = null;                   // 참조 해제 → GC 대상
}
// 메서드 종료 → user 변수 사라짐 → User 객체 GC 대상
```

### GC 종류

| GC | 특징 | 사용 사례 |
|-----|------|----------|
| Serial GC | 단일 스레드, Stop-the-World 김 | 개발 환경, 작은 힙 |
| Parallel GC | 멀티 스레드, 처리량 우선 | Java 8 기본 |
| G1 GC | 큰 힙에서 효율적, 예측 가능한 일시 정지 | Java 9+ 기본 |
| ZGC | 매우 짧은 일시 정지 (< 10ms) | 대용량 힙, 낮은 지연 필요 시 |

Spring Boot 애플리케이션은 보통 G1 GC를 사용합니다. Java 11 이상에서는 기본값입니다.

### Stop-the-World

GC가 실행되는 동안 애플리케이션 스레드가 멈춥니다. 이 시간이 길면 응답 지연이 발생합니다.

```
애플리케이션 실행 ────────│ STW │──────── 애플리케이션 실행
                         GC 실행
```

GC 튜닝의 목표는 Stop-the-World 시간을 최소화하는 것입니다.

## JVM 옵션

자주 사용하는 메모리 관련 옵션입니다.

```bash
java -Xms512m \       # 초기 힙 크기
     -Xmx2g \         # 최대 힙 크기
     -XX:MetaspaceSize=256m \    # 초기 Metaspace 크기
     -XX:MaxMetaspaceSize=512m \ # 최대 Metaspace 크기
     -Xss512k \       # 스레드당 Stack 크기
     -jar app.jar
```

운영 환경에서는 Xms와 Xmx를 같은 값으로 설정하는 것이 일반적입니다. 힙 크기 변경에 따른 오버헤드를 피할 수 있습니다.

## 메모리 문제 진단

### Heap Dump

OutOfMemoryError가 발생하면 Heap Dump를 분석합니다.

```bash
# OOM 발생 시 자동으로 힙 덤프 생성
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/var/log/heapdump.hprof \
     -jar app.jar
```

Eclipse MAT이나 VisualVM으로 분석할 수 있습니다.

### GC 로그

GC 동작을 확인하려면 GC 로그를 활성화합니다.

```bash
java -Xlog:gc*:file=gc.log:time,level,tags \
     -jar app.jar
```

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- Heap은 객체가 저장되는 곳이고, Young/Old Generation으로 나뉩니다
- Stack은 스레드별로 존재하며 지역 변수와 참조를 저장합니다
- Metaspace는 클래스 정보와 static 변수를 저장합니다
- GC는 참조되지 않는 객체의 메모리를 회수합니다

다음 글에서는 Garbage Collection의 동작 원리를 더 자세히 다루겠습니다.
