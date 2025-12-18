---
title: '스택과 힙 - 메모리 구조 이해하기'
description: '스택과 힙의 차이, 메모리 할당 방식, 그리고 왜 중요한지 정리했습니다'
pubDate: 'Jan 12 2025'
tags: ['CS', 'OS', 'Java']
series: 'operating-system-fundamentals'
seriesOrder: 4
---

프로덕션에서 `OutOfMemoryError: Java heap space`가 발생하는 경우가 있습니다. 힙 크기를 늘리면 당장은 해결되지만, 근본 원인을 파악하지 못하면 같은 문제가 반복됩니다. 메모리 누수가 원인인 경우가 많습니다. 스택과 힙을 제대로 이해하면 이런 문제를 더 빨리 해결할 수 있습니다.

## 메모리 영역 구분

Java 애플리케이션을 실행하면 JVM이 운영체제로부터 메모리를 할당받습니다. 이 메모리는 용도별로 나뉩니다.

```
높은 주소
┌─────────────────┐
│      Stack      │ ↓ 스레드마다 독립적
├─────────────────┤   (Tomcat 200개 스레드 → 200개 Stack)
│                 │
│   (빈 공간)      │
│                 │
├─────────────────┤
│      Heap       │ ↑ 모든 스레드가 공유
├─────────────────┤   (Spring Bean, 요청/응답 객체)
│   Method Area   │   (클래스 메타데이터, static 변수)
├─────────────────┤
│      Code       │   (바이트코드)
└─────────────────┘
낮은 주소
```

실제 JVM 메모리 설정:

```bash
java -Xms512m -Xmx2g -Xss1m MyApplication
     ↑         ↑      ↑
     초기 힙   최대 힙  스택 크기 (스레드당)
```

## 스택(Stack)

메서드 호출과 지역 변수를 관리하는 영역입니다. 스레드마다 독립적입니다.

**특징**
- LIFO 구조 (Last In First Out)
- 컴파일 타임에 크기가 결정되는 데이터 저장
- 매우 빠른 할당/해제 (포인터만 이동)
- 크기가 제한적 (기본 1MB)
- 스레드마다 독립적

**저장되는 것**
- 메서드의 지역 변수 (primitive type)
- 메서드 매개변수
- 리턴 주소
- 이전 스택 프레임 포인터

```java
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {  // id → Stack
        int count = 0;                            // count → Stack
        String name = "temp";                     // "temp" 참조 → Stack, 실제 문자열 → Heap
        User user = userService.findById(id);     // user 참조 → Stack, User 객체 → Heap
        return user;
    }  // 메서드 종료 → Stack 프레임 전체 제거
}
```

**스택 프레임 구조**
```
getUser() 호출 시:
┌─────────────────┐ ← Stack Pointer
│ user (참조)      │
│ name (참조)      │
│ count = 0       │
│ id (매개변수)    │
│ 리턴 주소        │
│ 이전 프레임 포인터│
└─────────────────┘
```

메서드가 끝나면 스택 포인터만 이동하면 됩니다. 메모리를 명시적으로 해제할 필요가 없습니다. 이게 스택의 장점입니다.

**StackOverflowError**

스택 공간이 부족하면 발생합니다. 주로 재귀 호출이 너무 깊어질 때입니다.

```java
public class RecursiveService {
    public void recursive() {
        recursive();  // 무한 재귀
    }
}

// 실행 시:
Exception in thread "main" java.lang.StackOverflowError
```

스택 크기는 스레드당 고정입니다. 200개 스레드 × 1MB = 200MB가 스택에만 할당됩니다.

## 힙(Heap)

동적으로 할당되는 메모리 영역입니다. 모든 스레드가 공유합니다.

**특징**
- 런타임에 크기가 결정되는 데이터 저장
- Garbage Collector가 관리 (자동 해제)
- 스택보다 할당/해제가 느림
- 크기가 상대적으로 큼 (GB 단위 가능)
- 모든 스레드가 공유 → 동기화 필요

**저장되는 것**
- `new`로 생성한 객체
- 배열
- 인스턴스 변수

