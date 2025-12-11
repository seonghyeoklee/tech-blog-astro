---
title: '스택과 힙 - 메모리 구조 이해하기'
description: '스택과 힙의 차이, 메모리 할당 방식, 그리고 왜 중요한지 정리했습니다'
pubDate: 'Jan 12 2025'
tags: ['CS', 'OS', 'Java']
series: 'backend-cs-fundamentals'
seriesOrder: 4
---

프로덕션에서 `OutOfMemoryError: Java heap space`를 만난 적이 있습니다. 힙 크기를 늘리니까 해결됐지만, 왜 발생했는지는 몰랐습니다. 나중에 알고 보니 메모리 누수였습니다. 스택과 힙을 제대로 이해했다면 더 빨리 해결할 수 있었을 겁니다.

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

실제로 겪은 사례:
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

실제 사례: 캐시에 쌓인 데이터가 100만 건. `WeakHashMap`으로 변경해서 GC가 자동으로 정리하도록 수정.

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

## 실무에서 겪은 메모리 문제

**문제 1: OutOfMemoryError - Heap**

대용량 Excel 다운로드에서 OOM 발생.

```java
// 문제 코드
List<Data> allData = dataRepository.findAll();  // 100만 건을 메모리에 전부 로드
return excelService.generate(allData);           // OOM!
```

해결: 스트리밍 방식으로 변경.

```java
// 개선 코드
dataRepository.findAll().forEach(data -> {
    excelService.writeRow(data);  // 한 건씩 처리
});
```

**문제 2: StackOverflowError**

깊은 재귀 호출.

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

해결: 반복문으로 변경하거나 스택 크기 증가.

**문제 3: 메모리 누수**

```java
@Service
public class CacheService {
    private Map<String, Data> cache = new HashMap<>();

    public void add(String key, Data data) {
        cache.put(key, data);  // 계속 쌓이기만 함
    }
}
```

캐시가 무한정 커져서 OOM 발생. `LRUCache`나 `@Cacheable`로 변경.

## 정리

- 스택은 메서드 호출과 지역 변수를 저장하고, 스레드마다 독립적입니다
- 힙은 동적 할당 객체를 저장하고, 모든 스레드가 공유합니다
- 스택은 빠르지만 작고 (1MB), 힙은 느리지만 큽니다 (GB)
- StackOverflowError는 스택 부족, OutOfMemoryError는 힙 부족입니다
- Java는 힙을 Young/Old로 나눠서 GC 효율을 높입니다
- 실무에서는 힙 크기, GC 전략, 메모리 누수를 모니터링해야 합니다
- jmap, VisualVM, MAT 등으로 메모리 문제를 분석할 수 있습니다
