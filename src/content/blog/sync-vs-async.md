---
title: '동기 vs 비동기 - 복잡도와 성능의 선택'
description: '동기와 비동기 처리의 차이, 트레이드오프, 실무 선택 기준을 정리했습니다'
pubDate: 'Dec 17 2024'
tags: ['Java', 'Spring', 'Architecture']
series: 'tech-tradeoffs'
seriesOrder: 1
quiz:
  - question: "동기 처리 방식의 특징은?"
    options:
      - "작업을 동시에 여러 개 실행한다"
      - "작업이 끝날 때까지 기다린다"
      - "결과를 나중에 받는다"
      - "콜백 함수를 사용한다"
    correctAnswer: 1
    explanation: "동기 처리는 작업이 완료될 때까지 대기(블로킹)합니다. 호출한 함수가 리턴할 때까지 다음 코드를 실행하지 않습니다."
  - question: "다음 중 비동기 처리가 적합한 경우는?"
    options:
      - "결제 금액 계산"
      - "주문 정보 저장"
      - "이메일 발송"
      - "재고 차감"
    correctAnswer: 2
    explanation: "이메일 발송은 시간이 걸리지만 주문 처리의 핵심 로직은 아닙니다. 비동기로 처리하면 사용자는 이메일 발송을 기다리지 않고 빠르게 응답을 받을 수 있습니다."
  - question: "@Async 어노테이션이 동작하지 않는 경우는?"
    options:
      - "public 메서드에서 호출"
      - "같은 클래스 내부에서 호출"
      - "다른 Bean에서 호출"
      - "@EnableAsync 설정됨"
    correctAnswer: 1
    explanation: "@Async는 프록시 기반으로 동작합니다. 같은 클래스 내부에서 호출하면 프록시를 거치지 않아 비동기로 실행되지 않습니다. @Transactional과 같은 원리입니다."
  - question: "블로킹(Blocking)과 논블로킹(Non-blocking)의 차이는?"
    options:
      - "동기와 비동기의 다른 표현이다"
      - "블로킹은 대기하고, 논블로킹은 즉시 리턴한다"
      - "블로킹은 빠르고, 논블로킹은 느리다"
      - "블로킹은 Spring이고, 논블로킹은 Node.js다"
    correctAnswer: 1
    explanation: "블로킹은 작업이 끝날 때까지 호출자가 대기하는 것이고, 논블로킹은 작업 완료 여부와 관계없이 즉시 리턴하는 것입니다. 동기/비동기는 작업 완료를 누가 신경쓰는지의 차이입니다."
  - question: "CompletableFuture의 장점은?"
    options:
      - "@Async보다 간단하다"
      - "예외 처리와 체이닝이 쉽다"
      - "설정이 필요 없다"
      - "항상 더 빠르다"
    correctAnswer: 1
    explanation: "CompletableFuture는 thenApply, exceptionally 같은 메서드로 비동기 작업을 체이닝하고 예외를 처리할 수 있습니다. @Async보다 세밀한 제어가 가능합니다."
---

주문 처리 API를 만들면서 고민하게 됩니다. 주문을 저장하고, 결제하고, 재고를 차감하고, 이메일을 보내고, 알림톡을 발송해야 합니다. 이 모든 작업을 순서대로 기다려야 할까요? 아니면 일부는 나중에 처리해도 될까요?

이메일 발송이 3초 걸린다면 사용자는 3초를 기다려야 합니다. 비동기로 처리하면 이메일은 백그라운드에서 발송하고 사용자에게는 바로 응답할 수 있습니다.

## 동기 처리란

동기(Synchronous) 처리는 작업을 순서대로 하나씩 실행하는 방식입니다.

```java
@PostMapping("/orders")
public OrderResponse createOrder(OrderRequest request) {
    Order order = orderService.save(request);      // 1. 주문 저장 (100ms)
    paymentService.process(order);                 // 2. 결제 (500ms)
    stockService.decrease(order);                  // 3. 재고 차감 (50ms)
    emailService.sendConfirmation(order);          // 4. 이메일 발송 (3000ms)

    return OrderResponse.from(order);
    // 총 소요 시간: 3650ms
}
```

각 작업이 끝날 때까지 기다립니다. 이메일 발송이 3초 걸리면 사용자는 3초를 기다려야 합니다.

