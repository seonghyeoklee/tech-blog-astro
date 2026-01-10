---
title: '코틀린 변수와 타입 - val, var 그리고 타입 추론'
description: '코틀린에서 변수를 선언하는 방법과 기본 타입, 타입 추론, 문자열 템플릿까지 알아봅니다.'
pubDate: 2026-01-07
tags: ['Kotlin']
series: 'kotlin-fundamentals'
seriesOrder: 2
---

## 변수 선언: val과 var

코틀린에서 변수를 선언하는 키워드는 두 가지입니다.

```kotlin
val name = "Kotlin"  // 불변 (immutable)
var count = 0        // 가변 (mutable)
```

**val**은 value의 약자입니다. 한 번 할당하면 다시 바꿀 수 없습니다. Java의 `final`과 같습니다.

**var**은 variable의 약자입니다. 언제든 다른 값을 할당할 수 있습니다.

```kotlin
val language = "Kotlin"
language = "Java"  // 컴파일 에러!

var version = 1
version = 2  // OK
```

기본적으로 val을 쓰고, 꼭 필요할 때만 var를 쓰는 게 좋습니다. 불변 변수가 많을수록 코드가 예측 가능해지고 버그가 줄어듭니다.

## 타입 추론

위 예제에서 타입을 명시하지 않았는데도 동작합니다. 코틀린 컴파일러가 값을 보고 타입을 추론하기 때문입니다.

```kotlin
val name = "Kotlin"    // String으로 추론
val count = 42         // Int로 추론
val pi = 3.14          // Double로 추론
val isActive = true    // Boolean으로 추론
```

타입을 명시적으로 쓸 수도 있습니다. 변수명 뒤에 콜론과 함께 적습니다.

```kotlin
val name: String = "Kotlin"
val count: Int = 42
```

선언과 초기화를 분리할 때는 타입을 반드시 명시해야 합니다. 컴파일러가 추론할 값이 없으니까요.

```kotlin
val name: String
name = "Kotlin"
```

## 기본 타입

코틀린의 기본 타입은 Java와 비슷하지만, 원시 타입과 래퍼 클래스의 구분이 없습니다.

### 숫자 타입

```kotlin
val byte: Byte = 127
val short: Short = 32767
val int: Int = 2147483647
val long: Long = 9223372036854775807L

val float: Float = 3.14f
val double: Double = 3.141592653589793
```

Long 리터럴에는 `L` 접미사를, Float 리터럴에는 `f` 접미사를 붙입니다.

숫자에 밑줄을 넣어서 가독성을 높일 수 있습니다.

```kotlin
val million = 1_000_000
val hexColor = 0xFF_EC_DE_5E
```

### 문자와 불리언

```kotlin
val char: Char = 'A'
val isKotlin: Boolean = true
```

Char는 작은따옴표, String은 큰따옴표를 씁니다. Java와 같습니다.

### 숫자 타입 변환

코틀린은 암시적 타입 변환을 허용하지 않습니다.

```kotlin
val intValue: Int = 100
val longValue: Long = intValue  // 컴파일 에러!
```

Java에서는 int가 long으로 자동 변환되지만, 코틀린에서는 명시적으로 변환해야 합니다.

```kotlin
val intValue: Int = 100
val longValue: Long = intValue.toLong()  // OK
```

모든 숫자 타입에 `toByte()`, `toShort()`, `toInt()`, `toLong()`, `toFloat()`, `toDouble()` 함수가 있습니다.

번거로워 보이지만, 암시적 변환으로 인한 버그를 막아줍니다. 예를 들어 큰 Long 값을 Int로 변환하면 데이터가 손실되는데, 코틀린에서는 이런 변환이 항상 명시적이라 실수할 가능성이 줄어듭니다.

## 문자열 템플릿

문자열 안에 변수나 표현식을 넣을 수 있습니다.

```kotlin
val name = "Kotlin"
println("Hello, $name!")  // Hello, Kotlin!
```

달러 기호 뒤에 변수명을 쓰면 됩니다. 표현식을 쓰려면 중괄호로 감쌉니다.

```kotlin
val a = 10
val b = 20
println("$a + $b = ${a + b}")  // 10 + 20 = 30
```

Java에서는 문자열 연결을 이렇게 했습니다.

```java
String message = "Hello, " + name + "!";
// 또는
String message = String.format("Hello, %s!", name);
```

코틀린의 문자열 템플릿이 훨씬 읽기 쉽습니다.

### 여러 줄 문자열

큰따옴표 세 개로 여러 줄 문자열을 만들 수 있습니다.

```kotlin
val json = """
    {
        "name": "Kotlin",
        "version": 2.0
    }
""".trimIndent()
```

`trimIndent()`를 붙이면 공통 들여쓰기가 제거됩니다. JSON이나 SQL 같은 걸 코드에 넣을 때 유용합니다.

## Java와 비교

| 구분 | Java | Kotlin |
|------|------|--------|
| 불변 변수 | `final String name = "Kotlin";` | `val name = "Kotlin"` |
| 가변 변수 | `String name = "Kotlin";` | `var name = "Kotlin"` |
| 타입 추론 | Java 10+ `var` (지역 변수만) | 처음부터 지원 |
| 문자열 템플릿 | 없음 (Java 21+ 템플릿 프리뷰) | `"Hello, $name"` |
| 여러 줄 문자열 | Java 15+ 텍스트 블록 | `"""..."""` |
| 원시 타입 | `int`, `Integer` 구분 | 구분 없음 (`Int`) |

코틀린이 더 간결합니다. 세미콜론도 없고, 타입 선언도 생략할 수 있습니다.

## 정리

- `val`은 불변, `var`은 가변입니다. 기본적으로 val을 쓰세요.
- 타입 추론 덕분에 타입을 생략할 수 있습니다.
- 원시 타입과 래퍼 클래스 구분이 없습니다.
- 숫자 타입 간 암시적 변환이 없습니다. `toInt()`, `toLong()` 등을 씁니다.
- 문자열 템플릿으로 `$변수`나 `${표현식}`을 쓸 수 있습니다.
