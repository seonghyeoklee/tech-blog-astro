---
title: '코틀린 클래스와 객체 - class, data class, object 완벽 정리'
description: '코틀린의 클래스 선언, 생성자, data class, object, companion object를 Spring 예시와 함께 알아봅니다.'
pubDate: 2026-01-09
tags: ['Kotlin', 'Spring']
series: 'kotlin-fundamentals'
seriesOrder: 4
---

## 클래스 기본

코틀린에서 클래스를 선언하는 방법이다.

```kotlin
class User {
    var name: String = ""
    var age: Int = 0
}
```

인스턴스를 만들 때 `new` 키워드가 필요 없다.

```kotlin
val user = User()
user.name = "Kim"
user.age = 25
```

## 주 생성자

클래스 이름 옆에 생성자를 선언할 수 있다. 이걸 주 생성자(primary constructor)라고 한다.

```kotlin
class User(val name: String, val age: Int)
```

이게 끝이다. 프로퍼티 선언과 생성자가 합쳐졌다. Java로 치면 이 코드와 같다.

```java
public class User {
    private final String name;
    private final int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }
}
```

코틀린 한 줄이 Java 열 줄 넘게를 대체한다.

### val과 var

생성자 파라미터에 `val`을 붙이면 읽기 전용 프로퍼티, `var`를 붙이면 수정 가능한 프로퍼티가 된다.

```kotlin
class User(
    val id: Long,        // 읽기 전용
    var name: String,    // 수정 가능
    var email: String
)

val user = User(1, "Kim", "kim@example.com")
user.name = "Park"  // OK
user.id = 2         // 컴파일 에러!
```

### 기본값

파라미터에 기본값을 지정할 수 있다.

```kotlin
class User(
    val name: String,
    val age: Int = 0,
    val email: String = ""
)

val user1 = User("Kim")
val user2 = User("Park", 30)
val user3 = User("Lee", email = "lee@example.com")  // named argument
```

Java의 빌더 패턴이나 여러 생성자 오버로딩이 필요 없어진다.

## init 블록

주 생성자에서 로직을 실행하려면 `init` 블록을 쓴다.

```kotlin
class User(val name: String, val age: Int) {
    init {
        require(name.isNotBlank()) { "이름은 비어있을 수 없습니다" }
        require(age >= 0) { "나이는 0 이상이어야 합니다" }
    }
}
```

`init` 블록은 인스턴스가 생성될 때 실행된다. 여러 개 있으면 순서대로 실행된다.

## 보조 생성자

주 생성자 외에 추가 생성자가 필요하면 `constructor` 키워드를 쓴다.

```kotlin
class User(val name: String, val age: Int) {
    constructor(name: String) : this(name, 0)
    constructor() : this("Unknown", 0)
}
```

보조 생성자는 반드시 주 생성자를 호출해야 한다. 하지만 기본값을 쓰면 보조 생성자가 거의 필요 없다.

## data class

DTO나 값 객체를 만들 때 쓴다. equals, hashCode, toString, copy가 자동 생성된다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val email: String
)
```

### 자동 생성되는 메서드

```kotlin
val user1 = User(1, "Kim", "kim@example.com")
val user2 = User(1, "Kim", "kim@example.com")

println(user1 == user2)      // true (equals)
println(user1.hashCode())    // 동일한 해시코드
println(user1)               // User(id=1, name=Kim, email=kim@example.com)
```

### copy 함수

일부 프로퍼티만 바꾼 새 객체를 만든다.

```kotlin
val user1 = User(1, "Kim", "kim@example.com")
val user2 = user1.copy(name = "Park")

println(user2)  // User(id=1, name=Park, email=kim@example.com)
```

불변 객체를 다룰 때 유용하다.

### Spring에서의 활용: DTO

```kotlin
data class UserCreateRequest(
    val name: String,
    val email: String,
    val age: Int? = null
)

data class UserResponse(
    val id: Long,
    val name: String,
    val email: String
) {
    companion object {
        fun from(user: User): UserResponse {
            return UserResponse(
                id = user.id,
                name = user.name,
                email = user.email
            )
        }
    }
}
```

Request/Response DTO를 data class로 만들면 간결하다.

## object 선언

싱글톤을 만드는 가장 간단한 방법이다.

```kotlin
object DatabaseConfig {
    val url = "jdbc:mysql://localhost:3306/mydb"
    val username = "root"

    fun connect() {
        println("Connecting to $url")
    }
}
```

`object`로 선언하면 인스턴스가 하나만 만들어진다. 클래스가 아니라 객체를 바로 선언하는 것이다.

```kotlin
DatabaseConfig.connect()  // 바로 사용
println(DatabaseConfig.url)
```

Java의 싱글톤 패턴을 언어 레벨에서 지원한다.

### 익명 객체

인터페이스나 추상 클래스의 일회용 구현체를 만들 때 쓴다.

```kotlin
val comparator = object : Comparator<String> {
    override fun compare(s1: String, s2: String): Int {
        return s1.length - s2.length
    }
}
```

Java의 익명 클래스와 비슷하다.

## companion object

클래스 안에 정적 멤버를 넣을 때 쓴다. 코틀린에는 `static` 키워드가 없다.

```kotlin
class User(val name: String) {
    companion object {
        const val MAX_NAME_LENGTH = 50

        fun create(name: String): User {
            require(name.length <= MAX_NAME_LENGTH)
            return User(name)
        }
    }
}

