---
term: 'Extension Function'
aliases: ['확장 함수']
category: 'kotlin'
summary: '기존 클래스를 수정하지 않고 새로운 함수를 추가하는 기능'
related: ['kotlin']
---

확장 함수는 기존 클래스에 새로운 함수를 추가하는 코틀린의 기능입니다. 클래스 소스 코드를 수정하지 않아도 됩니다.

## 기본 문법

```kotlin
fun String.addExclamation(): String {
    return this + "!"
}

"Hello".addExclamation()  // "Hello!"
```

## 실전 활용

```kotlin
// 날짜 포맷팅
fun LocalDateTime.toKoreanFormat(): String {
    return this.format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"))
}

// 컬렉션 유틸
fun <T> List<T>.secondOrNull(): T? = this.getOrNull(1)
```

## 주의사항

- 정적으로 디스패치됨 (오버라이드 불가)
- private 멤버 접근 불가
- 같은 시그니처의 멤버 함수가 있으면 멤버가 우선

## 표준 라이브러리 예시

```kotlin
listOf(1, 2, 3).firstOrNull()  // 확장 함수
"hello".capitalize()           // 확장 함수
```