```java
@Service
public class UserService {
    private final UserRepository userRepository;  // 싱글톤 → Heap에 1개만 존재

    public User createUser(String name) {
        User user = new User(name);  // 새 객체 → Heap에 생성
        return userRepository.save(user);
    }
}
```

**메모리 구조**
```
스택 (스레드 1)          힙 (공유)
┌─────────────┐       ┌─────────────────┐
│ user ───────┼──────→│ User 객체        │
└─────────────┘       │  - id: 1         │
                      │  - name: "kim"   │
스택 (스레드 2)          └─────────────────┘
┌─────────────┐            ↑
│ service ────┼────────────┘ 모든 스레드가 공유
└─────────────┘       ┌─────────────────┐
                      │ UserService      │
                      │  (싱글톤)        │
                      └─────────────────┘
```

스레드 1과 2가 같은 `UserService` 인스턴스를 공유합니다. 그래서 동기화가 필요합니다.

**OutOfMemoryError**

힙 공간이 부족하면 발생합니다.

```java
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]);  // 1MB씩 계속 추가
}

// 결과:
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
```

실무에서 발생하는 사례:
- 캐시에 데이터를 계속 쌓기만 하고 삭제 안 함 → OOM
- 대용량 파일을 메모리에 전부 로드 → OOM
- DB에서 수백만 건을 한 번에 조회 → OOM

## 스택 vs 힙 비교

| 구분 | 스택 | 힙 |
|------|------|-----|
| 할당 속도 | 매우 빠름 (포인터 이동) | 상대적으로 느림 (객체 생성) |
| 해제 | 자동 (메서드 종료 시) | GC 또는 명시적 해제 |
| 크기 | 작음 (1MB per thread) | 큼 (GB 단위) |
| 접근 | 스레드 안전 (독립적) | 동기화 필요 (공유) |
| 단편화 | 없음 | 발생 가능 |
| 사용 사례 | 지역 변수, primitive | 객체, 배열 |

## Java 힙 영역 세분화

Java는 힙 영역을 더 나눕니다. Garbage Collection 효율을 위해서입니다.

```
┌─────────────────────────────────────┐
│              JVM 힙                  │
├─────────────────────────────────────┤
│  Young Generation (작은 객체)        │
│  ┌───────┬───────┬───────┐         │
│  │ Eden  │  S0   │  S1   │         │
│  └───────┴───────┴───────┘         │
├─────────────────────────────────────┤
│  Old Generation (오래된 객체)         │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- **Eden**: 새 객체가 생성되는 곳. 대부분 여기서 금방 사라짐.
- **Survivor(S0, S1)**: Minor GC에서 살아남은 객체. 두 영역을 번갈아 사용.
- **Old**: 오래 살아남은 객체. Major GC 대상.

대부분의 객체는 생성 직후 사라집니다 (Weak Generational Hypothesis). 그래서 Young Generation에서 빠르게 정리하고, 오래 살아남은 객체만 Old로 이동합니다.

```bash
# GC 로그 확인
java -Xlog:gc* -jar myapp.jar

[0.123s][info][gc] GC(0) Pause Young (Normal) 25M->3M(128M) 2.123ms
[1.456s][info][gc] GC(1) Pause Young (Normal) 28M->4M(128M) 1.987ms
```

## 실무에서 고려할 점

**힙 크기 조절**

```yaml
# application.yml
spring:
  application:
    name: myapp

# 실행 시
java -Xms1g -Xmx2g -jar myapp.jar
```

- `-Xms`: 초기 힙 크기. 작으면 시작 후 계속 늘어나면서 GC 자주 발생.
- `-Xmx`: 최대 힙 크기. 너무 작으면 OOM, 너무 크면 GC 시간 김.

권장: `Xms`와 `Xmx`를 같게 설정. 힙 크기 변동으로 인한 GC 오버헤드 제거.

**스택 크기 조절**

```bash
java -Xss2m -jar myapp.jar  # 스레드당 2MB
```

기본값은 1MB입니다. 재귀가 깊어지는 알고리즘을 쓴다면 늘릴 수 있습니다. 하지만 스레드 200개 × 2MB = 400MB가 스택에만 쓰입니다.

**객체 생성 최소화**

힙 할당은 스택보다 느리고 GC 부담도 있습니다.

```java
// 비효율적
for (int i = 0; i < 1000000; i++) {
    String s = new String("hello");  // 100만 개 객체 생성
}

