---
title: 'IoC와 DI - Spring의 핵심'
description: '제어의 역전과 의존성 주입이 왜 필요한지, Spring이 어떻게 구현하는지 정리했습니다'
pubDate: 'Dec 12 2024'
tags: ['Spring', 'Architecture']
series: 'spring-fundamentals'
seriesOrder: 1
---

Spring을 처음 배울 때 IoC, DI라는 용어가 어렵게 느껴집니다. 막연히 "@Autowired를 붙이면 알아서 주입된다" 정도로만 알고 있으면, 문제가 생겼을 때 원인을 찾기 어렵습니다.

## 의존성이란

클래스 A가 클래스 B를 사용하면, A는 B에 의존한다고 합니다.

```java
public class OrderService {
    private final OrderRepository orderRepository = new OrderRepository();

    public void createOrder(Order order) {
        orderRepository.save(order);
    }
}
```

OrderService는 OrderRepository에 의존합니다. OrderService가 동작하려면 OrderRepository가 필요합니다.

문제는 이 코드에서 OrderService가 직접 OrderRepository를 생성한다는 점입니다.

### 강한 결합의 문제

```java
// 테스트하려면 실제 DB 연결이 필요
@Test
void createOrderTest() {
    OrderService service = new OrderService();  // 내부에서 실제 Repository 생성
    service.createOrder(new Order());  // DB에 저장됨
}
```

테스트할 때 가짜 Repository를 넣을 수 없습니다. OrderService 내부에서 `new OrderRepository()`를 하기 때문입니다.

```java
// Repository 구현체를 바꾸려면?
public class OrderService {
    // new JpaOrderRepository()로 바꿔야 함
    // 모든 Service 코드 수정 필요
    private final OrderRepository orderRepository = new JpaOrderRepository();
}
```

구현체를 변경하려면 OrderService 코드를 수정해야 합니다.

## 의존성 주입 (DI)

의존성 주입은 객체를 외부에서 받는 방식입니다.

```java
public class OrderService {
    private final OrderRepository orderRepository;

    // 외부에서 Repository를 받음
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

이제 어떤 Repository를 사용할지는 OrderService가 결정하지 않습니다. 외부에서 주입해줍니다.

```java
// 테스트: 가짜 Repository 주입
@Test
void createOrderTest() {
    OrderRepository fakeRepo = new FakeOrderRepository();
    OrderService service = new OrderService(fakeRepo);

    service.createOrder(new Order());

    assertThat(fakeRepo.findAll()).hasSize(1);
}

// 운영: 실제 Repository 주입
OrderRepository realRepo = new JpaOrderRepository(entityManager);
OrderService service = new OrderService(realRepo);
```

Service 코드 수정 없이 Repository 구현체를 바꿀 수 있습니다.

## 제어의 역전 (IoC)

기존 방식에서는 OrderService가 직접 OrderRepository를 생성했습니다. **제어권**이 OrderService에 있었습니다.

```java
// 기존: OrderService가 제어권을 가짐
private final OrderRepository repo = new OrderRepository();
```

DI를 적용하면 **제어권이 외부로 넘어갑니다**. 이것을 제어의 역전이라고 합니다.

```java
// IoC: 외부에서 제어
public OrderService(OrderRepository repo) {
    this.repo = repo;  // 누군가 넣어줌
}
```

"제어권이 역전되었다"는 말은 객체 생성과 의존성 연결을 코드가 아닌 외부에서 담당한다는 뜻입니다.

## Spring의 IoC Container

Spring은 이 "외부"를 담당하는 컨테이너를 제공합니다. ApplicationContext라고 부릅니다.

```java
@Configuration
public class AppConfig {
    @Bean
    public OrderRepository orderRepository() {
        return new JpaOrderRepository();
    }

    @Bean
    public OrderService orderService(OrderRepository orderRepository) {
        return new OrderService(orderRepository);
    }
}
```

Spring이 하는 일:

1. `@Bean` 메서드를 호출해서 객체를 생성합니다
2. 생성된 객체를 컨테이너에 등록합니다 (Bean)
3. 의존성이 필요한 곳에 알맞은 Bean을 주입합니다

실제로는 `@Component`, `@Service` 같은 어노테이션으로 더 간단하게 등록합니다.

```java
@Repository
public class JpaOrderRepository implements OrderRepository {
    // ...
}

