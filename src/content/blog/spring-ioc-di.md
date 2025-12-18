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

## Bean Lifecycle과 Scope

Bean의 생명주기와 범위를 이해하면 더 효과적으로 사용할 수 있습니다.

### Bean Lifecycle

```java
@Component
public class UserService implements InitializingBean, DisposableBean {

    @PostConstruct
    public void init() {
        System.out.println("1. @PostConstruct");
    }

    @Override
    public void afterPropertiesSet() {
        System.out.println("2. InitializingBean.afterPropertiesSet()");
    }

    @Bean(initMethod = "customInit")
    public void customInit() {
        System.out.println("3. @Bean initMethod");
    }

    @PreDestroy
    public void cleanup() {
        System.out.println("4. @PreDestroy");
    }

    @Override
    public void destroy() {
        System.out.println("5. DisposableBean.destroy()");
    }

    @Bean(destroyMethod = "customDestroy")
    public void customDestroy() {
        System.out.println("6. @Bean destroyMethod");
    }
}
```

**생명주기 순서:**
```
생성:
1. 생성자 호출
2. 의존성 주입
3. @PostConstruct
4. InitializingBean.afterPropertiesSet()
5. @Bean initMethod

소멸:
1. @PreDestroy
2. DisposableBean.destroy()
3. @Bean destroyMethod
```

**권장 방식**: `@PostConstruct`, `@PreDestroy` 사용 (Java 표준)

### Bean Scope

```java
// Singleton (기본값) - 애플리케이션 전체에서 하나
@Scope("singleton")
@Component
public class SingletonBean { }

// Prototype - 요청마다 새로 생성
@Scope("prototype")
@Component
public class PrototypeBean { }

// Request - HTTP 요청당 하나 (웹 환경)
@Scope("request")
@Component
public class RequestScopedBean { }

// Session - HTTP 세션당 하나 (웹 환경)
@Scope("session")
@Component
public class SessionScopedBean { }
```

**Scope 비교:**

| Scope | 생성 시점 | 소멸 시점 | 사용 사례 |
|-------|----------|----------|----------|
| **singleton** | 애플리케이션 시작 | 애플리케이션 종료 | 상태 없는 서비스 |
| **prototype** | 요청 시마다 | 사용자가 관리 | 상태 있는 객체 |
| **request** | HTTP 요청 시작 | HTTP 요청 종료 | 요청별 컨텍스트 |
| **session** | HTTP 세션 생성 | HTTP 세션 만료 | 사용자별 상태 |

**Singleton + Prototype 함께 사용 시 주의:**

```java
@Component
public class SingletonBean {
    @Autowired
    private PrototypeBean prototypeBean;  // 한 번만 주입됨!

    public void doSomething() {
        // 항상 같은 PrototypeBean 사용 (의도와 다름)
        prototypeBean.process();
    }
}
```

해결 방법: Provider 사용 (아래 참조)

## 고급 주입 기법

### Provider - 지연 주입

```java
@Component
public class SingletonBean {
    @Autowired
    private Provider<PrototypeBean> prototypeBeanProvider;

    public void doSomething() {
        // 매번 새로운 PrototypeBean 생성
        PrototypeBean bean = prototypeBeanProvider.get();
        bean.process();
    }
}
```

```java
// ObjectFactory 사용 (Provider의 Spring 버전)
@Autowired
private ObjectFactory<PrototypeBean> prototypeBeanFactory;

public void doSomething() {
    PrototypeBean bean = prototypeBeanFactory.getObject();
}
```

**트레이드오프:**
- **장점**: Scope 문제 해결, 지연 로딩
- **단점**: 매번 조회 오버헤드, 코드 복잡도 증가

### @Lookup - 메서드 주입

```java
@Component
public abstract class SingletonBean {
    public void doSomething() {
        // 매번 새로운 PrototypeBean 반환
        PrototypeBean bean = createPrototypeBean();
        bean.process();
    }

    @Lookup
    protected abstract PrototypeBean createPrototypeBean();
}
```

Spring이 런타임에 CGLIB 프록시로 메서드 구현을 제공합니다.

**트레이드오프:**
- **장점**: 깔끔한 코드, Spring이 자동 구현
- **단점**: 추상 클래스 필요, CGLIB 프록시 오버헤드

### @Conditional - 조건부 Bean 등록

```java
@Configuration
public class DatabaseConfig {

    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mysql")
    public DataSource mysqlDataSource() {
        return new HikariDataSource();
    }

    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "h2")
    public DataSource h2DataSource() {
        return new EmbeddedDatabaseBuilder().build();
    }

    @Bean
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource defaultDataSource() {
        return new SimpleDataSource();
    }
}
```