// 효율적
String s = "hello";  // String pool 재사용
for (int i = 0; i < 1000000; i++) {
    // s 재사용
}
```

**메모리 누수 찾기**

```bash
# Heap dump 생성
jmap -dump:format=b,file=heap.bin <pid>

# 분석 (Eclipse MAT)
# 어떤 객체가 메모리를 많이 쓰는지 확인
```

예를 들어, 캐시에 쌓인 데이터가 100만 건이 되는 경우가 있습니다. `WeakHashMap`으로 변경하면 GC가 자동으로 정리합니다.

**GC 튜닝**

```bash
# G1 GC (Java 9+ 기본)
java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -jar myapp.jar

# Parallel GC (처리량 중시)
java -XX:+UseParallelGC -jar myapp.jar

# ZGC (초저지연)
java -XX:+UseZGC -jar myapp.jar
```

API 서버는 보통 G1 GC가 적당합니다. 짧은 pause time과 좋은 처리량의 균형을 맞춥니다.

## 실무 예시

**예시 1: OutOfMemoryError - Heap**

대용량 Excel 다운로드에서 OOM이 발생하는 경우입니다.

```java
// 문제 코드
List<Data> allData = dataRepository.findAll();  // 100만 건을 메모리에 전부 로드
return excelService.generate(allData);           // OOM!
```

해결 방법: 스트리밍 방식으로 변경.

```java
// 개선 코드
dataRepository.findAll().forEach(data -> {
    excelService.writeRow(data);  // 한 건씩 처리
});
```

**예시 2: StackOverflowError**

깊은 재귀 호출이 문제가 되는 경우입니다.

```java
public class TreeService {
    public void traverse(Node node) {
        if (node == null) return;
        traverse(node.left);
        traverse(node.right);
    }
}
// 트리 깊이 10,000 → StackOverflowError
```

해결 방법: 반복문으로 변경하거나 스택 크기 증가.

**예시 3: 메모리 누수**

```java
@Service
public class CacheService {
    private Map<String, Data> cache = new HashMap<>();

    public void add(String key, Data data) {
        cache.put(key, data);  // 계속 쌓이기만 함
    }
}
```

캐시가 무한정 커져서 OOM이 발생할 수 있습니다. `LRUCache`나 `@Cacheable`로 변경하면 해결됩니다.

## 고급 메모리 관리 기법

JVM은 스택과 힙 외에도 다양한 메모리 최적화 기법을 제공합니다.

### Escape Analysis & Stack Allocation

JIT 컴파일러가 객체의 범위를 분석해서 힙 대신 스택에 할당하는 최적화입니다.

```java
public void processUser() {
    User user = new User("temp");  // 이 메서드 안에서만 사용
    System.out.println(user.getName());
    // user는 메서드 밖으로 "탈출"하지 않음
}

// Escape Analysis 적용 시:
// User 객체를 힙이 아닌 스택에 할당
// → GC 부담 감소, 할당 속도 증가
```

**동작 방식**:
```java
// 탈출하는 경우 (Heap 할당)
public User createUser() {
    User user = new User();
    return user;  // 메서드 밖으로 탈출
}

// 탈출하지 않는 경우 (Stack 할당 가능)
public void printUser() {
    User user = new User();
    System.out.println(user);  // 메서드 내부에서만 사용
}
```

**활성화**:
```bash
# Java 8+에서 기본 활성화
java -XX:+DoEscapeAnalysis -jar myapp.jar

