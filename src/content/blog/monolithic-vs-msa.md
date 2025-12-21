---
title: '모놀리식 vs MSA - 단순함과 확장성의 선택'
description: '모놀리식과 마이크로서비스 아키텍처의 차이, 각각의 장단점, 실무 선택 기준을 정리했습니다'
pubDate: 'Dec 20 2024'
tags: ['Architecture', 'Spring']
series: 'tech-tradeoffs'
seriesOrder: 3
quiz:
  - question: "모놀리식 아키텍처의 가장 큰 장점은?"
    options:
      - "서비스별 독립 배포 가능"
      - "개발과 디버깅이 단순함"
      - "서비스별 기술 스택 선택 가능"
      - "장애 격리가 쉬움"
    correctAnswer: 1
    explanation: "모놀리식은 하나의 코드베이스에서 모든 기능을 개발하므로 IDE에서 전체 코드를 탐색하고 디버깅할 수 있습니다. 로컬에서 전체 시스템을 실행하기도 쉽습니다."
  - question: "MSA에서 서비스 간 통신의 단점은?"
    options:
      - "코드 재사용이 어려움"
      - "네트워크 지연과 장애 가능성"
      - "데이터베이스 공유 불가"
      - "모니터링이 복잡함"
    correctAnswer: 1
    explanation: "MSA에서 서비스 간 통신은 네트워크를 경유합니다. 로컬 메서드 호출보다 느리고, 네트워크 장애, 타임아웃, 재시도 등을 고려해야 합니다."
  - question: "MSA 도입을 고려해야 하는 상황은?"
    options:
      - "프로젝트 초기 단계"
      - "팀 규모가 3명 이하"
      - "서비스별 독립적인 확장이 필요할 때"
      - "빠른 MVP 개발이 필요할 때"
    correctAnswer: 2
    explanation: "특정 서비스만 트래픽이 집중되는 경우 해당 서비스만 스케일 아웃할 수 있습니다. 모놀리식은 전체 시스템을 함께 확장해야 합니다."
  - question: "MSA에서 분산 트랜잭션 문제의 해결 방법은?"
    options:
      - "2PC(Two-Phase Commit)"
      - "SAGA 패턴"
      - "XA 트랜잭션"
      - "위의 모든 방법"
    correctAnswer: 3
    explanation: "2PC, SAGA, XA 모두 분산 트랜잭션 해결 방법입니다. 실무에서는 SAGA 패턴(Choreography 또는 Orchestration)을 많이 사용합니다."
  - question: "모놀리식에서 MSA로 전환할 때 첫 번째로 해야 할 일은?"
    options:
      - "모든 서비스를 한 번에 분리"
      - "도메인 경계 식별과 모듈 분리"
      - "Kubernetes 도입"
      - "메시지 큐 도입"
    correctAnswer: 1
    explanation: "MSA 전환은 점진적으로 해야 합니다. 먼저 모놀리식 내에서 도메인별로 모듈을 명확히 분리하고, 이후 필요한 부분부터 서비스로 추출합니다."
---

새로운 프로젝트를 시작할 때 아키텍처를 결정해야 합니다. 모놀리식으로 갈까요, MSA로 갈까요? 이 선택은 프로젝트의 성패를 좌우할 수 있습니다.

"MSA가 트렌드니까 MSA로 가자" vs "우리 팀 규모에 MSA는 과하다". 둘 다 일리가 있습니다. 하지만 팀 규모, 서비스 특성, 운영 역량에 따라 정답이 다릅니다.

## 모놀리식 아키텍처란

모놀리식(Monolithic)은 모든 기능이 하나의 애플리케이션에 포함된 구조입니다.

### 구조

```
┌─────────────────────────────────────────┐
│              Monolithic App             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  User   │ │  Order  │ │ Payment │   │
│  │ Module  │ │ Module  │ │ Module  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │         │
│  ┌────┴───────────┴───────────┴────┐   │
│  │        Shared Database          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

하나의 WAR/JAR 파일로 패키징되고, 하나의 프로세스로 실행됩니다.

### 코드 예시

```java
// 하나의 프로젝트에서 모든 도메인 처리
@Service
public class OrderService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    @Transactional
    public Order createOrder(Long userId, List<OrderItem> items) {
        // 같은 프로세스 내 메서드 호출
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        Order order = Order.create(user, items);
        orderRepository.save(order);

        // 로컬 트랜잭션으로 일관성 보장
        paymentService.processPayment(order);

        return order;
    }
}
```

### 장점

**1. 개발이 단순합니다**

```bash
# 로컬 실행이 간단
./gradlew bootRun

