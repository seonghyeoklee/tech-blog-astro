---
title: '코틀린이란? - 탄생 배경과 주요 특징'
description: 'JetBrains가 왜 새로운 언어를 만들었는지, Java와 무엇이 다른지 알아봅니다.'
pubDate: 2026-01-05
tags: ['Kotlin']
series: 'kotlin-fundamentals'
seriesOrder: 1
---

## 코틀린이란?

코틀린은 JetBrains가 만든 프로그래밍 언어다. IntelliJ IDEA를 만든 그 회사다. 2011년에 처음 공개됐고 2016년에 1.0 버전이 릴리즈됐다. 2017년에 Google이 Android 공식 언어로 채택하면서 본격적으로 주목받기 시작했다.

JVM 위에서 돌아가고, Java와 100% 호환된다. 기존 Java 코드와 섞어서 쓸 수 있다는 뜻이다. Java 라이브러리를 그대로 쓸 수 있고, 코틀린 코드에서 Java 코드를 호출하거나 그 반대도 가능하다.

## 왜 새로운 언어가 필요했을까?

JetBrains는 Java로 IDE를 만들고 있었다. Java는 좋은 언어지만 오래된 언어이기도 하다. 1995년에 나왔으니까 30년이 넘었다. 그동안 프로그래밍 언어 설계에 대한 이해가 많이 발전했는데, Java는 하위 호환성 때문에 쉽게 바꿀 수가 없었다.

JetBrains가 느꼈던 Java의 불편함을 몇 가지 꼽아보면 이렇다.

**NullPointerException 문제.** Java에서 가장 흔한 런타임 에러다. 모든 참조 타입이 null이 될 수 있는데, 컴파일러가 이걸 체크해주지 않는다. 코드를 아무리 조심히 짜도 NPE는 터진다.

**장황한 문법.** getter, setter, equals, hashCode, toString을 일일이 작성해야 한다. 롬복 같은 라이브러리가 나온 것도 이런 보일러플레이트가 너무 많아서다.

**함수형 프로그래밍 지원 부족.** Java 8에서 람다가 추가됐지만, 언어 설계 단계부터 함수형을 고려한 게 아니라 나중에 덧붙인 느낌이 있다.

**타입 추론 부족.** 변수 선언할 때 타입을 항상 명시해야 한다. Java 10에서 var가 추가됐지만, 코틀린은 처음부터 타입 추론이 기본이다.

JetBrains는 Scala도 검토했지만 컴파일 속도가 느리고 학습 곡선이 가파르다는 이유로 직접 새 언어를 만들기로 했다.

## 코틀린의 주요 특징

### Null Safety

코틀린에서는 null이 될 수 있는 타입과 아닌 타입이 명확히 구분된다.

```kotlin
var name: String = "Kotlin"  // null 불가
var nickname: String? = null  // null 허용
```

타입 뒤에 `?`를 붙이면 nullable 타입이 된다. nullable 타입은 그냥 쓸 수 없고, null 체크를 해야만 한다. 컴파일러가 강제하기 때문에 NPE가 발생할 가능성이 크게 줄어든다.

### 간결한 문법

Java에서 DTO 클래스를 만들려면 필드, 생성자, getter, setter, equals, hashCode, toString을 다 작성해야 한다. 코틀린에서는 한 줄이다.

```kotlin
data class User(val name: String, val age: Int)
```

이게 끝이다. 필요한 메서드가 자동으로 생성된다.

### 확장 함수

기존 클래스를 수정하지 않고 새로운 함수를 추가할 수 있다.

```kotlin
fun String.addExclamation(): String {
    return this + "!"
}

val greeting = "Hello".addExclamation()  // "Hello!"
```

String 클래스를 건드리지 않고 새로운 함수를 붙였다. 라이브러리 클래스를 확장할 때 유용하다.

### 스마트 캐스트

타입 체크를 하면 자동으로 캐스팅된다.

```kotlin
fun printLength(obj: Any) {
    if (obj is String) {
        println(obj.length)  // 자동으로 String으로 캐스팅됨
    }
}
```

Java에서는 `instanceof` 체크 후에 명시적으로 캐스팅해야 하는데, 코틀린은 알아서 해준다.

### 코루틴

비동기 프로그래밍을 위한 코루틴이 언어 레벨에서 지원된다. 콜백 지옥 없이 비동기 코드를 동기 코드처럼 작성할 수 있다. 이건 나중에 별도로 다룰 예정이다.

## Java 개발자가 코틀린을 배워야 하는 이유

첫째, 생산성이 올라간다. 같은 기능을 더 적은 코드로 작성할 수 있다. 보일러플레이트가 줄어들면 핵심 로직에 집중할 수 있다.

둘째, 안전하다. Null Safety 덕분에 런타임 에러가 줄어든다. 컴파일 타임에 잡을 수 있는 에러가 많아진다.

셋째, 기존 Java 자산을 그대로 쓸 수 있다. 새로운 언어를 배운다고 기존 라이브러리나 프레임워크를 버릴 필요가 없다. Spring도 코틀린을 잘 지원한다.

넷째, Android 개발을 하려면 사실상 필수다. Google이 Kotlin-first를 선언한 이후로 새로운 Android API는 코틀린 기준으로 설계된다.