### 동기 처리의 특징

**장점**:
- 코드가 순서대로 읽혀서 이해하기 쉽습니다
- 디버깅이 간단합니다
- 에러 처리가 명확합니다 (try-catch로 충분)

**단점**:
- 느린 작업이 있으면 전체가 느려집니다
- I/O 대기 시간에 아무것도 하지 않습니다
- 처리량이 낮습니다

## 비동기 처리란

비동기(Asynchronous) 처리는 작업을 요청하고 완료를 기다리지 않는 방식입니다.

```java
@PostMapping("/orders")
public OrderResponse createOrder(OrderRequest request) {
    Order order = orderService.save(request);      // 1. 주문 저장 (100ms)
    paymentService.process(order);                 // 2. 결제 (500ms)
    stockService.decrease(order);                  // 3. 재고 차감 (50ms)

    // 이메일은 비동기로 처리 (백그라운드)
    emailService.sendConfirmationAsync(order);     // 4. 비동기 이메일 발송

    return OrderResponse.from(order);
    // 총 소요 시간: 650ms
}
```

이메일 발송을 기다리지 않고 바로 응답합니다. 이메일은 백그라운드에서 처리됩니다.

### 비동기 처리의 특징

**장점**:
- 빠른 응답 시간
- 높은 처리량
- 시스템 자원 효율적 사용

**단점**:
- 코드가 복잡해집니다
- 디버깅이 어렵습니다
- 에러 처리가 복잡합니다
- 실행 순서를 보장하기 어렵습니다

## 블로킹 vs 논블로킹

동기/비동기와 자주 비교되는 개념입니다.

### 블로킹 (Blocking)

호출된 함수가 작업을 끝낼 때까지 제어권을 반환하지 않습니다.

```java
String response = restTemplate.getForObject(url, String.class);
// HTTP 응답이 올 때까지 이 줄에서 대기
System.out.println(response);
```

### 논블로킹 (Non-blocking)

호출된 함수가 즉시 제어권을 반환합니다. 작업 완료 여부와 관계없이 리턴합니다.

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(
    () -> restTemplate.getForObject(url, String.class)
);
// 즉시 리턴, HTTP 요청은 백그라운드에서 진행
System.out.println("요청 완료 기다리지 않음");

future.thenAccept(response -> {
    System.out.println(response);  // 나중에 실행
});
```

### 4가지 조합

| | Blocking | Non-blocking |
|---|---|---|
| **Sync** | 일반적인 메서드 호출 | 바쁜 대기 (Busy waiting) |
| **Async** | 비동기 + 결과 대기 | Node.js, Spring WebFlux |

실무에서는 주로 "동기 + 블로킹" 또는 "비동기 + 논블로킹"을 사용합니다.

## Spring에서 비동기 처리

### @Async

가장 간단한 방법입니다.

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

```java
@Service
public class EmailService {