# 전체 시스템이 하나의 프로세스
# IDE에서 모든 코드 탐색 가능
# 디버깅이 쉬움
```

**2. 트랜잭션 관리가 쉽습니다**

```java
@Transactional
public void transferMoney(Long fromId, Long toId, BigDecimal amount) {
    Account from = accountRepository.findById(fromId).get();
    Account to = accountRepository.findById(toId).get();

    from.withdraw(amount);
    to.deposit(amount);

    // 하나의 트랜잭션으로 원자성 보장
    // 실패하면 전체 롤백
}
```

**3. 배포가 단순합니다**

```bash
# 하나의 파일만 배포
scp app.jar server:/app/
ssh server "java -jar /app/app.jar"
```

### 단점

**1. 규모가 커지면 빌드/배포가 느려집니다**

```bash
# 코드 한 줄 수정에도 전체 빌드
./gradlew build  # 10분 이상 걸리기도...

# 전체 애플리케이션 재배포 필요
# 배포 중 전체 서비스 영향
```

**2. 확장성에 한계가 있습니다**

```
# 주문 서비스만 부하가 높아도 전체를 스케일 아웃
┌──────────┐  ┌──────────┐  ┌──────────┐
│ App (1)  │  │ App (2)  │  │ App (3)  │
│ User     │  │ User     │  │ User     │
│ Order ●  │  │ Order ●  │  │ Order ●  │  ← 필요
│ Payment  │  │ Payment  │  │ Payment  │  ← 불필요
└──────────┘  └──────────┘  └──────────┘
```

**3. 기술 스택이 고정됩니다**

```java
// 전체 애플리케이션이 같은 기술 사용
// Spring Boot 2.x → 3.x 업그레이드 시 전체 영향
// 일부 모듈만 다른 언어/프레임워크 사용 불가
```

## MSA(마이크로서비스 아키텍처)란

MSA는 애플리케이션을 작은 독립 서비스들로 분리한 구조입니다.

### 구조

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ User Service│   │Order Service│   │Payment Svc  │
│  ┌───────┐  │   │  ┌───────┐  │   │  ┌───────┐  │
│  │ API   │  │   │  │ API   │  │   │  │ API   │  │
│  └───┬───┘  │   │  └───┬───┘  │   │  └───┬───┘  │
│  ┌───┴───┐  │   │  ┌───┴───┐  │   │  ┌───┴───┐  │
│  │  DB   │  │   │  │  DB   │  │   │  │  DB   │  │
│  └───────┘  │   │  └───────┘  │   │  └───────┘  │
└─────────────┘   └─────────────┘   └─────────────┘
        │                │                 │
        └────────────────┼─────────────────┘
                         │
                 ┌───────┴───────┐
                 │  API Gateway  │
                 └───────────────┘
```

### 코드 예시

```java
// Order Service
@Service
public class OrderService {

    private final UserServiceClient userClient;  // Feign Client
    private final PaymentServiceClient paymentClient;
    private final OrderRepository orderRepository;

    public Order createOrder(Long userId, List<OrderItem> items) {
        // 네트워크 호출로 다른 서비스 접근
        UserDto user = userClient.getUser(userId);

        Order order = Order.create(userId, items);
        orderRepository.save(order);

        // 다른 서비스 호출 - 분산 트랜잭션 문제!
        try {
            paymentClient.processPayment(order.getId(), order.getTotalAmount());
        } catch (FeignException e) {
            // 보상 트랜잭션 필요
            orderRepository.delete(order);
            throw new PaymentFailedException(e);
        }

        return order;
    }
}
```

```java
// Feign Client 정의
@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/users/{id}")
    UserDto getUser(@PathVariable Long id);
}
```

### 장점

**1. 독립적인 배포가 가능합니다**

