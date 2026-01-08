---
title: '코틀린 Null Safety 완벽 가이드 - Spring 실전 예시와 함께'
description: '코틀린의 Null Safety를 Spring Boot 실전 예시와 함께 알아봅니다. ?., ?:, !!, let 등 핵심 연산자를 다룹니다.'
pubDate: 2026-01-08
tags: ['Kotlin', 'Spring']
series: 'kotlin-fundamentals'
seriesOrder: 3
---

## Null Safety가 왜 중요한가

Java 개발자라면 NullPointerException을 수없이 만났을 것이다. Tony Hoare는 null 참조를 "10억 달러짜리 실수"라고 불렀다. 코틀린은 이 문제를 타입 시스템 레벨에서 해결한다.

```kotlin
var name: String = "Kotlin"
name = null  // 컴파일 에러!
```

기본적으로 모든 타입은 null이 될 수 없다. null을 허용하려면 명시적으로 `?`를 붙여야 한다.

```kotlin
var name: String? = "Kotlin"
name = null  // OK
```

이제 컴파일러가 null 가능성을 추적한다. nullable 타입을 그냥 쓰려고 하면 컴파일 에러가 난다.

```kotlin
val length = name.length  // 컴파일 에러! name이 null일 수 있음
```

## 안전 호출 연산자 ?.

nullable 타입의 멤버에 안전하게 접근하는 방법이다.

```kotlin
val name: String? = getUserName()
val length = name?.length  // name이 null이면 null, 아니면 length
```

`?.`은 왼쪽이 null이면 null을 반환하고, 아니면 오른쪽을 실행한다. 체이닝도 가능하다.

```kotlin
val city = user?.address?.city
```

user가 null이거나 address가 null이면 city는 null이 된다. Java였다면 이렇게 썼을 것이다.

```java
String city = null;
if (user != null && user.getAddress() != null) {
    city = user.getAddress().getCity();
}
```

### Spring에서의 활용: Repository 조회

Spring Data JPA에서 `findById`는 `Optional`을 반환한다. 코틀린에서는 이렇게 쓴다.

```kotlin
@Service
class UserService(
    private val userRepository: UserRepository
) {
    fun getUserCity(userId: Long): String? {
        val user = userRepository.findByIdOrNull(userId)
        return user?.address?.city
    }
}
```

`findByIdOrNull`은 Spring Data의 코틀린 확장 함수다. Optional 대신 nullable 타입을 반환해서 코틀린스럽게 쓸 수 있다.

## 엘비스 연산자 ?:

null일 때 기본값을 지정한다.

```kotlin
val name = userName ?: "Guest"
```

userName이 null이면 "Guest"를 쓴다. Java의 삼항 연산자와 비슷하지만 더 간결하다.

```java
// Java
String name = userName != null ? userName : "Guest";
```

### Spring에서의 활용: 기본값 처리

```kotlin
@RestController
class UserController(
    private val userService: UserService
) {
    @GetMapping("/users/{id}")
    fun getUser(@PathVariable id: Long): UserResponse {
        val user = userService.findById(id)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

        return UserResponse(
            name = user.name,
            email = user.email ?: "이메일 없음",
            phone = user.phone ?: "전화번호 없음"
        )
    }
}
```

엘비스 연산자 오른쪽에 throw를 쓸 수 있다. 값이 없으면 예외를 던지는 패턴이다.

```kotlin
val user = userRepository.findByIdOrNull(id)
    ?: throw EntityNotFoundException("User not found: $id")
```

## Not-null 단언 연산자 !!

"나는 이게 null이 아니라는 걸 확신한다"고 컴파일러에게 알려준다.

```kotlin
val name: String? = "Kotlin"
val length = name!!.length  // null이면 NPE 발생
```

null이면 NullPointerException이 터진다. 코틀린의 Null Safety를 우회하는 것이라 **가능하면 쓰지 않는 게 좋다**.

그래도 쓸 때가 있다. 테스트 코드에서 자주 본다.

```kotlin
@Test
fun `사용자 생성 테스트`() {
    val user = userService.createUser("test@example.com")

    assertThat(user).isNotNull()
    assertThat(user!!.email).isEqualTo("test@example.com")
}
```

테스트에서는 null이면 어차피 실패해야 하니까 `!!`를 써도 괜찮다.

## 안전한 캐스팅 as?

캐스팅이 실패하면 null을 반환한다.

```kotlin
val number: Int? = value as? Int
```

Java의 instanceof 체크 + 캐스팅을 한 번에 한다. 실패해도 ClassCastException이 안 난다.