    @Async
    public void sendConfirmationAsync(Order order) {
        // 별도 스레드에서 실행
        String email = buildEmail(order);
        emailClient.send(email);
    }
}
```

**주의사항**:
- 같은 클래스 내부 호출은 동작하지 않습니다 (프록시 문제)
- 리턴 타입은 void 또는 Future여야 합니다
- 예외가 발생해도 호출자는 모릅니다

### CompletableFuture

더 세밀한 제어가 필요할 때 사용합니다.

```java
public CompletableFuture<OrderResult> processOrder(OrderRequest request) {
    return CompletableFuture.supplyAsync(() -> {
        // 비동기 실행
        Order order = orderService.save(request);
        return order;
    })
    .thenApply(order -> {
        // 체이닝
        paymentService.process(order);
        return order;
    })
    .thenApply(order -> {
        stockService.decrease(order);
        return OrderResult.from(order);
    })
    .exceptionally(ex -> {
        // 예외 처리
        log.error("주문 처리 실패", ex);
        return OrderResult.failed();
    });
}
```

**장점**:
- 체이닝으로 순차 작업 표현 가능
- 예외 처리가 명확합니다
- 여러 Future 조합 가능 (allOf, anyOf)

### 병렬 처리

여러 작업을 동시에 실행하고 모두 완료될 때까지 대기합니다.

```java
public OrderResult processOrderParallel(OrderRequest request) {
    Order order = orderService.save(request);

    CompletableFuture<Void> payment = CompletableFuture.runAsync(
        () -> paymentService.process(order)
    );

    CompletableFuture<Void> stock = CompletableFuture.runAsync(
        () -> stockService.decrease(order)
    );

    CompletableFuture<Void> email = CompletableFuture.runAsync(
        () -> emailService.send(order)
    );

    // 모두 완료될 때까지 대기
    CompletableFuture.allOf(payment, stock, email).join();

    return OrderResult.from(order);
}
```

결제, 재고 차감, 이메일 발송이 병렬로 실행됩니다.

## 실무 선택 기준

### 동기로 처리해야 하는 경우

**1. 핵심 비즈니스 로직**

```java
// 결제는 반드시 동기로
Payment payment = paymentService.process(order);
if (payment.isFailed()) {
    throw new PaymentFailedException();
}
```

결제가 실패하면 주문도 실패해야 합니다. 동기로 처리하고 즉시 확인해야 합니다.

**2. 데이터 일관성이 중요한 경우**

```java
// 재고 차감은 주문과 함께
stockService.decrease(order);
// 재고가 부족하면 예외 발생 → 주문 롤백
```

**3. 순서가 중요한 경우**

```java
// 순서 보장 필요
userService.create(user);
emailService.sendWelcome(user);  // 사용자 생성 후에만 발송
```

### 비동기로 처리해도 되는 경우

**1. 시간이 오래 걸리는 작업**

```java
@Async
public void generateMonthlyReport(int year, int month) {
    // 수백만 건의 데이터를 집계하는 무거운 작업
    // 백그라운드에서 처리하고 완료 시 알림
}
```

**2. 실패해도 재시도 가능한 작업**

```java
@Async
public void sendPushNotification(User user, String message) {
    // 실패해도 사용자 경험에 큰 영향 없음
    // 재시도 큐에 넣어서 나중에 재시도 가능
}
```

**3. 외부 API 호출**

```java
@Async
public void syncWithExternalSystem(Order order) {
    externalApi.notify(order);
    // 외부 시스템 응답을 기다릴 필요 없음
}
```

## 트레이드오프 정리

| 기준 | 동기 | 비동기 |
|-----|------|--------|
| **복잡도** | 간단 | 복잡 |
| **디버깅** | 쉬움 | 어려움 |
| **응답 시간** | 느림 | 빠름 |
| **처리량** | 낮음 | 높음 |
| **에러 처리** | 명확 | 복잡 |
| **순서 보장** | 쉬움 | 어려움 |
| **트랜잭션** | 간단 | 복잡 (별도 트랜잭션) |

## 주의할 점

### 스레드 풀 고갈

비동기 작업이 너무 많으면 스레드 풀이 고갈됩니다.

```java
// 안티 패턴
for (int i = 0; i < 10000; i++) {
    asyncService.process(i);  // 10000개 작업 → 스레드 풀 고갈
}
```

**해결**:
- 스레드 풀 크기 조정
- 작업 큐 크기 제한
- 배치 처리

### 트랜잭션 범위

비동기 메서드는 별도 트랜잭션에서 실행됩니다.

```java
@Transactional
public void processOrder(Order order) {
    orderRepository.save(order);
    asyncService.sendEmail(order);  // 별도 트랜잭션
    // order가 롤백되어도 이메일은 발송될 수 있음
}
```

**해결**:
- 이벤트 발행 방식 사용 (TransactionalEventListener)
- 메시지 큐 사용

### 예외 전파

비동기 메서드의 예외는 호출자에게 전달되지 않습니다.

```java
@Async
public void sendEmail(Order order) {
    throw new RuntimeException("이메일 발송 실패");
    // 호출자는 이 예외를 알 수 없음
}
```

**해결**:
- AsyncUncaughtExceptionHandler 설정
- 로깅 강화
- 재시도 큐 사용

## 실무 예시

### 주문 처리 시나리오

```java
@Service
@Transactional
public class OrderService {

    public OrderResponse createOrder(OrderRequest request) {
        // 1. 동기: 핵심 로직
        Order order = saveOrder(request);
        processPayment(order);
        decreaseStock(order);

        // 2. 비동기: 부가 작업
        eventPublisher.publishEvent(new OrderCreatedEvent(order));

        return OrderResponse.from(order);
    }
}