# 확인
java -XX:+PrintEscapeAnalysis -jar myapp.jar
```

**장점**:
- GC 부담 감소 (스택 할당 객체는 GC 대상 아님)
- 할당 속도 향상 (스택 할당 > 힙 할당)
- Lock elision (탈출하지 않는 객체의 synchronized 제거)

### TLAB (Thread-Local Allocation Buffer)

각 스레드가 힙의 일부를 독점적으로 사용하여 동기화 없이 빠르게 객체를 할당하는 기법입니다.

```
JVM Heap:
┌─────────────────────────────────┐
│ Thread 1 TLAB (512KB)           │ ← Thread 1 전용
├─────────────────────────────────┤
│ Thread 2 TLAB (512KB)           │ ← Thread 2 전용
├─────────────────────────────────┤
│ Shared Eden Space               │ ← TLAB 부족 시 사용
└─────────────────────────────────┘
```

**동작 방식**:
1. 스레드가 새 객체 할당 시 자신의 TLAB에서 할당
2. 동기화 불필요 (독점 영역)
3. TLAB 부족 시 새로운 TLAB 할당 또는 Shared Eden 사용

```bash
# TLAB 설정
java -XX:+UseTLAB -XX:TLABSize=512k -jar myapp.jar

# TLAB 통계 확인
java -XX:+PrintTLAB -jar myapp.jar
```

**장점**:
- 빠른 할당 (락 불필요)
- 캐시 지역성 향상
- 멀티스레드 확장성

**단점**:
- TLAB 크기만큼 메모리 추가 필요
- TLAB 부족 시 Slow Path로 전환

### String Pool & Constant Pool

문자열 리터럴과 상수를 재사용하는 메모리 절약 기법입니다.

```java
// String Pool
String s1 = "hello";        // String Pool에 저장
String s2 = "hello";        // 같은 인스턴스 재사용
System.out.println(s1 == s2);  // true

String s3 = new String("hello");  // Heap에 새로 생성
System.out.println(s1 == s3);     // false

// intern() 메서드로 Pool 사용
String s4 = s3.intern();    // Pool의 "hello" 반환
System.out.println(s1 == s4);     // true
```

**위치**:
- Java 7 이전: PermGen (고정 크기, OOM 위험)
- Java 7+: Heap (GC 대상, 크기 조절 가능)

```bash
# String Pool 크기 설정
java -XX:StringTableSize=1000003 -jar myapp.jar  # 소수 권장
```

**실무 활용**:
```java
// 비효율적 - 매번 새 String 생성
for (int i = 0; i < 1000; i++) {
    String key = new String("cache_key_" + i);
}

// 효율적 - String Pool 활용
for (int i = 0; i < 1000; i++) {
    String key = ("cache_key_" + i).intern();
}
```

**주의사항**:
- intern() 남용 시 Pool이 커져서 GC 부담
- equals()로 비교하는 게 안전

### Direct Memory (Off-Heap)

JVM 힙 외부의 네이티브 메모리를 사용하는 기법입니다.

```java
// Heap Memory (GC 대상)
byte[] heapBuffer = new byte[1024 * 1024];  // 1MB

// Direct Memory (GC 대상 아님)
ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024 * 1024);  // 1MB

// 파일 I/O에서 Direct Buffer가 효율적
FileChannel channel = FileChannel.open(path);
ByteBuffer buffer = ByteBuffer.allocateDirect(8192);
channel.read(buffer);  // OS 메모리 → Direct Buffer (복사 1회)
                       // Heap Buffer 사용 시: OS → Native → Heap (복사 2회)
```

**장점**:
- GC 대상 아님 (GC pause 감소)
- Native I/O 빠름 (복사 횟수 감소)
- 힙 크기 제약 없음

**단점**:
- 할당/해제 느림
- 명시적 해제 필요 (또는 Full GC 시)
- 메모리 누수 위험

```bash
# Direct Memory 최대 크기 설정
java -XX:MaxDirectMemorySize=512m -jar myapp.jar
```

**실무 사용 예**:
```java
// Netty ByteBuf - Direct Memory 활용
ByteBuf buffer = PooledByteBufAllocator.DEFAULT.directBuffer(1024);
try {
    // 네트워크 I/O 처리
} finally {
    buffer.release();  // 명시적 해제
}
```

### Memory-Mapped Files

파일을 메모리에 매핑하여 파일 I/O를 메모리 접근처럼 처리하는 기법입니다.

```java
// 전통적 방식 - Heap 메모리 사용
FileInputStream fis = new FileInputStream("large_file.dat");
byte[] buffer = new byte[8192];
while (fis.read(buffer) != -1) {
    // 처리
}