```bash
# 주문 서비스만 수정하면 주문 서비스만 배포
docker build -t order-service:v2 .
kubectl set image deployment/order-service order=order-service:v2

# 다른 서비스는 영향 없음
```

**2. 서비스별 확장이 가능합니다**

```yaml
# Kubernetes HPA 예시
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10  # 주문 서비스만 최대 10개까지 확장
```

**3. 기술 스택을 자유롭게 선택할 수 있습니다**

```
User Service    → Java + Spring Boot
Order Service   → Java + Spring Boot
Payment Service → Kotlin + Spring WebFlux
Analytics       → Python + FastAPI
```

**4. 장애가 격리됩니다**

```java
// Circuit Breaker로 장애 전파 방지
@CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
public PaymentResult processPayment(Order order) {
    return paymentClient.process(order);
}

public PaymentResult paymentFallback(Order order, Exception e) {
    // 결제 서비스 장애 시 대안 처리
    return PaymentResult.pending("결제 서비스 일시 장애");
}
```

### 단점

**1. 운영 복잡도가 급격히 증가합니다**

```
필요한 인프라:
- Service Discovery (Eureka, Consul)
- API Gateway (Spring Cloud Gateway, Kong)
- 분산 추적 (Zipkin, Jaeger)
- 중앙 집중 로깅 (ELK Stack)
- 모니터링 (Prometheus + Grafana)
- Container Orchestration (Kubernetes)
- CI/CD 파이프라인 (서비스별)
```

**2. 네트워크 통신 오버헤드가 있습니다**

```java
// 로컬 메서드 호출 (모놀리식)
User user = userRepository.findById(userId);  // ~1ms

// 네트워크 호출 (MSA)
UserDto user = userClient.getUser(userId);  // ~10-100ms
// + 네트워크 장애 가능성
// + 타임아웃 처리 필요
// + 재시도 로직 필요
```

**3. 분산 트랜잭션이 어렵습니다**

```java
// 모놀리식: 하나의 @Transactional로 해결
@Transactional
public void createOrderWithPayment() {
    orderRepository.save(order);
    paymentRepository.save(payment);
    // 실패하면 둘 다 롤백
}

// MSA: SAGA 패턴 등 복잡한 해결책 필요
public void createOrderWithPayment() {
    orderService.createOrder();  // 성공
    try {
        paymentService.processPayment();  // 실패!
    } catch (Exception e) {
        orderService.cancelOrder();  // 보상 트랜잭션
    }
}
```

**4. 테스트가 어렵습니다**

```java
// 통합 테스트 시 모든 서비스 실행 필요
// 또는 Mock 서버 구성 필요
@SpringBootTest
class OrderServiceIntegrationTest {

    @MockBean
    private UserServiceClient userClient;  // Mock 필요

    @MockBean
    private PaymentServiceClient paymentClient;  // Mock 필요

    @Test
    void createOrder() {
        given(userClient.getUser(1L)).willReturn(mockUser);
        given(paymentClient.process(any())).willReturn(mockResult);
        // ...
    }
}
```

## 핵심 비교

| 항목 | 모놀리식 | MSA |
|------|----------|-----|
| 개발 복잡도 | 낮음 | 높음 |
| 배포 | 전체 배포 | 서비스별 독립 배포 |
| 확장성 | 전체 스케일 | 서비스별 스케일 |
| 트랜잭션 | 로컬 트랜잭션 | 분산 트랜잭션 (SAGA) |
| 장애 영향 | 전체 장애 | 부분 장애 (격리 가능) |
| 기술 스택 | 통일 | 서비스별 선택 |
| 팀 구조 | 기능별 팀 | 서비스별 팀 |
| 인프라 | 단순 | 복잡 (K8s, 서비스 메시 등) |
| 로컬 개발 | 쉬움 | 어려움 |
| 디버깅 | 쉬움 | 분산 추적 필요 |

## 언제 모놀리식을 선택할까

### 1. 초기 스타트업/MVP

```
- 빠른 개발과 출시가 중요
- 팀 규모가 작음 (10명 이하)
- 서비스 경계가 불명확
- 인프라 운영 인력 부족
```

### 2. 도메인이 명확하지 않을 때