**주요 @Conditional 어노테이션:**

| 어노테이션 | 조건 |
|----------|------|
| `@ConditionalOnProperty` | 프로퍼티 값 기준 |
| `@ConditionalOnClass` | 클래스 존재 여부 |
| `@ConditionalOnMissingBean` | Bean 미존재 시 |
| `@ConditionalOnBean` | Bean 존재 시 |
| `@ConditionalOnExpression` | SpEL 표현식 |

### @Profile - 환경별 Bean

```java
@Configuration
@Profile("dev")
public class DevConfig {
    @Bean
    public DataSource dataSource() {
        return new H2DataSource();  // 개발 환경
    }
}

@Configuration
@Profile("prod")
public class ProdConfig {
    @Bean
    public DataSource dataSource() {
        return new MySQLDataSource();  // 운영 환경
    }
}
```

```yaml
# application.yml
spring:
  profiles:
    active: dev  # dev 또는 prod
```

**트레이드오프:**
- **장점**: 환경별 설정 분리, 명확한 구분
- **단점**: 설정 파일 증가, 프로파일 관리 필요

## 아키텍처로 풀어내는 DI

애플리케이션이 커지면 Bean 관리가 복잡해집니다. 아키텍처 레벨의 해결책이 필요합니다.

### 1단계: 계층별 모듈 분리

**문제:** 모든 Bean이 하나의 패키지에 있으면 관리 어려움

```
com.example.app
├── controller/
│   ├── UserController
│   └── OrderController
├── service/
│   ├── UserService
│   └── OrderService
└── repository/
    ├── UserRepository
    └── OrderRepository
```

**개선: 도메인별 모듈 분리**

```
com.example.app
├── user/
│   ├── UserController
│   ├── UserService
│   └── UserRepository
├── order/
│   ├── OrderController
│   ├── OrderService
│   └── OrderRepository
└── common/
    └── CommonConfig
```

**트레이드오프:**
- **장점**: 도메인 응집도 향상, 독립적 개발
- **단점**: 모듈 간 의존성 관리 복잡

### 2단계: Multi-Module 프로젝트

**문제:** 단일 모듈에서 모든 도메인 관리 시 빌드 시간 증가, 의존성 경계 모호

```
project-root/
├── user-module/
│   ├── src/
│   └── build.gradle
├── order-module/
│   ├── src/
│   └── build.gradle
├── common-module/
│   ├── src/
│   └── build.gradle
└── app-module/
    ├── src/ (메인 애플리케이션)
    └── build.gradle
```

```groovy
// app-module/build.gradle
dependencies {
    implementation project(':user-module')
    implementation project(':order-module')
    implementation project(':common-module')
}
```

```java
// app-module
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.example.user",
    "com.example.order",
    "com.example.common"
})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**트레이드오프:**
- **장점**: 명확한 의존성 경계, 독립적 빌드, 재사용 가능
- **단점**: 초기 설정 복잡, 모듈 간 순환 의존 주의

### 3단계: Spring Boot Auto-configuration

**문제:** 공통 설정을 매 프로젝트마다 반복

**해결: Custom Starter 생성**

```java
// my-library-spring-boot-starter
@Configuration
@ConditionalOnClass(MyLibrary.class)
@EnableConfigurationProperties(MyLibraryProperties.class)
public class MyLibraryAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public MyLibrary myLibrary(MyLibraryProperties properties) {
        return new MyLibrary(properties.getApiKey());
    }
}
```

```java
@ConfigurationProperties(prefix = "mylibrary")
public class MyLibraryProperties {
    private String apiKey;
    // getters/setters
}
```

```
# META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.MyLibraryAutoConfiguration
```

**사용:**

```groovy
// 다른 프로젝트에서
dependencies {
    implementation 'com.example:my-library-spring-boot-starter:1.0.0'
}
```

```yaml
# application.yml
mylibrary:
  api-key: your-api-key
```

자동으로 Bean이 등록되고 주입됩니다.

**트레이드오프:**
- **장점**: 설정 자동화, 재사용성, Convention over Configuration
- **단점**: 디버깅 어려움, 자동 설정 이해 필요

### 4단계: Configuration 분리 전략

**문제:** 모든 설정이 하나의 클래스에 있으면 관리 어려움

**전략 1: 기능별 Configuration**

```java
@Configuration
public class DatabaseConfig {
    @Bean
    public DataSource dataSource() { }

    @Bean
    public JpaTransactionManager transactionManager() { }
}

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain() { }

    @Bean
    public PasswordEncoder passwordEncoder() { }
}