// Memory-Mapped - OS 페이지 캐시 활용
RandomAccessFile file = new RandomAccessFile("large_file.dat", "r");
FileChannel channel = file.getChannel();
MappedByteBuffer buffer = channel.map(FileChannel.MapMode.READ_ONLY, 0, file.length());

// 메모리처럼 접근
byte data = buffer.get(1000);  // 1000번째 바이트 읽기
```

**장점**:
- 대용량 파일 처리 효율적 (GB 단위)
- OS 페이지 캐시 활용 (빠른 I/O)
- JVM 힙 사용 안 함

**단점**:
- 파일 크기 제한 (32비트: 2GB, 64비트: 제한 거의 없음)
- Windows에서 파일 락 이슈
- 명시적 언매핑 어려움

## 아키텍처 레벨의 해결책

메모리 문제를 시스템 아키텍처로 해결하는 방법들입니다.

### Object Pooling Pattern

자주 생성/삭제되는 객체를 미리 만들어두고 재사용하는 패턴입니다.

```java
// Apache Commons Pool2
public class DatabaseConnectionPool {
    private GenericObjectPool<Connection> pool;

    public DatabaseConnectionPool() {
        GenericObjectPoolConfig config = new GenericObjectPoolConfig();
        config.setMaxTotal(20);      // 최대 20개
        config.setMaxIdle(10);        // 유휴 최대 10개
        config.setMinIdle(5);         // 유휴 최소 5개

        pool = new GenericObjectPool<>(new ConnectionFactory(), config);
    }

    public Connection getConnection() throws Exception {
        return pool.borrowObject();  // 풀에서 빌림
    }

    public void returnConnection(Connection conn) {
        pool.returnObject(conn);     // 풀에 반환
    }
}
```

**HikariCP 설정** (Spring Boot 기본):
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
```

**장점**:
- 객체 생성 비용 절감
- GC 부담 감소
- 성능 예측 가능

**단점**:
- 메모리 고정 사용
- 풀 크기 조정 필요
- 멀티스레드 동기화

**적용 사례**:
- DB 커넥션 풀
- 스레드 풀
- ByteBuffer 풀 (Netty)

### Flyweight Pattern

공통 상태를 공유하여 메모리를 절약하는 패턴입니다.

```java
// 비효율적 - 100만 개 Character 객체 생성
public class TextEditor {
    private List<Character> characters = new ArrayList<>();

    public void addText(String text) {
        for (char c : text.toCharArray()) {
            characters.add(new Character(c, "Arial", 12));  // 매번 새 객체
        }
    }
}

// Flyweight - 공유 가능한 부분 분리
public class CharacterFlyweight {
    private final char value;
    private final String font;
    private final int size;
    // 불변 객체로 공유 가능
}

public class CharacterFactory {
    private static Map<String, CharacterFlyweight> pool = new HashMap<>();

    public static CharacterFlyweight get(char c, String font, int size) {
        String key = c + font + size;
        return pool.computeIfAbsent(key,
            k -> new CharacterFlyweight(c, font, size));
    }
}
```

**장점**:
- 메모리 사용량 대폭 감소
- 객체 생성 비용 절감

**단점**:
- 공유 불가능한 상태는 외부 관리 필요
- 불변 객체로 설계 필요

### Weak/Soft References (참조 타입)

GC와 협력하여 메모리를 유연하게 관리하는 기법입니다.

```java
// Strong Reference - GC 안 됨
Map<String, User> cache = new HashMap<>();
cache.put("user1", new User());  // 명시적 삭제 전까지 유지

// Weak Reference - GC 가능
Map<String, WeakReference<User>> weakCache = new WeakHashMap<>();
weakCache.put("user1", new User());  // 메모리 부족 시 GC 가능

// Soft Reference - 메모리 부족 시만 GC
Map<String, SoftReference<byte[]>> softCache = new HashMap<>();
softCache.put("image1", new SoftReference<>(imageData));
```