```
- 비즈니스 요구사항이 자주 변경
- 어떤 기능이 중요한지 아직 모름
- 서비스를 어떻게 나눌지 확신이 없음
```

### 3. 트랜잭션 일관성이 중요할 때

```java
// 금융 시스템 등 강한 일관성 필요
@Transactional(isolation = Isolation.SERIALIZABLE)
public void transfer(Account from, Account to, Money amount) {
    from.withdraw(amount);
    to.deposit(amount);
    auditLog.record(from, to, amount);
    // 모두 성공하거나 모두 실패
}
```

## 언제 MSA를 선택할까

### 1. 조직이 크고 팀이 분리되어 있을 때

```
- 팀별로 독립적인 개발/배포 필요
- 팀마다 다른 릴리스 주기
- 팀 간 코드 충돌 최소화
```

### 2. 서비스별 확장 요구가 다를 때

```
- 검색 서비스: 읽기 트래픽 많음 → 읽기 전용 복제
- 주문 서비스: 쓰기 트래픽 많음 → 쓰기 최적화
- 알림 서비스: 비동기 처리 → 큐 기반 확장
```

### 3. 장애 격리가 중요할 때

```
- 결제 서비스 장애가 상품 조회에 영향 X
- 추천 서비스 장애가 주문에 영향 X
```

### 4. 기술 다양성이 필요할 때

```
- AI 추천: Python + TensorFlow
- 실시간 알림: Node.js + Socket.io
- 결제: Java + Spring (안정성)
- 데이터 분석: Scala + Spark
```

## 실무 전환 전략: Modular Monolith

바로 MSA로 가지 말고, 중간 단계를 거치는 것이 안전합니다.

```
Monolith → Modular Monolith → MSA
```

### Modular Monolith

```
┌─────────────────────────────────────────────────┐
│                   Application                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   user    │  │   order   │  │  payment  │   │
│  │  module   │  │  module   │  │  module   │   │
│  ├───────────┤  ├───────────┤  ├───────────┤   │
│  │ - api     │  │ - api     │  │ - api     │   │
│  │ - domain  │  │ - domain  │  │ - domain  │   │
│  │ - infra   │  │ - infra   │  │ - infra   │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │          │
│  ┌─────┴──────────────┴──────────────┴─────┐   │
│  │              Shared Kernel               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

```java
// 모듈 간 통신은 인터페이스로
// user-module
public interface UserQueryService {
    UserDto findById(Long id);
}

// order-module
@Service
public class OrderService {
    private final UserQueryService userQueryService;  // 인터페이스 의존

    public Order createOrder(Long userId) {
        UserDto user = userQueryService.findById(userId);
        // ...
    }
}
```

### 점진적 분리

```
1단계: 모놀리식 내 도메인별 패키지 분리
2단계: 모듈 간 의존성을 인터페이스로 추상화
3단계: 가장 독립적인 모듈부터 서비스로 분리
4단계: 필요에 따라 추가 분리
```

```java
// 분리 전: 직접 호출
UserDto user = userQueryService.findById(userId);

// 분리 후: Feign Client로 교체 (코드 변경 최소화)
@FeignClient(name = "user-service")
public interface UserQueryService {  // 같은 인터페이스
    @GetMapping("/users/{id}")
    UserDto findById(@PathVariable Long id);
}
```

## 선택 기준 체크리스트

### 모놀리식이 적합한 경우

- [ ] 팀 규모가 10명 이하
- [ ] 서비스 출시를 빠르게 해야 함
- [ ] 도메인 경계가 불명확
- [ ] Kubernetes 등 인프라 운영 경험 부족
- [ ] 트랜잭션 일관성이 매우 중요

### MSA가 적합한 경우

- [ ] 팀이 여러 개로 분리되어 있음
- [ ] 서비스별 독립 배포가 필요
- [ ] 서비스별 확장 요구가 다름
- [ ] 장애 격리가 중요
- [ ] 충분한 DevOps 역량 보유

## 혼용 전략: 하이브리드 아키텍처

실무에서는 순수한 모놀리식이나 순수한 MSA보다 혼용 형태가 많습니다.

### 1. 코어 모놀리식 + 위성 서비스

```
┌─────────────────────────────────┐
│     Core Monolith               │
│  ┌─────────┐  ┌─────────┐      │
│  │  User   │  │  Order  │      │
│  │ Module  │  │ Module  │      │
│  └─────────┘  └─────────┘      │
└─────────────────────────────────┘
         │           │
    ┌────┴───┐  ┌────┴───┐
    │ Search │  │ Notify │   ← 분리된 서비스
    │Service │  │Service │
    └────────┘  └────────┘
