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

## 고급 JVM 메모리 최적화 기법

JVM은 메모리 사용을 최적화하는 다양한 기법을 제공합니다.

### Compressed OOPs (Ordinary Object Pointers)

64비트 JVM에서 객체 참조를 32비트로 압축하여 메모리를 절약하는 기법입니다.

```bash
# Java 8+ 기본 활성화 (힙 < 32GB)
java -XX:+UseCompressedOops -jar app.jar

# 확인
java -XX:+PrintFlagsFinal -version | grep UseCompressedOops
```

**동작 방식**:
```
64-bit 참조: 8 bytes
32-bit 압축: 4 bytes → 50% 메모리 절약

최대 주소 공간: 2^32 × 8 bytes = 32GB
(8 bytes align 가정)
```

**장점**:
- 힙 메모리 사용량 20-30% 감소
- CPU 캐시 효율 증가
- GC 성능 향상

**단점**:
- 힙 크기 32GB 제한
- 압축/해제 CPU 오버헤드 (미미함)

### String Deduplication

중복된 String 객체를 제거하여 메모리를 절약하는 기법입니다.

```bash
# G1 GC에서만 지원
java -XX:+UseG1GC \
     -XX:+UseStringDeduplication \
     -XX:StringDeduplicationAgeThreshold=3 \
     -jar app.jar
```

**동작 방식**:
```java
String s1 = new String("hello");
String s2 = new String("hello");
// 두 개의 별도 char[] 배열 존재

// String Deduplication 적용 후
// s1과 s2가 같은 char[] 배열 공유
// → 메모리 절약
```

**장점**:
- 중복 문자열 많은 애플리케이션에서 메모리 절약 (최대 50%)
- GC 부담 감소

**단점**:
- Minor GC 시간 약간 증가
- G1 GC만 지원

### Class Data Sharing (CDS/AppCDS)

여러 JVM 인스턴스가 클래스 메타데이터를 공유하여 메모리와 시작 시간을 절약하는 기법입니다.

```bash
# 1. 클래스 목록 생성
java -Xshare:off -XX:DumpLoadedClassList=classes.lst -jar app.jar

# 2. Shared archive 생성
java -Xshare:dump -XX:SharedClassListFile=classes.lst \
     -XX:SharedArchiveFile=app-cds.jsa -jar app.jar

# 3. 사용
java -Xshare:on -XX:SharedArchiveFile=app-cds.jsa -jar app.jar
```

**장점**:
- 시작 시간 20-40% 감소
- 메모리 사용량 감소 (여러 JVM 실행 시)
- Metaspace 사용량 감소

**단점**:
- 초기 설정 필요
- 클래스 변경 시 재생성 필요

**실무 활용**:
- 마이크로서비스 (동일 앱 여러 인스턴스)
- 컨테이너 환경

### Ergonomics (Auto-Tuning)

JVM이 시스템 리소스를 감지하여 자동으로 메모리와 GC를 조정하는 기능입니다.

```bash
# Server VM - Ergonomics 활성화 (기본)
java -jar app.jar

# 자동 설정 내용 확인
java -XX:+PrintFlagsFinal -version | grep -i ergonomic
```

**자동 설정 예**:
```
Server-Class Machine (2+ CPU, 2GB+ RAM):
- Heap: Physical Memory / 4 (최대 32GB)
- GC: G1 GC (Java 9+)
- Thread Pool: CPU 코어 수에 비례
```

**명시적 설정 vs Ergonomics**:
```bash
# Ergonomics (자동)
java -jar app.jar

# 명시적 설정 (권장 - 운영 환경)
java -Xms4g -Xmx4g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -jar app.jar
```

### GC 튜닝 파라미터

GC 동작을 세밀하게 조정하는 옵션들입니다.

**G1 GC 튜닝**:
```bash
java -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \        # 목표 pause time
     -XX:G1HeapRegionSize=16m \         # Region 크기
     -XX:InitiatingHeapOccupancyPercent=45 \  # GC 시작 힙 사용률
     -XX:G1ReservePercent=10 \          # 예비 공간
     -jar app.jar
```

**Young Generation 비율**:
```bash
# 전통적 방식 (G1은 자동 조정)
java -XX:NewRatio=2 \     # Old : Young = 2:1
     -XX:SurvivorRatio=8 \ # Eden : Survivor = 8:1
     -jar app.jar
```

**GC 스레드 수**:
```bash
java -XX:ParallelGCThreads=8 \      # Parallel GC 스레드
     -XX:ConcGCThreads=2 \          # Concurrent GC 스레드
     -jar app.jar
```