@Configuration
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() { }
}
```

**전략 2: @Import로 조합**

```java
@Configuration
@Import({
    DatabaseConfig.class,
    SecurityConfig.class,
    CacheConfig.class
})
public class AppConfig {
}
```

**전략 3: @Enable* 커스텀 어노테이션**

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Import(MyFeatureConfiguration.class)
public @interface EnableMyFeature {
}

@Configuration
@EnableMyFeature  // 한 줄로 기능 활성화
public class AppConfig {
}
```

**트레이드오프:**
- **장점**: 명확한 책임 분리, 재사용 가능
- **단점**: 파일 수 증가, Import 관리 필요

### 5단계: 테스트 전략

**문제:** 실제 Bean을 사용하면 테스트 느림, DB 의존성

**해결 1: @MockBean**

```java
@SpringBootTest
class OrderServiceTest {

    @MockBean
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    @Test
    void createOrder() {
        // Given
        when(orderRepository.save(any())).thenReturn(new Order());

        // When
        orderService.createOrder(new OrderRequest());

        // Then
        verify(orderRepository, times(1)).save(any());
    }
}
```

**해결 2: @WebMvcTest (Controller 레이어만)**

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @MockBean
    private UserService userService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getUser() throws Exception {
        when(userService.getUser(1L)).thenReturn(new User());

        mockMvc.perform(get("/users/1"))
            .andExpect(status().isOk());
    }
}
```

**해결 3: @DataJpaTest (Repository 레이어만)**

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmail() {
        User user = userRepository.findByEmail("test@example.com");
        assertThat(user).isNotNull();
    }
}
```

**해결 4: TestConfiguration**

```java
@TestConfiguration
public class TestConfig {
    @Bean
    @Primary  // 테스트용 Bean이 우선
    public UserService testUserService() {
        return new FakeUserService();
    }
}

@SpringBootTest
@Import(TestConfig.class)
class IntegrationTest {
    @Autowired
    private UserService userService;  // FakeUserService 주입됨
}
```

**테스트 전략 비교:**

| 전략 | 속도 | 범위 | 사용 사례 |
|------|------|------|----------|
| **단위 테스트** (Mockito) | 빠름 | 단일 클래스 | 비즈니스 로직 |
| **@WebMvcTest** | 중간 | Controller | API 테스트 |
| **@DataJpaTest** | 중간 | Repository | DB 쿼리 |
| **@SpringBootTest** | 느림 | 전체 | 통합 테스트 |

**트레이드오프:**
- **장점**: 빠른 테스트, 격리된 환경, 외부 의존 제거
- **단점**: Mock 설정 복잡, 통합 테스트 필요성 여전히 존재

### 아키텍처 선택 가이드

| 프로젝트 규모 | 권장 아키텍처 | 이유 |
|-------------|-------------|------|
| **소규모 (~10 클래스)** | 단일 모듈, 계층 분리 | 간단한 구조 |
| **중규모 (~50 클래스)** | 도메인별 패키지 분리 | 응집도 향상 |
| **대규모 (~200 클래스)** | Multi-Module | 명확한 경계 |
| **공통 라이브러리** | Custom Starter | 재사용성 |
| **마이크로서비스** | 독립 모듈 + Starter | 서비스 독립성 |

### 진화 경로

```
1단계: 계층별 패키지 (controller, service, repository)
   ↓ (도메인 증가)
2단계: 도메인별 패키지 (user, order, product)
   ↓ (모듈 증가)
3단계: Multi-Module 프로젝트
   ↓ (공통 설정 반복)
4단계: Custom Starter 생성
   ↓ (마이크로서비스)
5단계: 서비스별 독립 모듈
```

## 정리

**기본 개념:**
- 의존성 주입은 객체를 외부에서 받는 방식입니다
- IoC는 객체 생성과 연결의 제어권이 외부로 넘어가는 것입니다
- Spring의 IoC Container가 Bean 생성과 주입을 담당합니다
- 생성자 주입을 기본으로 사용하세요

**고급 기법:**
- Bean Lifecycle: @PostConstruct, @PreDestroy 권장
- Bean Scope: Singleton (기본), Prototype, Request, Session
- Provider/ObjectFactory: Scope 문제 해결, 지연 로딩
- @Conditional, @Profile: 조건부/환경별 Bean 등록

**아키텍처 패턴:**
- 계층별 → 도메인별 → Multi-Module로 진화
- Custom Starter로 공통 설정 자동화
- Configuration 분리로 책임 명확화
- 테스트 전략: 단위 → 슬라이스 → 통합 테스트

**선택 기준:**
- 프로젝트 규모와 복잡도에 따라 아키텍처 선택
- 재사용성과 유지보수를 고려한 점진적 진화
- 테스트 속도와 범위 사이의 트레이드오프 이해
