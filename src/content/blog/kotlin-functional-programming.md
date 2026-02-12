---
title: '코틀린 함수형 프로그래밍 - 고차 함수, 람다, 스코프 함수 완벽 정리'
description: '코틀린의 함수형 프로그래밍을 Spring 실전 예시와 함께 알아봅니다. 고차 함수, 람다, 확장 함수, 스코프 함수를 다룹니다.'
pubDate: 2026-02-12
tags: ['Kotlin', 'Spring']
series: 'kotlin-fundamentals'
seriesOrder: 5
---

Java에서 코틀린으로 넘어오면 가장 먼저 느끼는 차이가 있습니다. 함수를 변수처럼 다루는 코드가 곳곳에 있다는 것입니다. `map`, `filter`는 기본이고, `let`, `apply` 같은 스코프 함수까지. 처음 보면 낯설지만, 한 번 익숙해지면 Java로 돌아가기 어렵습니다.

## 함수 기본

코틀린에서 함수는 `fun` 키워드로 선언합니다.

```kotlin
fun add(a: Int, b: Int): Int {
    return a + b
}
```

본문이 하나의 표현식이면 중괄호 없이 쓸 수 있습니다.

```kotlin
fun add(a: Int, b: Int): Int = a + b
```

반환 타입도 추론됩니다.

```kotlin
fun add(a: Int, b: Int) = a + b
```

Java에서는 불가능한 문법입니다. 코틀린에서 함수는 훨씬 가볍습니다.

### 기본값과 named argument

```kotlin
fun greet(name: String, greeting: String = "안녕하세요") {
    println("$greeting, $name!")
}

greet("Kim")                          // 안녕하세요, Kim!
greet("Park", "반갑습니다")             // 반갑습니다, Park!
greet(greeting = "Hello", name = "Lee") // Hello, Lee!
```

Java에서 메서드 오버로딩을 여러 개 만들던 것을 기본값 하나로 해결합니다.

## 고차 함수

**고차 함수(Higher-Order Function)** 는 함수를 파라미터로 받거나, 함수를 반환하는 함수입니다. 코틀린에서 함수는 일급 시민(first-class citizen)이라 변수에 담을 수 있고, 다른 함수에 넘길 수 있습니다.

```kotlin
fun calculate(a: Int, b: Int, operation: (Int, Int) -> Int): Int {
    return operation(a, b)
}

val result1 = calculate(10, 20) { a, b -> a + b }  // 30
val result2 = calculate(10, 20) { a, b -> a * b }  // 200
```

`(Int, Int) -> Int`가 함수 타입입니다. "Int 두 개를 받아서 Int를 반환하는 함수"라는 뜻입니다.

### Java와 비교

Java에서 같은 일을 하려면 함수형 인터페이스가 필요합니다.

```java
// Java
public int calculate(int a, int b, BiFunction<Integer, Integer, Integer> operation) {
    return operation.apply(a, b);
}

int result = calculate(10, 20, (a, b) -> a + b);
```

동작은 같지만, 코틀린은 별도의 인터페이스 없이 함수 타입을 직접 씁니다.

### 함수를 변수에 담기

```kotlin
val sum: (Int, Int) -> Int = { a, b -> a + b }
val multiply = { a: Int, b: Int -> a * b }

println(sum(3, 4))       // 7
println(multiply(3, 4))  // 12
```

### 함수 참조

이미 있는 함수를 넘길 때는 `::` 연산자를 씁니다.

```kotlin
fun isEven(n: Int): Boolean = n % 2 == 0

val numbers = listOf(1, 2, 3, 4, 5)
val evens = numbers.filter(::isEven)  // [2, 4]
```

## 람다 표현식

람다는 이름 없는 함수입니다. 코틀린에서 가장 많이 쓰는 문법 중 하나입니다.

```kotlin
val square = { n: Int -> n * n }
println(square(5))  // 25
```

### 람다 문법 규칙

코틀린 람다에는 몇 가지 편의 문법이 있습니다.

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// 기본 형태
numbers.filter({ n: Int -> n > 3 })

// 타입 추론
numbers.filter({ n -> n > 3 })

// 마지막 파라미터가 람다면 괄호 밖으로
numbers.filter() { n -> n > 3 }

// 빈 괄호 생략
numbers.filter { n -> n > 3 }

