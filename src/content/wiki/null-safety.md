---
term: 'Null Safety'
aliases: ['널 안전성', '널 세이프티']
category: 'kotlin'
summary: '컴파일 타임에 NullPointerException을 방지하는 타입 시스템'
related: ['kotlin']
---

Null Safety는 코틀린의 핵심 기능으로, 컴파일 타임에 null 참조를 추적하여 NPE를 방지합니다.

## Nullable vs Non-null

```kotlin
var name: String = "Kotlin"   // null 불가
var nickname: String? = null  // null 허용
```

## 주요 연산자

| 연산자 | 용도 | 예시 |
|--------|------|------|
| `?.` | 안전 호출 | `user?.name` |
| `?:` | 엘비스 (기본값) | `name ?: "Guest"` |
| `!!` | Not-null 단언 | `name!!` |
| `as?` | 안전 캐스팅 | `obj as? String` |

## 실전 패턴

```kotlin
// 조기 리턴
val user = findUser(id) ?: return null

// let과 조합
user.email?.let { sendEmail(it) }
```
