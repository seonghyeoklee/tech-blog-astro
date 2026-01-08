---
term: 'Kotlin'
aliases: ['코틀린']
category: 'kotlin'
summary: 'JetBrains가 만든 JVM 기반 프로그래밍 언어'
related: ['null-safety', 'data-class', 'coroutine', 'extension-function']
---

Kotlin은 JetBrains가 개발한 현대적인 프로그래밍 언어입니다. JVM에서 동작하며 Java와 100% 호환됩니다.

## 주요 특징

| 특징 | 설명 |
|------|------|
| Null Safety | 컴파일 타임에 NPE 방지 |
| 간결한 문법 | data class, 타입 추론 |
| 함수형 프로그래밍 | 람다, 고차 함수 |
| 코루틴 | 비동기 프로그래밍 |

## Java와 비교

```kotlin
// Kotlin
data class User(val name: String, val age: Int)

// Java (동일 기능에 50줄 이상 필요)
```

## 사용처

- Android 공식 언어 (Google)
- Spring Boot 지원
- Kotlin/JS, Kotlin/Native