@Component
public class OrderEventListener {

    @Async
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 비동기로 처리
        emailService.sendConfirmation(event.getOrder());
        smsService.sendNotification(event.getOrder());
        externalService.sync(event.getOrder());
    }
}
```

핵심 로직은 동기로, 부가 작업은 비동기로 처리합니다.

## 아키텍처로 풀어내는 비동기 처리

단순 @Async나 CompletableFuture만이 답은 아닙니다. 아키텍처 패턴으로 더 안정적이고 확장 가능한 비동기 처리를 구현할 수 있습니다.

### 1. 메시지 큐 (Kafka, RabbitMQ)

가장 안정적인 비동기 처리 방식입니다. 작업을 큐에 넣고 컨슈머가 처리합니다.

```java
// Producer: 이벤트 발행
@Service
public class OrderService {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        // 1. 핵심 로직 (동기)
        Order order = orderRepository.save(new Order(request));
        paymentService.process(order);
        stockService.decrease(order);

        // 2. 이벤트 발행 (비동기)
        OrderEvent event = OrderEvent.from(order);
        kafkaTemplate.send("order-created", event);

        return OrderResponse.from(order);
    }
}

// Consumer: 이벤트 처리
@Service
public class EmailNotificationConsumer {

    @KafkaListener(topics = "order-created", groupId = "email-service")
    public void handleOrderCreated(OrderEvent event) {
        try {
            emailService.sendConfirmation(event.getOrderId());
        } catch (Exception e) {
            // 재시도 로직 자동 처리
            log.error("이메일 발송 실패, 재시도됨", e);
            throw e;  // 실패 시 자동 재시도
        }
    }
}
```

**장점**:
- **재시도 보장**: 실패 시 자동으로 재시도
- **순서 보장**: 파티션 키로 순서 보장 가능
- **장애 격리**: 컨슈머 장애가 프로듀서에 영향 없음
- **확장성**: 컨슈머 수평 확장 가능
- **모니터링**: 큐 깊이, 처리 속도 추적

**트레이드오프**:
- **인프라 복잡도**: Kafka/RabbitMQ 운영 필요
- **지연 시간**: 큐 처리 시간 추가
- **Eventual Consistency**: 즉시 반영되지 않음

**사용 사례**:
```java
// 주문 후 여러 서비스에 알림 (확장 가능)
kafkaTemplate.send("order-created", event);

// 다양한 컨슈머가 구독
- EmailConsumer: 이메일 발송
- SmsConsumer: 알림톡 발송
- AnalyticsConsumer: 통계 집계
- ExternalApiConsumer: 외부 시스템 연동
```

### 2. Reactive Programming (WebFlux)

완전한 논블로킹 스택으로 높은 동시성을 처리합니다.

```java
// Spring WebFlux
@RestController
public class OrderController {

    @PostMapping("/orders")
    public Mono<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        return orderService.save(request)
            .flatMap(order -> paymentService.process(order))
            .flatMap(order -> stockService.decrease(order))
            .flatMap(order -> {
                // 이메일 발송은 병렬로 (결과 기다리지 않음)
                emailService.sendAsync(order).subscribe();
                return Mono.just(OrderResponse.from(order));
            })
            .onErrorResume(e -> {
                log.error("주문 처리 실패", e);
                return Mono.just(OrderResponse.failed());
            });
    }
}

// Reactive Repository
public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {
    Flux<Order> findByUserId(Long userId);
}

// 병렬 처리
public Mono<OrderSummary> getOrderSummary(Long orderId) {
    Mono<Order> orderMono = orderRepository.findById(orderId);
    Mono<User> userMono = userRepository.findById(userId);
    Mono<Payment> paymentMono = paymentRepository.findByOrderId(orderId);

    // 3개 쿼리 병렬 실행, 모두 완료되면 조합
    return Mono.zip(orderMono, userMono, paymentMono)
        .map(tuple -> new OrderSummary(
            tuple.getT1(),  // Order
            tuple.getT2(),  // User
            tuple.getT3()   // Payment
        ));
}
```

**장점**:
- **높은 동시성**: 적은 스레드로 많은 요청 처리
- **완전한 논블로킹**: I/O 대기 없음
- **백프레셔 지원**: 느린 컨슈머 자동 제어
- **함수형 프로그래밍**: 체이닝으로 명확한 흐름

**트레이드오프**:
- **학습 곡선**: Reactive 패러다임 이해 필요
- **디버깅 어려움**: 스택 트레이스 복잡
- **생태계**: 모든 라이브러리가 리액티브를 지원하지 않음
- **블로킹 호출**: 하나라도 블로킹이면 이점 상실

**선택 기준**:
```
WebFlux 적합:
- I/O 바운드 작업이 많음 (API 호출, DB 쿼리)
- 높은 동시성 필요 (수천 개 동시 연결)
- 스트리밍 데이터 처리