```

```java
// 코어는 모놀리식으로 유지
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final NotificationClient notificationClient;  // 분리된 서비스

    @Transactional
    public Order createOrder(CreateOrderCommand command) {
        // 핵심 로직은 로컬 트랜잭션
        Order order = Order.create(command);
        orderRepository.save(order);

        // 부가 기능은 비동기로 외부 서비스 호출
        notificationClient.sendOrderConfirmationAsync(order.getId());

        return order;
    }
}
```

**적합한 경우**:
- 핵심 도메인은 강한 일관성 필요
- 검색, 알림 등 부가 기능은 독립 확장 필요
- 점진적 MSA 전환 중

### 2. 도메인별 분리 + 공유 인프라

```java
// 각 도메인은 독립 서비스지만 공유 인프라 사용
@Service
public class PaymentService {

    // 공유 메시지 큐
    private final KafkaTemplate<String, PaymentEvent> kafkaTemplate;

    // 공유 캐시
    private final RedisTemplate<String, Object> redisTemplate;

    public void processPayment(PaymentRequest request) {
        // 결제 처리 후 이벤트 발행
        Payment payment = paymentProcessor.process(request);

        kafkaTemplate.send("payment-events",
            PaymentEvent.completed(payment));
    }
}
```

### 3. BFF (Backend For Frontend) 패턴

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Web BFF │  │Mobile BFF│  │ Admin BFF│
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────┴────┐  ┌─────┴────┐  ┌─────┴────┐
│  User   │  │  Order   │  │ Product  │
│ Service │  │  Service │  │ Service  │
└─────────┘  └──────────┘  └──────────┘
```

```java
// Web BFF - 웹 클라이언트에 최적화된 API
@RestController
@RequestMapping("/web/api")
public class WebOrderController {

    private final UserServiceClient userClient;
    private final OrderServiceClient orderClient;
    private final ProductServiceClient productClient;

    @GetMapping("/orders/{id}/detail")
    public WebOrderDetailResponse getOrderDetail(@PathVariable Long id) {
        // 웹에 필요한 모든 정보를 한 번에 조합
        CompletableFuture<OrderDto> orderFuture =
            CompletableFuture.supplyAsync(() -> orderClient.getOrder(id));
        CompletableFuture<UserDto> userFuture =
            CompletableFuture.supplyAsync(() -> userClient.getUser(order.getUserId()));
        CompletableFuture<List<ProductDto>> productsFuture =
            CompletableFuture.supplyAsync(() -> productClient.getProducts(order.getProductIds()));

        return CompletableFuture.allOf(orderFuture, userFuture, productsFuture)
            .thenApply(v -> WebOrderDetailResponse.of(
                orderFuture.join(),
                userFuture.join(),
                productsFuture.join()
            )).join();
    }
}

// Mobile BFF - 모바일에 최적화된 경량 API
@RestController
@RequestMapping("/mobile/api")
public class MobileOrderController {

    @GetMapping("/orders/{id}")
    public MobileOrderResponse getOrder(@PathVariable Long id) {
        // 모바일에 필요한 최소 정보만 반환
        return orderClient.getOrderSummary(id);
    }
}
```

**BFF 트레이드오프**:
- **장점**: 클라이언트별 최적화, API 버전 관리 용이
- **단점**: 코드 중복 가능성, 관리 포인트 증가

## 아키텍처 패턴으로 풀어내기

MSA의 복잡성을 해결하는 아키텍처 패턴들입니다.

### 1. 이벤트 드리븐 아키텍처

서비스 간 동기 호출 대신 이벤트 기반 비동기 통신을 사용합니다.

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│Order Service│      │  Message    │      │Notify Service│
│             │─────▶│   Broker    │─────▶│             │
│             │      │  (Kafka)    │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │Stock Service│
                     └─────────────┘