@Service
public class OrderService {
    private final OrderRepository orderRepository;

    // Spring이 JpaOrderRepository를 주입
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

## 주입 방식 3가지

### 생성자 주입 (권장)

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

장점:
- 불변성 보장 (`final` 사용 가능)
- 필수 의존성을 명확히 표현
- 테스트하기 쉬움

생성자가 하나면 `@Autowired` 생략 가능합니다 (Spring 4.3+).

### 필드 주입

```java
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;  // final 불가
}
```

코드가 간결하지만 권장하지 않습니다.
- 테스트 시 의존성 주입이 어려움
- 순환 참조를 런타임에야 발견
- 불변성 보장 불가

### Setter 주입

```java
@Service
public class OrderService {
    private OrderRepository orderRepository;

    @Autowired
    public void setOrderRepository(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

선택적 의존성에 사용합니다. 필수 의존성에는 생성자 주입을 사용하세요.

## Bean 등록 방법

### 컴포넌트 스캔

`@Component`와 그 하위 어노테이션을 붙이면 자동 등록됩니다.

```java
@Component      // 일반 컴포넌트
@Service        // 서비스 레이어
@Repository     // 데이터 접근 레이어
@Controller     // 웹 컨트롤러
```

Spring Boot는 메인 클래스 패키지 하위를 자동으로 스캔합니다.

```
com.example.app
├── Application.java    (@SpringBootApplication)
├── service/
│   └── OrderService.java   ← 스캔됨
└── repository/
    └── OrderRepository.java  ← 스캔됨
```

### 직접 등록

외부 라이브러리 클래스는 `@Bean`으로 직접 등록합니다.

```java
@Configuration
public class AppConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule());
    }
}
```

## 같은 타입 Bean이 여러 개일 때

인터페이스 구현체가 여러 개면 어떤 것을 주입할지 알 수 없습니다.

```java
@Repository
public class JpaOrderRepository implements OrderRepository { }

@Repository
public class RedisOrderRepository implements OrderRepository { }

@Service
public class OrderService {
    // 어떤 걸 주입해야 할까?
    public OrderService(OrderRepository orderRepository) { }
}
```

### @Primary

기본으로 사용할 Bean을 지정합니다.

```java
@Primary
@Repository
public class JpaOrderRepository implements OrderRepository { }
```

### @Qualifier

이름으로 특정 Bean을 지정합니다.

```java
@Service
public class OrderService {
    public OrderService(@Qualifier("redisOrderRepository") OrderRepository repo) { }
}
```

### 필드명 매칭

필드명과 Bean 이름이 같으면 자동 매칭됩니다.

```java
@Service
public class OrderService {
    // jpaOrderRepository Bean을 주입
    public OrderService(OrderRepository jpaOrderRepository) { }
}
```

## 순환 참조

A가 B를, B가 A를 의존하면 순환 참조입니다.

```java
@Service
public class ServiceA {
    public ServiceA(ServiceB b) { }
}

@Service
public class ServiceB {
    public ServiceB(ServiceA a) { }  // 순환!
}
```

생성자 주입에서는 애플리케이션 시작 시 에러가 발생합니다.

```
The dependencies of some of the beans in the application context form a cycle
```

해결 방법:
- 설계를 다시 검토합니다 (가장 좋음)
- 공통 로직을 별도 클래스로 분리합니다
- `@Lazy`로 지연 로딩합니다 (권장하지 않음)

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- 의존성 주입은 객체를 외부에서 받는 방식입니다
- IoC는 객체 생성과 연결의 제어권이 외부로 넘어가는 것입니다
- Spring의 IoC Container가 Bean 생성과 주입을 담당합니다
- 생성자 주입을 기본으로 사용하세요

다음 글에서는 Spring AOP에 대해 다루겠습니다.