MVC 유지:
- CPU 바운드 작업이 많음
- 기존 블로킹 라이브러리 많이 사용
- 팀의 학습 비용 고려
```

### 3. Saga 패턴 (분산 트랜잭션)

마이크로서비스 환경에서 여러 서비스에 걸친 트랜잭션을 처리합니다.

```java
// Orchestration 방식 - 중앙 오케스트레이터가 제어
@Service
public class OrderSagaOrchestrator {

    public OrderResult createOrder(OrderRequest request) {
        SagaTransaction saga = new SagaTransaction();

        try {
            // 1. 주문 생성
            Order order = orderService.createOrder(request);
            saga.addCompensation(() -> orderService.cancelOrder(order.getId()));

            // 2. 결제
            Payment payment = paymentService.processPayment(order);
            saga.addCompensation(() -> paymentService.refund(payment.getId()));

            // 3. 재고 차감
            stockService.decreaseStock(order);
            saga.addCompensation(() -> stockService.increaseStock(order));

            // 4. 배송 시작
            deliveryService.startDelivery(order);
            saga.addCompensation(() -> deliveryService.cancelDelivery(order.getId()));

            saga.commit();
            return OrderResult.success(order);

        } catch (Exception e) {
            // 실패 시 보상 트랜잭션 실행 (역순)
            saga.rollback();
            return OrderResult.failed(e.getMessage());
        }
    }
}

// Choreography 방식 - 이벤트 기반 자율 처리
@Service
public class OrderService {

    @Transactional
    public void createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        eventPublisher.publish(new OrderCreatedEvent(order));
    }
}

@Service
public class PaymentService {

    @EventListener
    @Transactional
    public void handleOrderCreated(OrderCreatedEvent event) {
        try {
            Payment payment = processPayment(event.getOrder());
            eventPublisher.publish(new PaymentCompletedEvent(payment));
        } catch (Exception e) {
            eventPublisher.publish(new PaymentFailedEvent(event.getOrderId()));
        }
    }

    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        // 보상: 주문 취소 이벤트 발행
        eventPublisher.publish(new CancelOrderEvent(event.getOrderId()));
    }
}
```

**Orchestration vs Choreography**:

| | Orchestration | Choreography |
|---|---|---|
| **제어** | 중앙 오케스트레이터 | 각 서비스 자율 |
| **복잡도** | 로직 집중, 이해 쉬움 | 로직 분산, 추적 어려움 |
| **결합도** | 높음 (오케스트레이터 의존) | 낮음 (이벤트만 의존) |
| **확장성** | 오케스트레이터 병목 | 수평 확장 쉬움 |

**트레이드오프**:
- **장점**: 분산 환경에서 일관성 보장, 실패 시 자동 보상
- **단점**: 복잡도 증가, 디버깅 어려움, Eventual Consistency

### 4. 서킷 브레이커 (Resilience4j)

외부 API 호출 시 장애를 격리하고 빠르게 실패합니다.

```java
@Service
public class ExternalApiService {

    private final CircuitBreaker circuitBreaker;

    @CircuitBreaker(name = "externalApi", fallbackMethod = "fallback")
    @Retry(name = "externalApi")
    @RateLimiter(name = "externalApi")
    public String callExternalApi(String request) {
        // 외부 API 호출 (느리거나 실패할 수 있음)
        return restTemplate.postForObject(url, request, String.class);
    }

    // Fallback 처리
    public String fallback(String request, Exception e) {
        log.warn("외부 API 호출 실패, 기본값 반환", e);
        return "DEFAULT_RESPONSE";
    }
}