```

```java
// Producer: 이벤트 발행
@Service
public class OrderService {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Transactional
    public Order createOrder(CreateOrderCommand command) {
        Order order = Order.create(command);
        orderRepository.save(order);

        // 동기 호출 대신 이벤트 발행
        kafkaTemplate.send("order-events",
            new OrderCreatedEvent(order.getId(), order.getItems()));

        return order;
    }
}

// Consumer: 이벤트 처리
@Service
public class StockEventHandler {

    @KafkaListener(topics = "order-events", groupId = "stock-service")
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 재고 차감
        event.getItems().forEach(item ->
            stockService.decrease(item.getProductId(), item.getQuantity())
        );

        // 처리 완료 이벤트 발행
        kafkaTemplate.send("stock-events",
            new StockDecreasedEvent(event.getOrderId()));
    }
}
```

**장점**:
- 서비스 간 느슨한 결합
- 서비스 장애 시에도 이벤트는 큐에 보관
- 새 컨슈머 추가가 쉬움

**트레이드오프**:
- Eventual Consistency (즉시 반영 안 됨)
- 이벤트 순서 보장 복잡
- 디버깅이 어려움

### 2. 서비스 메시 (Istio, Linkerd)

네트워크 통신을 인프라 레벨에서 관리합니다.

```
┌────────────────────────────────────────────────────────┐
│                    Service Mesh                         │
│  ┌─────────────────┐         ┌─────────────────┐       │
│  │  Order Service  │         │  User Service   │       │
│  │  ┌───────────┐  │         │  ┌───────────┐  │       │
│  │  │    App    │  │◀───────▶│  │    App    │  │       │
│  │  └───────────┘  │         │  └───────────┘  │       │
│  │  ┌───────────┐  │         │  ┌───────────┐  │       │
│  │  │  Sidecar  │  │         │  │  Sidecar  │  │       │
│  │  │  (Envoy)  │  │         │  │  (Envoy)  │  │       │
│  │  └───────────┘  │         │  └───────────┘  │       │
│  └─────────────────┘         └─────────────────┘       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Control Plane (Istiod)              │   │
│  │  - Traffic Management                            │   │
│  │  - Security (mTLS)                               │   │
│  │  - Observability                                 │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

```yaml
# Istio VirtualService - 트래픽 제어
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: order-service
            subset: v2
          weight: 100
    - route:
        - destination:
            host: order-service
            subset: v1
          weight: 90
        - destination:
            host: order-service
            subset: v2
          weight: 10  # 10% 카나리 배포
```

**서비스 메시가 해결하는 것**:
- 서비스 간 mTLS 암호화
- 트래픽 분산 (카나리, A/B 테스트)
- 서킷 브레이커, 재시도, 타임아웃
- 분산 추적, 메트릭 수집

**트레이드오프**:
- 인프라 복잡도 증가
- 사이드카로 인한 리소스 오버헤드
- 학습 곡선

### 3. Strangler Fig 패턴

레거시 모놀리식을 점진적으로 MSA로 전환하는 패턴입니다.

```
Phase 1: 프록시 추가
┌──────────────┐
│   Facade     │
│   (Proxy)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Monolith    │
│  (Legacy)    │
└──────────────┘

Phase 2: 기능 분리 시작
┌──────────────┐
│   Facade     │
│   (Proxy)    │
└──────┬───────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
┌─────┐  ┌──────────┐
│ New │  │ Monolith │
│ Svc │  │ (Legacy) │
└─────┘  └──────────┘

Phase 3: 점진적 이관
┌──────────────┐
│   Facade     │
│   (Proxy)    │
└──────┬───────┘
       │
  ┌────┼────┐
  │    │    │
  ▼    ▼    ▼
┌───┐ ┌───┐ ┌──────────┐
│Svc│ │Svc│ │ Monolith │  ← 점점 작아짐
│ A │ │ B │ │ (Legacy) │
└───┘ └───┘ └──────────┘
```