## 아키텍처 레벨의 해결책

JVM 메모리 문제를 시스템 아키텍처로 해결하는 방법들입니다.

### Container-Aware JVM Settings

컨테이너 환경에서 메모리를 효율적으로 사용하는 설정입니다.

```yaml
# Docker Compose
services:
  app:
    image: my-app:1.0
    environment:
      JAVA_OPTS: >
        -XX:+UseContainerSupport
        -XX:MaxRAMPercentage=75.0
        -XX:InitialRAMPercentage=50.0
        -XX:MinRAMPercentage=25.0
    mem_limit: 2g
    mem_reservation: 1g
```

**Kubernetes Pod**:
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: my-app:1.0
    env:
    - name: JAVA_OPTS
      value: >
        -XX:+UseContainerSupport
        -XX:MaxRAMPercentage=75.0
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "2Gi"
```

**Container-Aware 설정 효과**:
```
기존: -Xmx2g (고정)
Container-Aware: -XX:MaxRAMPercentage=75.0
  → Container 메모리 제한의 75%를 힙으로 사용
  → 동적 조정 가능
```

### JVM Memory Pool 분리 전략

메모리 풀을 용도별로 분리하여 관리하는 전략입니다.

```java
// 캐시용 별도 힙 (Off-Heap)
@Configuration
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        EhcacheCachingProvider provider = (EhcacheCachingProvider)
            Caching.getCachingProvider();

        CacheConfiguration<String, User> config =
            CacheConfigurationBuilder
                .newCacheConfigurationBuilder(String.class, User.class,
                    ResourcePoolsBuilder.newResourcePoolsBuilder()
                        .offheap(100, MemoryUnit.MB))  // Off-Heap 사용
                .build();

        return new EhcacheCacheManager(
            provider.getCacheManager(getClass().getResource("/ehcache.xml").toURI(),
                config));
    }
}
```

**메모리 풀 분리 예**:
```
JVM Heap (4GB):
  - Application Objects (3GB)

Off-Heap (2GB):
  - Ehcache (1GB)
  - Netty Direct Buffer (512MB)
  - Other (512MB)

Total: 6GB (Heap + Off-Heap)
```

### Multi-JVM Architecture

여러 JVM을 실행하여 메모리와 장애를 격리하는 아키텍처입니다.

```yaml
# 단일 JVM - 모놀리식
services:
  monolith:
    image: my-app:1.0
    environment:
      JAVA_OPTS: -Xmx8g
    # 문제: 한 기능 OOM → 전체 중단

# Multi-JVM - 마이크로서비스
services:
  user-service:
    image: user-service:1.0
    environment:
      JAVA_OPTS: -Xmx2g
  order-service:
    image: order-service:1.0
    environment:
      JAVA_OPTS: -Xmx2g
  payment-service:
    image: payment-service:1.0
    environment:
      JAVA_OPTS: -Xmx2g
  # 장점: 장애 격리, 독립 스케일링
```

**JVM 분리 전략**:
- **기능별**: User, Order, Payment 서비스
- **부하별**: Read-heavy, Write-heavy 분리
- **중요도별**: Critical, Normal, Batch 분리

### JVM Monitoring & Profiling Architecture

프로덕션 JVM을 모니터링하는 아키텍처입니다.

```yaml
# Prometheus + Grafana + JMX Exporter
services:
  app:
    image: my-app:1.0
    environment:
      JAVA_OPTS: >
        -Dcom.sun.management.jmxremote
        -Dcom.sun.management.jmxremote.port=9010
        -Dcom.sun.management.jmxremote.authenticate=false
        -javaagent:/opt/jmx_prometheus_javaagent.jar=9011:/opt/config.yaml

  prometheus:
    image: prom/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana
