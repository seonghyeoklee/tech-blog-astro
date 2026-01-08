---
term: 'Data Class'
aliases: ['데이터 클래스']
category: 'kotlin'
summary: '데이터를 담는 클래스로 equals, hashCode, toString이 자동 생성됨'
related: ['kotlin']
---

Data Class는 데이터를 담기 위한 클래스로, 보일러플레이트 코드를 자동 생성합니다.

## 기본 사용법

```kotlin
data class User(val name: String, val age: Int)
```

## 자동 생성되는 메서드

- `equals()` / `hashCode()`
- `toString()` - "User(name=John, age=30)"
- `copy()` - 객체 복사
- `componentN()` - 구조 분해

## 활용 예시

```kotlin
val user = User("John", 30)

// copy로 일부만 변경
val older = user.copy(age = 31)

// 구조 분해
val (name, age) = user
```

## Java와 비교

Java에서 같은 기능을 위해 Lombok `@Data`나 Record(Java 16+)를 사용합니다. Kotlin은 언어 레벨에서 지원합니다.