// 파라미터가 하나면 it으로 대체
numbers.filter { it > 3 }
```

모두 같은 결과입니다. 마지막 형태가 가장 많이 쓰입니다. 처음 보면 마법처럼 보이지만, 한 단계씩 줄여나간 것뿐입니다.

### 여러 줄 람다

```kotlin
val result = numbers.map {
    val doubled = it * 2
    val formatted = "Number: $doubled"
    formatted  // 마지막 표현식이 반환값
}
// [Number: 2, Number: 4, Number: 6, Number: 8, Number: 10]
```

람다의 마지막 표현식이 자동으로 반환됩니다. `return` 키워드를 쓰지 않습니다.

### 구조 분해

```kotlin
val map = mapOf("A" to 1, "B" to 2, "C" to 3)

map.forEach { (key, value) ->
    println("$key = $value")
}
```

## 확장 함수

기존 클래스에 함수를 추가하는 기능입니다. 클래스를 상속하거나 수정하지 않고도 새 함수를 넣을 수 있습니다.

```kotlin
fun String.addExclamation(): String {
    return this + "!"
}

println("Hello".addExclamation())  // Hello!
```

`String.`이 수신 객체 타입(receiver type)입니다. 함수 안에서 `this`로 수신 객체에 접근합니다.

### 실용적인 확장 함수

```kotlin
// 빈 문자열을 null로 변환
fun String?.toNullIfBlank(): String? {
    return if (this.isNullOrBlank()) null else this
}

val input = "  "
val result = input.toNullIfBlank()  // null
```

```kotlin
// 날짜 포맷
fun LocalDateTime.toKoreanFormat(): String {
    return this.format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm"))
}

val now = LocalDateTime.now()
println(now.toKoreanFormat())  // 2026년 02월 12일 14:30
```

### Spring에서의 활용: Entity → DTO 변환

```kotlin
// 확장 함수로 변환 로직 분리
fun User.toResponse() = UserResponse(
    id = this.id,
    name = this.name,
    email = this.email
)

fun Order.toResponse() = OrderResponse(
    id = this.id,
    userId = this.userId,
    totalAmount = this.totalAmount,
    status = this.status.name
)

// 컨트롤러에서 사용
@RestController
class UserController(private val userService: UserService) {
    @GetMapping("/users/{id}")
    fun getUser(@PathVariable id: Long): UserResponse {
        return userService.findById(id).toResponse()
    }

    @GetMapping("/users/{id}/orders")
    fun getUserOrders(@PathVariable id: Long): List<OrderResponse> {
        return userService.getOrders(id).map { it.toResponse() }
    }
}
```

`companion object`에 `from()` 팩토리 메서드를 만드는 방법도 있지만, 확장 함수를 쓰면 Entity가 DTO를 알 필요가 없습니다.

### Spring에서의 활용: Repository 커스텀

```kotlin
// Repository 확장
fun UserRepository.findByEmailOrThrow(email: String): User {
    return findByEmail(email)
        ?: throw EntityNotFoundException("User not found: $email")
}

// Service에서 사용
@Service
class UserService(private val userRepository: UserRepository) {
    fun getUserByEmail(email: String): User {
        return userRepository.findByEmailOrThrow(email)
    }
}
```

## 컬렉션 함수형 API

코틀린의 컬렉션은 함수형 API를 기본 제공합니다. Java의 Stream API와 비슷하지만, `.stream()`이나 `.collect()`가 필요 없습니다.

### 변환: map

```kotlin
val names = listOf("kim", "park", "lee")

val upperNames = names.map { it.uppercase() }
// [KIM, PARK, LEE]
```

### 필터: filter

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6)

val evens = numbers.filter { it % 2 == 0 }
// [2, 4, 6]
```

### 분류: groupBy

```kotlin
data class User(val name: String, val department: String)

val users = listOf(
    User("Kim", "Backend"),
    User("Park", "Frontend"),
    User("Lee", "Backend"),
    User("Choi", "Frontend")
)

val byDepartment = users.groupBy { it.department }
// {Backend=[User(Kim, Backend), User(Lee, Backend)], Frontend=[...]}
```

### 집계: fold, reduce

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

val sum = numbers.reduce { acc, n -> acc + n }  // 15

// 초기값이 필요하면 fold
val sumFromTen = numbers.fold(10) { acc, n -> acc + n }  // 25
```

### 체이닝

여러 함수를 연결해서 복잡한 변환을 한 번에 합니다.

```kotlin
data class Order(val userId: Long, val amount: Int, val status: String)