// 사용
val user = User.create("Kim")
println(User.MAX_NAME_LENGTH)
```

`companion object`는 클래스당 하나만 있을 수 있다.

### Spring에서의 활용: 팩토리 메서드

```kotlin
@Entity
class Order private constructor(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    val userId: Long,
    val totalAmount: BigDecimal,
    val status: OrderStatus
) {
    companion object {
        fun create(userId: Long, items: List<OrderItem>): Order {
            val totalAmount = items.sumOf { it.price * it.quantity.toBigDecimal() }
            return Order(
                userId = userId,
                totalAmount = totalAmount,
                status = OrderStatus.PENDING
            )
        }
    }
}
```

생성자를 `private`으로 숨기고 팩토리 메서드를 제공하는 패턴이다.

### Logger 패턴

```kotlin
class UserService {
    companion object {
        private val log = LoggerFactory.getLogger(UserService::class.java)
    }

    fun createUser(name: String) {
        log.info("Creating user: $name")
        // ...
    }
}
```

매 인스턴스마다 Logger를 만들지 않고 공유한다.

## 상속

코틀린의 클래스는 기본적으로 `final`이다. 상속을 허용하려면 `open`을 붙여야 한다.

```kotlin
open class Animal(val name: String) {
    open fun speak() {
        println("...")
    }
}

class Dog(name: String) : Animal(name) {
    override fun speak() {
        println("멍멍!")
    }
}
```

메서드도 마찬가지로 `open`이 있어야 오버라이드할 수 있다.

### Spring에서의 상속

Spring에서는 프록시를 만들어야 해서 클래스가 `final`이면 문제가 된다. `kotlin-spring` 플러그인이 이걸 해결한다.

```kotlin
// build.gradle.kts
plugins {
    kotlin("plugin.spring") version "1.9.0"
}
```

이 플러그인이 `@Component`, `@Service`, `@Repository`, `@Controller` 등이 붙은 클래스를 자동으로 `open`으로 만들어준다.

## 추상 클래스와 인터페이스

### 추상 클래스

```kotlin
abstract class Shape {
    abstract fun area(): Double

    fun describe() {
        println("넓이: ${area()}")
    }
}

class Circle(val radius: Double) : Shape() {
    override fun area() = Math.PI * radius * radius
}
```

### 인터페이스

```kotlin
interface Drawable {
    fun draw()

    fun description(): String {
        return "도형을 그립니다"  // 기본 구현
    }
}

class Circle : Drawable {
    override fun draw() {
        println("원을 그립니다")
    }
}
```

인터페이스도 기본 구현을 가질 수 있다. Java 8의 default 메서드와 같다.

### 다중 구현

```kotlin
interface A {
    fun foo() { println("A") }
}

interface B {
    fun foo() { println("B") }
}

class C : A, B {
    override fun foo() {
        super<A>.foo()
        super<B>.foo()
    }
}
```

## sealed class

상속을 제한하고 싶을 때 쓴다. 같은 파일 안에서만 상속할 수 있다.

```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}
```

`when`과 함께 쓰면 강력하다.

```kotlin
fun handleResult(result: Result<User>) {
    when (result) {
        is Result.Success -> println("User: ${result.data}")
        is Result.Error -> println("Error: ${result.message}")
        is Result.Loading -> println("Loading...")
        // else가 필요 없다! 모든 케이스를 다뤘으므로
    }
}
```

모든 하위 타입을 컴파일러가 알고 있어서 `else`가 필요 없다. 새 하위 타입이 추가되면 컴파일 에러가 나서 누락을 방지한다.

### Spring에서의 활용: API 응답

```kotlin
sealed class ApiResponse<out T> {
    data class Success<T>(val data: T) : ApiResponse<T>()
    data class Error(val code: String, val message: String) : ApiResponse<Nothing>()
}

@Service
class UserService(private val userRepository: UserRepository) {
    fun findUser(id: Long): ApiResponse<User> {
        return userRepository.findByIdOrNull(id)
            ?.let { ApiResponse.Success(it) }
            ?: ApiResponse.Error("NOT_FOUND", "User not found: $id")
    }
}
```

## Java와 비교

| 구분 | Java | Kotlin |
|------|------|--------|
| 클래스 선언 | 필드 + 생성자 + getter/setter | 주 생성자에서 한 번에 |
| 불변 클래스 | final + 모든 메서드 구현 | `val` 프로퍼티 |
| DTO | Lombok 또는 record | `data class` |
| 싱글톤 | 직접 구현 또는 enum | `object` |
| 정적 멤버 | `static` | `companion object` |
| 상속 | 기본 허용 | 기본 불가 (`open` 필요) |
| sealed | Java 17+ sealed class | `sealed class` |

## 정리

- 주 생성자로 프로퍼티와 생성자를 한 번에 선언한다.
- `data class`는 equals, hashCode, toString, copy를 자동 생성한다.
- `object`는 싱글톤을, `companion object`는 정적 멤버를 만든다.
- 클래스는 기본 `final`이다. 상속하려면 `open`이 필요하다.
- `sealed class`는 상속을 제한하고 `when`에서 완전성 검사를 가능하게 한다.