**참조 타입 비교**:
```java
// Strong Reference
User user = new User();  // 명시적 null 할당 전까지 유지

// Soft Reference - 메모리 부족 시 GC
SoftReference<User> softRef = new SoftReference<>(new User());
User user = softRef.get();  // null 가능

// Weak Reference - 다음 GC 때 수거
WeakReference<User> weakRef = new WeakReference<>(new User());

// Phantom Reference - GC 후 정리 작업용
PhantomReference<User> phantomRef = new PhantomReference<>(new User(), queue);
```

**실무 활용**:
```java
// Guava Cache - Soft/Weak Reference 지원
LoadingCache<String, User> cache = CacheBuilder.newBuilder()
    .maximumSize(1000)
    .softValues()  // Soft Reference로 값 저장
    .build(loader);
```

### Stream Processing & Lazy Evaluation

대용량 데이터를 메모리에 올리지 않고 처리하는 패턴입니다.

```java
// 비효율적 - 전체 로드
List<User> allUsers = userRepository.findAll();  // 100만 건 → OOM
allUsers.stream()
    .filter(user -> user.isActive())
    .forEach(this::sendEmail);

// 효율적 - 스트리밍
userRepository.findAll().forEach(user -> {  // 한 건씩 처리
    if (user.isActive()) {
        sendEmail(user);
    }
});

// Spring Data JPA Stream
@Query("SELECT u FROM User u")
Stream<User> streamAll();

// 사용
try (Stream<User> stream = userRepository.streamAll()) {
    stream.filter(User::isActive)
          .forEach(this::sendEmail);
}
```

**Reactor/RxJava** (Reactive Stream):
```java
// 배압(Backpressure) 지원
Flux.fromIterable(hugeList)
    .buffer(1000)  // 1000개씩 처리
    .flatMap(batch -> processBatch(batch))
    .subscribe();
```

### Memory-Efficient Data Structures

메모리를 절약하는 자료구조를 선택하는 방법입니다.

```java
// 비효율적 - ArrayList (내부 Object[])
List<Integer> list = new ArrayList<>();  // Integer 객체 생성

// 효율적 - Primitive Collection (int[])
IntArrayList list = new IntArrayList();  // primitive int 사용
// 메모리: 24 bytes/Integer → 4 bytes/int

// Roaring Bitmap - 정수 집합 압축
RoaringBitmap bitmap = new RoaringBitmap();
bitmap.add(1, 2, 3, 1000, 1000000);  // 압축 저장

// Chronicle Map - Off-Heap Map
ChronicleMap<String, User> map = ChronicleMap
    .of(String.class, User.class)
    .entries(1_000_000)
    .averageKeySize(20)
    .averageValueSize(100)
    .create();
```

## 메모리 관리 기법 비교

### 메모리 영역 비교

| 영역 | 크기 | 속도 | GC | Thread-Safe | 주요 용도 |
|------|------|------|-----|------------|----------|
| Stack | 작음 (1MB) | 매우 빠름 | 자동 | Yes (독립) | 지역 변수 |
| Heap | 큼 (GB) | 느림 | Yes | No (동기화 필요) | 객체 |
| String Pool | 중간 | 빠름 | Yes (Java 7+) | Yes | 문자열 리터럴 |
| Direct Memory | 가변 | 중간 | No | No | 네트워크 I/O |
| Memory-Mapped | 매우 큼 | 빠름 (OS Cache) | No | No | 대용량 파일 |

### 최적화 기법 트레이드오프