val orders = listOf(
    Order(1, 50_000, "COMPLETED"),
    Order(2, 30_000, "COMPLETED"),
    Order(1, 20_000, "CANCELLED"),
    Order(1, 80_000, "COMPLETED"),
    Order(2, 10_000, "COMPLETED")
)

// 사용자별 완료된 주문의 총 금액
val totalByUser = orders
    .filter { it.status == "COMPLETED" }
    .groupBy { it.userId }
    .mapValues { (_, orders) -> orders.sumOf { it.amount } }
// {1=130000, 2=40000}
```

### Java Stream과 비교

| 구분 | Java Stream | Kotlin |
|------|-------------|--------|
| 시작 | `.stream()` 필요 | 바로 사용 |
| 종료 | `.collect(Collectors.toList())` | 바로 List 반환 |
| 그룹핑 | `Collectors.groupingBy(...)` | `.groupBy { ... }` |
| null 처리 | Optional과 혼합 | `?.`과 자연스럽게 결합 |

```java
// Java
List<String> result = users.stream()
    .filter(u -> u.getAge() > 20)
    .map(User::getName)
    .collect(Collectors.toList());
```

```kotlin
// Kotlin
val result = users
    .filter { it.age > 20 }
    .map { it.name }
```

코틀린이 확실히 간결합니다.

### Spring에서의 활용: 비즈니스 로직

```kotlin
@Service
class OrderService(
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository
) {
    // 부서별 이번 달 매출 집계
    fun getMonthlySalesByDepartment(yearMonth: YearMonth): Map<String, Long> {
        val startDate = yearMonth.atDay(1).atStartOfDay()
        val endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59)

        return orderRepository.findByCreatedAtBetween(startDate, endDate)
            .filter { it.status == OrderStatus.COMPLETED }
            .groupBy { it.department }
            .mapValues { (_, orders) -> orders.sumOf { it.amount } }
    }

    // 우수 고객 목록
    fun getTopCustomers(minOrderCount: Int): List<UserResponse> {
        return orderRepository.findAll()
            .filter { it.status == OrderStatus.COMPLETED }
            .groupBy { it.userId }
            .filter { (_, orders) -> orders.size >= minOrderCount }
            .keys
            .mapNotNull { userRepository.findByIdOrNull(it) }
            .map { it.toResponse() }
    }
}
```

`mapNotNull`은 변환 결과가 null인 것을 자동으로 제외합니다. `map` + `filterNotNull` 대신 한 번에 처리합니다.

## 스코프 함수

코틀린의 스코프 함수는 객체의 컨텍스트 안에서 코드 블록을 실행하는 함수입니다. `let`, `run`, `with`, `apply`, `also` 다섯 가지가 있습니다.

처음엔 다 비슷해 보이지만, 두 가지 기준으로 구분하면 명확합니다.

| 함수 | 객체 참조 | 반환값 |
|------|----------|--------|
| `let` | `it` | 람다 결과 |
| `run` | `this` | 람다 결과 |
| `with` | `this` | 람다 결과 |
| `apply` | `this` | 객체 자신 |
| `also` | `it` | 객체 자신 |

### let - null 처리와 변환

```kotlin
// null이 아닐 때만 실행
val user: User? = findUser(id)
user?.let {
    println("Found: ${it.name}")
    sendWelcomeEmail(it.email)
}

// 변환에 사용
val length = name?.let { it.trim().length } ?: 0
```

`let`은 `it`으로 객체를 참조하고, 람다의 결과를 반환합니다. nullable 처리에서 가장 많이 씁니다.

### run - 객체 설정 + 결과 반환

```kotlin
val result = user.run {
    // this가 user
    validate()
    "${name}님의 주문이 완료되었습니다"
}
```

`run`은 `this`로 객체를 참조합니다. 객체의 메서드를 여러 개 호출하면서 결과를 반환할 때 씁니다.

### with - 이미 있는 객체에 여러 작업

```kotlin
val user = User("Kim", 25)
val description = with(user) {
    // this가 user
    "이름: $name, 나이: $age"
}
```

`with`는 확장 함수가 아니라 일반 함수입니다. `run`과 거의 같지만 호출 방식이 다릅니다. nullable 객체에는 `run`을 쓰는 게 좋습니다.

### apply - 객체 초기화

```kotlin
val user = User().apply {
    name = "Kim"
    age = 25
    email = "kim@example.com"
}
```

`apply`는 객체 자신을 반환합니다. 객체를 만들고 설정하는 패턴에 딱 맞습니다.

#### Spring에서의 활용

```kotlin
@Configuration
class WebConfig : WebMvcConfigurer {
    @Bean
    fun restTemplate(): RestTemplate {
        return RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build()
            .apply {
                interceptors.add(LoggingInterceptor())
                messageConverters.add(0, StringHttpMessageConverter(Charsets.UTF_8))
            }
    }
}
```

### also - 부수 효과 (로깅, 검증)

```kotlin
val user = userRepository.save(newUser)
    .also { log.info("User created: ${it.id}") }
