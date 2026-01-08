---
term: 'Coroutine'
aliases: ['코루틴']
category: 'kotlin'
summary: '경량 스레드로 비동기 코드를 동기 코드처럼 작성할 수 있게 해주는 기능'
related: ['kotlin', 'thread', 'thread-pool']
---

코루틴은 코틀린의 비동기 프로그래밍 솔루션으로, 콜백 없이 비동기 코드를 작성할 수 있습니다.

## 기본 사용법

```kotlin
suspend fun fetchUser(): User {
    delay(1000)  // 비동기 대기
    return User("John")
}

// 호출
GlobalScope.launch {
    val user = fetchUser()
    println(user.name)
}
```

## 핵심 개념

| 개념 | 설명 |
|------|------|
| suspend | 일시 중단 가능한 함수 |
| launch | 결과 없이 실행 |
| async | 결과를 Deferred로 반환 |
| runBlocking | 블로킹 방식 실행 |

## 스레드 vs 코루틴

- 스레드: OS 레벨, 무거움 (MB 단위)
- 코루틴: 유저 레벨, 가벼움 (KB 단위)

## Spring WebFlux와 함께

```kotlin
@GetMapping("/users/{id}")
suspend fun getUser(@PathVariable id: Long): User {
    return userService.findById(id)
}
```