```

**모니터링 메트릭**:
- Heap 사용량 (Used/Committed/Max)
- GC 횟수 및 시간
- Thread 수
- Metaspace 사용량
- CPU 사용률

## JVM 메모리 영역 비교

### 메모리 영역별 특성

| 영역 | 크기 | 공유 | GC | 설정 옵션 | OOM 원인 |
|------|------|------|-----|----------|----------|
| Heap | GB 단위 | 모든 스레드 | Yes | -Xms, -Xmx | 객체 누수 |
| Stack | 512KB-1MB/스레드 | 스레드별 독립 | No | -Xss | 깊은 재귀 |
| Metaspace | 수십 MB | 모든 스레드 | Yes (Full GC) | -XX:MaxMetaspaceSize | 클래스 누수 |
| Code Cache | 수십 MB | 모든 스레드 | No | -XX:ReservedCodeCacheSize | JIT 컴파일 과다 |
| Direct Memory | 가변 | 스레드 간 공유 | No | -XX:MaxDirectMemorySize | ByteBuffer 누수 |

### GC 알고리즘 비교

| GC | Pause Time | Throughput | Heap Size | CPU | 주요 용도 |
|-----|-----------|------------|-----------|-----|----------|
| Serial | 김 (100ms+) | 낮음 | < 100MB | 단일 코어 | 개발, 테스트 |
| Parallel | 중간 (50-100ms) | 높음 | < 4GB | 멀티 코어 | 배치, 처리량 중시 |
| G1 | 짧음 (10-50ms) | 중간 | > 4GB | 멀티 코어 | 일반 서버 (균형) |
| ZGC | 매우 짧음 (<10ms) | 중간 | > 8GB | 멀티 코어 | 낮은 지연, 대용량 |
| Shenandoah | 매우 짧음 (<10ms) | 중간 | > 8GB | 멀티 코어 | 낮은 지연 |

### 최적화 기법 트레이드오프

| 기법 | 메모리 절약 | 성능 | 적용 난이도 | 호환성 | 주요 사용처 |
|------|-----------|------|-----------|--------|----------|
| Compressed OOPs | 20-30% | 높음 | 낮음 (자동) | Heap < 32GB | 일반 |
| String Dedup | 10-50% | 중간 | 낮음 | G1 only | 문자열 많음 |
| CDS/AppCDS | 중간 | 매우 높음 (시작) | 중간 | Java 10+ | 마이크로서비스 |
| Off-Heap | 높음 | 높음 (GC 없음) | 높음 | 전체 | 캐시, I/O |
| Container-Aware | 가변 | 높음 | 낮음 | Java 10+ | Kubernetes |

## 진화 경로

실무에서는 단계적으로 JVM 메모리를 최적화하는 것이 좋습니다.

```
1단계: 기본 설정
  - JVM 기본값 사용
  - G1 GC (Java 9+)
  - 모니터링 도구 도입 (JConsole, VisualVM)

2단계: 메모리 크기 조정
  - -Xms = -Xmx (고정 크기)
  - 컨테이너 메모리 고려
  - GC 로그 분석

3단계: GC 튜닝
  - MaxGCPauseMillis 조정
  - Young/Old 비율 최적화
  - GC 스레드 수 조정

4단계: 고급 최적화
  - String Deduplication
  - CDS/AppCDS (마이크로서비스)
  - Off-Heap 메모리 (캐시)

5단계: 아키텍처 개선
  - JVM 분리 (마이크로서비스)
  - Container-Aware 설정
  - 분산 모니터링 (Prometheus, Grafana)
```

## 실전 선택 기준

**다음과 같은 경우 기본 G1 GC를 유지하세요**:
- 일반 웹 애플리케이션
- 힙 크기 4-32GB
- Pause time 100ms 이하 허용
- 균형잡힌 성능 필요

**다음과 같은 경우 ZGC를 고려하세요**:
- 매우 낮은 지연 필요 (<10ms)
- 대용량 힙 (> 8GB)
- Java 15+
- 실시간성 중요

**다음과 같은 경우 Parallel GC를 고려하세요**:
- 배치 작업
- 처리량 최우선
- Pause time 덜 중요
- CPU 코어 충분

**다음과 같은 경우 Container-Aware를 적용하세요**:
- Kubernetes/Docker 환경
- 동적 리소스 할당
- Java 10+
- 마이크로서비스

**다음과 같은 경우 Off-Heap을 고려하세요**:
- 대용량 캐시
- GC pause 민감
- I/O 집약적
- 메모리 예측 가능

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- Heap은 객체가 저장되는 곳이고, Young/Old Generation으로 나뉩니다
- Stack은 스레드별로 존재하며 지역 변수와 참조를 저장합니다
- Metaspace는 클래스 정보와 static 변수를 저장합니다
- GC는 참조되지 않는 객체의 메모리를 회수합니다
- **고급 기법**: Compressed OOPs, String Dedup, CDS/AppCDS, GC 튜닝으로 메모리 최적화
- **아키텍처 해결책**: Container-Aware 설정, Multi-JVM, Off-Heap 메모리, 모니터링
- **진화적 접근**: 기본 설정에서 시작해서 측정 기반으로 점진적 최적화

다음 글에서는 Garbage Collection의 동작 원리를 더 자세히 다루겠습니다.