| 기법 | 메모리 절약 | 성능 | GC 부담 감소 | 구현 복잡도 | 주요 사용처 |
|------|-----------|------|------------|------------|-----------|
| Escape Analysis | 중간 | 높음 | 높음 | 낮음 (JIT 자동) | 일반 애플리케이션 |
| TLAB | 낮음 | 높음 | 중간 | 낮음 (JVM 기본) | 멀티스레드 |
| String Pool | 높음 | 중간 | 높음 | 낮음 | 문자열 많은 앱 |
| Direct Memory | 높음 | 높음 | 매우 높음 | 높음 | 네트워크 서버 |
| Object Pooling | 중간 | 높음 | 높음 | 중간 | DB 커넥션 |
| Flyweight | 매우 높음 | 중간 | 높음 | 중간 | 대량 객체 |
| Weak/Soft Ref | 높음 | 낮음 | 높음 | 중간 | 캐시 |
| Stream Processing | 매우 높음 | 낮음 | 매우 높음 | 낮음 | 대용량 데이터 |

### 참조 타입 비교

| 타입 | GC 시점 | 용도 | 메모리 부족 시 | 예시 |
|------|---------|------|--------------|------|
| Strong | 명시적 null | 일반 객체 | OOM | `User user = new User()` |
| Soft | 메모리 부족 시 | 캐시 | GC 수거 | `SoftReference<byte[]>` |
| Weak | 다음 GC | 임시 캐시 | 바로 GC | `WeakHashMap` |
| Phantom | GC 후 | 리소스 정리 | GC 후 큐 통지 | `PhantomReference` |

## 진화 경로

실무에서는 단계적으로 메모리를 최적화하는 것이 좋습니다.

```
1단계: 기본 설정
  - JVM 기본 힙 크기
  - G1 GC 사용
  - 모니터링 도구 도입

2단계: 힙 튜닝
  - Xms=Xmx 설정 (크기 고정)
  - GC 로그 분석
  - Young/Old 비율 조정

3단계: 메모리 효율화
  - String Pool 활용
  - Object Pooling (DB, Thread)
  - 불필요한 객체 생성 제거

4단계: 고급 최적화
  - Direct Memory 활용 (I/O)
  - Stream Processing (대용량)
  - Weak/Soft Reference (캐시)
  - Memory-Mapped Files (파일)

5단계: 아키텍처 개선
  - 캐시 레이어 분리
  - 분산 캐싱 (Redis)
  - Off-Heap 저장소 (Chronicle Map)
  - Reactive 스트림
```

## 실전 선택 기준

**다음과 같은 경우 기본 Heap을 유지하세요**:
- 일반적인 CRUD 애플리케이션
- 트래픽 적음
- GC pause < 100ms
- 메모리 < 4GB

**다음과 같은 경우 Object Pooling을 고려하세요**:
- 객체 생성 비용 높음 (DB 커넥션)
- 객체 생성 빈도 높음
- 객체 크기 큼
- GC pause 문제

**다음과 같은 경우 Direct Memory를 고려하세요**:
- 네트워크 I/O 집약적
- 파일 I/O 많음
- GC pause 민감 (<10ms)
- 힙 크기 제약

**다음과 같은 경우 Stream Processing을 고려하세요**:
- 대용량 데이터 처리 (100만 건+)
- OOM 위험
- 배치 작업
- 실시간 데이터 파이프라인

**다음과 같은 경우 Soft/Weak Reference를 고려하세요**:
- 캐시 구현
- 메모리 부족 시 자동 정리
- 크기 예측 어려움
- 일시적 데이터 저장

## 정리

- 스택은 메서드 호출과 지역 변수를 저장하고, 스레드마다 독립적입니다
- 힙은 동적 할당 객체를 저장하고, 모든 스레드가 공유합니다
- 스택은 빠르지만 작고 (1MB), 힙은 느리지만 큽니다 (GB)
- StackOverflowError는 스택 부족, OutOfMemoryError는 힙 부족입니다
- Java는 힙을 Young/Old로 나눠서 GC 효율을 높입니다
- 실무에서는 힙 크기, GC 전략, 메모리 누수를 모니터링해야 합니다
- jmap, VisualVM, MAT 등으로 메모리 문제를 분석할 수 있습니다
- **고급 기법**: Escape Analysis, TLAB, Direct Memory, Memory-Mapped Files로 성능 개선
- **아키텍처 패턴**: Object Pooling, Flyweight, Stream Processing, Weak/Soft Reference
- **진화적 접근**: 기본 설정에서 시작해서 측정 기반으로 점진적 최적화