```java
// Facade (API Gateway) - 라우팅 결정
@RestController
public class OrderFacade {

    private final LegacyOrderClient legacyClient;
    private final NewOrderClient newOrderClient;
    private final FeatureToggleService featureToggle;

    @PostMapping("/orders")
    public OrderResponse createOrder(@RequestBody OrderRequest request) {
        // Feature Toggle로 점진적 전환
        if (featureToggle.isEnabled("new-order-service", request.getUserId())) {
            return newOrderClient.createOrder(request);
        }
        return legacyClient.createOrder(request);
    }

    @GetMapping("/orders/{id}")
    public OrderResponse getOrder(@PathVariable Long id) {
        // 새 서비스에서 먼저 조회, 없으면 레거시
        try {
            return newOrderClient.getOrder(id);
        } catch (OrderNotFoundException e) {
            return legacyClient.getOrder(id);
        }
    }
}
```

**전환 단계**:
```
1. 프록시/파사드 추가 (트래픽 라우팅)
2. 가장 독립적인 기능부터 분리
3. Feature Toggle로 점진적 전환
4. 데이터 마이그레이션 (동기화 → 전환 → 정리)
5. 레거시 코드 제거
```

### 4. SAGA 패턴 심화

분산 트랜잭션을 처리하는 두 가지 방식입니다.

```java
// Orchestration 방식 - 중앙 오케스트레이터
@Service
public class OrderSagaOrchestrator {

    public OrderResult executeOrderSaga(CreateOrderCommand command) {
        Saga saga = Saga.create();

        try {
            // Step 1: 주문 생성
            Order order = orderService.createOrder(command);
            saga.addCompensation(() -> orderService.cancelOrder(order.getId()));

            // Step 2: 재고 예약
            stockService.reserve(order.getItems());
            saga.addCompensation(() -> stockService.release(order.getItems()));

            // Step 3: 결제
            Payment payment = paymentService.process(order);
            saga.addCompensation(() -> paymentService.refund(payment.getId()));

            // Step 4: 배송 예약
            deliveryService.schedule(order);

            saga.commit();
            return OrderResult.success(order);

        } catch (Exception e) {
            saga.rollback();  // 보상 트랜잭션 역순 실행
            return OrderResult.failed(e.getMessage());
        }
    }
}

// Choreography 방식 - 이벤트 기반
@Service
public class OrderEventHandler {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        kafkaTemplate.send("order-events", event);
    }
}

@Service
public class StockEventHandler {

    @KafkaListener(topics = "order-events")
    public void handleOrderCreated(OrderCreatedEvent event) {
        try {
            stockService.reserve(event.getItems());
            kafkaTemplate.send("stock-events",
                new StockReservedEvent(event.getOrderId()));
        } catch (InsufficientStockException e) {
            kafkaTemplate.send("stock-events",
                new StockReservationFailedEvent(event.getOrderId()));
        }
    }
}

@Service
public class OrderCompensationHandler {

    @KafkaListener(topics = "stock-events")
    public void handleStockReservationFailed(StockReservationFailedEvent event) {
        // 보상: 주문 취소
        orderService.cancelOrder(event.getOrderId());
    }
}
```

**Orchestration vs Choreography**:

| | Orchestration | Choreography |
|---|---|---|
| **제어** | 중앙 집중 | 분산 |
| **가시성** | 흐름이 한 곳에 | 이벤트 추적 필요 |
| **결합도** | 오케스트레이터 의존 | 느슨한 결합 |
| **복잡도** | 오케스트레이터 복잡 | 이벤트 흐름 복잡 |
| **확장성** | 오케스트레이터 병목 | 수평 확장 용이 |

### 5. API 게이트웨이 패턴

```java
// Spring Cloud Gateway 설정
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            // 라우팅
            .route("user-service", r -> r
                .path("/api/users/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .addRequestHeader("X-Request-Id", UUID.randomUUID().toString())
                    .retry(3))  // 재시도
                .uri("lb://user-service"))

            // Rate Limiting
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .requestRateLimiter(c -> c
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://order-service"))

            // Circuit Breaker
            .route("payment-service", r -> r
                .path("/api/payments/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .circuitBreaker(c -> c
                        .setName("payment")
                        .setFallbackUri("forward:/fallback/payment")))
                .uri("lb://payment-service"))
            .build();
    }
}

// Fallback Controller
@RestController
public class FallbackController {

    @GetMapping("/fallback/payment")
    public ResponseEntity<String> paymentFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body("결제 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.");
    }
}
```