// 설정
@Configuration
public class Resilience4jConfig {

    @Bean
    public CircuitBreakerConfig circuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
            .failureRateThreshold(50)  // 실패율 50% 이상이면 Open
            .waitDurationInOpenState(Duration.ofSeconds(30))  // 30초 대기
            .slidingWindowSize(10)  // 최근 10개 요청 기준
            .build();
    }
}
```

**상태 전환**:
```
Closed (정상)
  ↓ 실패율 > 50%
Open (차단) - 모든 요청 즉시 실패
  ↓ 30초 후
Half-Open (테스트)
  ↓ 성공하면
Closed (복구)
```

**장점**:
- **빠른 실패**: 장애 서비스를 계속 호출하지 않음
- **자동 복구**: 일정 시간 후 자동으로 재시도
- **Fallback**: 대체 응답 제공

**트레이드오프**:
- **복잡도**: 상태 관리, 모니터링 필요
- **오탐**: 일시적 장애를 영구 장애로 오인 가능

### 아키텍처 선택 가이드

| 요구사항 | 추천 아키텍처 |
|---------|--------------|
| 안정적인 비동기 처리 | 메시지 큐 (Kafka, RabbitMQ) |
| 높은 동시성 | WebFlux (Reactive) |
| 분산 트랜잭션 | Saga 패턴 |
| 외부 API 장애 격리 | 서킷 브레이커 |
| 간단한 백그라운드 작업 | @Async |

**진화 경로**:
```
1단계: @Async (간단한 비동기)
  ↓
2단계: + 메시지 큐 (안정성, 재시도)
  ↓
3단계: + Saga 패턴 (분산 트랜잭션)
  ↓
4단계: WebFlux (완전한 논블로킹)
```

## 정리

비동기 처리의 선택은 **기술**과 **아키텍처** 두 가지 차원의 트레이드오프입니다.

**기술 레벨의 선택**:
- **동기**: 간단하고 디버깅 쉬움. 핵심 비즈니스 로직에 적합
- **@Async**: 간단한 백그라운드 작업. 프록시 기반, 예외 처리 주의
- **CompletableFuture**: 체이닝과 병렬 처리. 세밀한 제어 가능
- **트레이드오프**: 복잡도 vs 성능, 디버깅 난이도 vs 처리량

**아키텍처 레벨의 해결책**:
- **메시지 큐**: 안정적인 비동기 처리, 재시도 보장 (인프라 복잡도 트레이드오프)
- **WebFlux**: 높은 동시성, 완전한 논블로킹 (학습 곡선 트레이드오프)
- **Saga 패턴**: 분산 트랜잭션 처리 (복잡도 증가 트레이드오프)
- **서킷 브레이커**: 외부 API 장애 격리 (상태 관리 복잡도 트레이드오프)

**선택의 기준**:
1. **작업 특성**: 핵심 로직 vs 부가 작업, I/O 바운드 vs CPU 바운드
2. **신뢰성 요구사항**: 실패 시 재시도 필요 여부, 순서 보장 필요 여부
3. **시스템 규모**: 동시 접속자 수, 처리량, 확장성 필요
4. **팀 역량**: 학습 비용, 운영 경험, 인프라 지원

**진화 전략**:
```
시작: 동기 처리 (단순함)
  ↓ 성능 개선 필요
1단계: @Async (백그라운드 작업)
  ↓ 안정성 필요
2단계: + 메시지 큐 (재시도, 장애 격리)
  ↓ 분산 환경
3단계: + Saga 패턴 (분산 트랜잭션)
  ↓ 극한의 동시성
4단계: WebFlux (완전한 논블로킹)
```

**핵심 원칙**:
- 핵심 비즈니스 로직은 동기로 처리하여 일관성 보장
- 부가 작업은 비동기로 처리하여 응답 시간 단축
- 실패 시 재시도가 필요하면 메시지 큐 사용
- 외부 API 호출은 서킷 브레이커로 장애 격리

성능 개선을 위해 무조건 비동기를 선택하기보다는, 복잡도와 유지보수성을 함께 고려해야 합니다. 현재 요구사항에 맞는 가장 단순한 해결책을 선택하고, 필요에 따라 점진적으로 진화시키는 것이 중요합니다.