```

`also`도 객체 자신을 반환하지만 `it`으로 참조합니다. 체이닝 중간에 로깅이나 검증을 끼워넣을 때 씁니다.

#### Spring에서의 활용

```kotlin
@Service
class UserService(
    private val userRepository: UserRepository,
    private val eventPublisher: ApplicationEventPublisher
) {
    fun createUser(request: UserCreateRequest): UserResponse {
        return User(
            name = request.name,
            email = request.email
        )
            .let { userRepository.save(it) }
            .also { eventPublisher.publishEvent(UserCreatedEvent(it.id)) }
            .also { log.info("User created: id=${it.id}, name=${it.name}") }
            .toResponse()
    }
}
```

`let`으로 변환하고, `also`로 부수 효과를 넣고, 마지막에 응답으로 변환합니다.

### 어떤 스코프 함수를 써야 할까

- **null 처리** → `let` (`?.let { ... }`)
- **객체 초기화** → `apply` (빌더처럼 설정)
- **로깅, 검증 끼워넣기** → `also` (체이닝 중간에)
- **객체에서 결과 뽑기** → `run` 또는 `with`

## 인라인 함수

고차 함수를 쓰면 람다가 객체로 생성되어 약간의 오버헤드가 있습니다. `inline` 키워드를 붙이면 컴파일 시점에 함수 본문이 호출 지점에 삽입됩니다.

```kotlin
inline fun <T> measureTime(block: () -> T): T {
    val start = System.currentTimeMillis()
    val result = block()
    val elapsed = System.currentTimeMillis() - start
    println("Elapsed: ${elapsed}ms")
    return result
}

// 호출
val users = measureTime {
    userRepository.findAll()
}
```

컴파일 후에는 이렇게 됩니다.

```kotlin
// 인라인 적용 후 (개념적)
val start = System.currentTimeMillis()
val users = userRepository.findAll()
val elapsed = System.currentTimeMillis() - start
println("Elapsed: ${elapsed}ms")
```

람다 객체가 생성되지 않습니다. 코틀린 표준 라이브러리의 `let`, `run`, `apply`, `also`, `filter`, `map` 등이 모두 `inline`으로 선언되어 있어서 성능 걱정 없이 쓸 수 있습니다.

## Java와 비교

| 구분 | Java | Kotlin |
|------|------|--------|
| 람다 | `(a, b) -> a + b` | `{ a, b -> a + b }` |
| 함수 타입 | `BiFunction<A, B, R>` | `(A, B) -> R` |
| 확장 함수 | 없음 (유틸 클래스) | `fun Type.name()` |
| 스코프 함수 | 없음 | `let`, `run`, `apply`, `also`, `with` |
| 컬렉션 변환 | Stream API | 기본 제공 |
| 인라인 | 없음 | `inline fun` |

## 정리

- 코틀린에서 함수는 일급 시민입니다. 변수에 담고, 파라미터로 넘기고, 반환할 수 있습니다.
- 람다의 마지막 표현식이 반환값입니다. 파라미터가 하나면 `it`으로 쓸 수 있습니다.
- 확장 함수로 기존 클래스에 함수를 추가합니다. Entity → DTO 변환, Repository 유틸 등에 유용합니다.
- 컬렉션 API는 `filter`, `map`, `groupBy` 등을 `.stream()` 없이 바로 씁니다.
- 스코프 함수는 목적에 맞게 고릅니다: null 처리(`let`), 초기화(`apply`), 로깅(`also`), 결과 반환(`run`/`with`).
- 스코프 함수와 컬렉션 함수는 `inline`이라 성능 오버헤드가 없습니다.