### Spring에서의 활용: 다형성 처리

```kotlin
@Service
class NotificationService {
    fun send(notification: Notification) {
        (notification as? EmailNotification)?.let {
            sendEmail(it.to, it.subject, it.body)
        }

        (notification as? SmsNotification)?.let {
            sendSms(it.phoneNumber, it.message)
        }
    }
}
```

## let 함수

nullable 타입을 non-null로 변환해서 블록 안에서 쓸 수 있다.

```kotlin
val name: String? = "Kotlin"
name?.let {
    println("Name is $it")  // it은 non-null String
}
```

`?.let`은 null이 아닐 때만 블록을 실행한다. 블록 안에서 `it`은 non-null이다.

### Spring에서의 활용: 조건부 로직

```kotlin
@Service
class OrderService(
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    fun placeOrder(userId: Long, order: Order): OrderResult {
        val user = userRepository.findByIdOrNull(userId)
            ?: return OrderResult.failure("User not found")

        // 이메일이 있을 때만 발송
        user.email?.let { email ->
            emailService.sendOrderConfirmation(email, order)
        }

        return OrderResult.success(order.id)
    }
}
```

이메일이 null이면 발송을 건너뛴다. if문 없이 깔끔하게 처리된다.

## 플랫폼 타입과 Java 호환

Java 코드를 호출하면 "플랫폼 타입"이 된다. 컴파일러가 null 여부를 알 수 없다.

```kotlin
// Java 메서드 호출
val name = javaObject.getName()  // String! (플랫폼 타입)
```

`String!`은 "String인지 String?인지 모른다"는 뜻이다. 이때 주의가 필요하다.

### Spring에서 자주 만나는 상황

```kotlin
@RestController
class ApiController {
    @GetMapping("/search")
    fun search(@RequestParam query: String): List<Result> {
        // query가 없으면? Spring이 400 에러를 던짐
        return searchService.search(query)
    }

    @GetMapping("/search-optional")
    fun searchOptional(
        @RequestParam(required = false) query: String?
    ): List<Result> {
        // query가 없으면 null
        return query?.let { searchService.search(it) }
            ?: emptyList()
    }
}
```

`@RequestParam`의 required가 true(기본값)면 non-null로 선언해도 안전하다. Spring이 없으면 400을 던지니까. required = false면 nullable로 선언해야 한다.

### Entity에서의 Null Safety

```kotlin
@Entity
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val email: String,

    @Column(nullable = true)
    val nickname: String? = null,

    @Column(nullable = true)
    val profileImageUrl: String? = null
)
```

DB 컬럼의 nullable과 코틀린 타입을 맞춰주면 된다. `nullable = false`인 컬럼은 non-null 타입으로, `nullable = true`인 컬럼은 nullable 타입으로 선언한다.

## 실전 패턴 정리

### 1. 조기 리턴 패턴

```kotlin
fun processUser(userId: Long): Result {
    val user = userRepository.findByIdOrNull(userId)
        ?: return Result.notFound()

    val subscription = user.subscription
        ?: return Result.noSubscription()

    // 여기서부터 user와 subscription은 non-null
    return processSubscription(user, subscription)
}
```

### 2. 기본값 체이닝

```kotlin
fun getDisplayName(user: User): String {
    return user.nickname
        ?: user.email.substringBefore("@")
        ?: "Unknown"
}
```

### 3. null 체크와 스마트 캐스트

```kotlin
fun sendNotification(user: User) {
    val email = user.email
    if (email != null) {
        // email은 여기서 String (non-null)
        emailService.send(email, "Welcome!")
    }
}
```

if문으로 null 체크하면 블록 안에서 스마트 캐스트가 된다.

## 정리

| 연산자 | 용도 | 예시 |
|--------|------|------|
| `?.` | 안전 호출 | `user?.name` |
| `?:` | 기본값 (엘비스) | `name ?: "Guest"` |
| `!!` | not-null 단언 | `name!!.length` |
| `as?` | 안전 캐스팅 | `value as? Int` |
| `?.let` | null 아닐 때 실행 | `name?.let { ... }` |

Null Safety는 코틀린의 핵심 기능이다. 처음엔 `?`와 `!!`가 번거롭게 느껴질 수 있지만, 익숙해지면 NPE 걱정 없이 코드를 작성할 수 있다. 특히 Spring과 함께 쓰면 더 안전하고 간결한 코드가 된다.

## 다음 글에서는

다음 글에서는 코틀린의 함수를 다룰 예정이다. 기본값 파라미터, named arguments, 확장 함수 등 Java에는 없는 편리한 기능들을 살펴본다.