**API 게이트웨이 기능**:
- 라우팅 및 로드밸런싱
- 인증/인가
- Rate Limiting
- Circuit Breaker
- 요청/응답 변환
- 로깅 및 모니터링

## 실무 선택 가이드

### 프로젝트 특성별

| 특성 | 추천 아키텍처 |
|-----|-------------|
| MVP/초기 스타트업 | 모놀리식 |
| 10인 이하 팀 | 모놀리식 또는 Modular Monolith |
| 50인 이상 조직 | MSA (도메인별 팀) |
| 레거시 전환 | Strangler Fig + 하이브리드 |
| 강한 일관성 필요 | 모놀리식 또는 Modular Monolith |
| 서비스별 확장 필요 | MSA |

### 팀 역량별

| 역량 | 추천 |
|-----|------|
| DevOps 경험 부족 | 모놀리식 시작 |
| K8s 운영 가능 | MSA 고려 가능 |
| 분산 시스템 경험 부족 | Modular Monolith로 준비 |
| 이벤트 드리븐 경험 있음 | MSA + 이벤트 기반 |

### 현실적인 진화 경로

```
시작: 모놀리식 (빠른 개발)
  ↓ 도메인 경계 명확해짐
1단계: Modular Monolith (모듈 분리)
  ↓ 특정 모듈 확장 필요
2단계: 하이브리드 (핵심은 모놀리식 + 일부 서비스 분리)
  ↓ 조직 성장, 팀 분리
3단계: MSA (도메인별 서비스)
  ↓ 운영 복잡도 증가
4단계: + 서비스 메시, 이벤트 드리븐
```

## 정리

모놀리식과 MSA의 선택은 **기술**과 **아키텍처** 두 가지 차원의 트레이드오프입니다.

**기술 레벨의 선택**:
- **모놀리식**: 단순함, 빠른 개발, 로컬 트랜잭션. 규모가 커지면 빌드/배포 병목
- **MSA**: 독립 배포, 서비스별 확장, 장애 격리. 분산 시스템 복잡도 트레이드오프
- **Modular Monolith**: 모놀리식의 단순함 + 모듈화의 유연성. MSA 전환 준비
- **하이브리드**: 핵심은 모놀리식, 부가 기능은 분리. 점진적 전환에 적합

**아키텍처 레벨의 해결책**:
- **이벤트 드리븐**: 서비스 간 느슨한 결합, 장애 격리 (Eventual Consistency 트레이드오프)
- **서비스 메시**: 인프라 레벨 통신 관리 (운영 복잡도 트레이드오프)
- **Strangler Fig**: 레거시 점진적 전환 (전환 기간 복잡도 트레이드오프)
- **SAGA 패턴**: 분산 트랜잭션 해결 (보상 로직 복잡도 트레이드오프)
- **API 게이트웨이**: 진입점 단일화, 횡단 관심사 처리

**선택의 기준**:
1. **팀 규모**: 10인 이하면 모놀리식, 팀이 분리되면 MSA 고려
2. **도메인 성숙도**: 경계가 불명확하면 모놀리식으로 학습
3. **운영 역량**: K8s, 분산 추적, 모니터링 역량 필수
4. **비즈니스 요구**: 독립 배포, 확장성, 장애 격리 필요 여부

**핵심 원칙**:
- MSA는 기술이 아닌 **조직**의 문제입니다
- "MSA가 더 좋다"가 아닙니다. 상황에 맞는 선택이 중요합니다
- 처음엔 모놀리식으로 시작하고, 필요할 때 분리하세요
- 점진적 전환이 빅뱅 전환보다 안전합니다

**진화 전략**:
```
시작: 모놀리식 (단순함, 빠른 개발)
  ↓
1단계: Modular Monolith (도메인 분리)
  ↓
2단계: 하이브리드 (일부 서비스 분리)
  ↓
3단계: MSA + 이벤트 드리븐
  ↓
4단계: + 서비스 메시 (대규모)
```

다음 글에서는 **REST vs GraphQL**을 비교해보겠습니다.
