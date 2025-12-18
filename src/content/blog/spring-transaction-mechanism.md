---
title: 'Spring이 트랜잭션을 다루는 방식 - 프록시와 커넥션'
description: '@Transactional 이면에서 Spring과 DB가 어떻게 협력하는지 정리했습니다'
pubDate: 'Dec 22 2024'
tags: ['Spring', 'Database']
series: 'database-fundamentals'
seriesOrder: 2
quiz:
  - question: "@Transactional 어노테이션이 동작하기 위해 Spring이 사용하는 기술은?"
    options:
      - "Reflection API"
      - "Proxy 패턴"
      - "Static 메서드"
      - "Annotation Processor"
    correctAnswer: 1
    explanation: "Spring은 프록시 패턴을 사용하여 @Transactional을 구현합니다. 프록시 객체가 실제 객체를 감싸서 메서드 호출 전후에 트랜잭션 시작/커밋/롤백 로직을 추가합니다."
  - question: "Spring의 PlatformTransactionManager가 하는 역할은?"
    options:
      - "트랜잭션의 ACID 속성을 보장한다"
      - "트랜잭션의 시작과 종료를 관리한다"
      - "격리 수준을 설정한다"
      - "데이터베이스에 직접 연결한다"
    correctAnswer: 1
    explanation: "PlatformTransactionManager는 트랜잭션의 시작(BEGIN), 커밋(COMMIT), 롤백(ROLLBACK)을 관리합니다. 실제 ACID 보장과 격리 수준 처리는 데이터베이스가 담당합니다."
  - question: "다음 코드에서 validateOrder() 메서드에 트랜잭션이 적용되는가?<br><br>@Transactional<br>public void createOrder() {<br>&nbsp;&nbsp;this.validateOrder();<br>}<br><br>@Transactional<br>public void validateOrder() { }"
    options:
      - "적용된다"
      - "적용되지 않는다"
      - "경우에 따라 다르다"
      - "컴파일 에러가 발생한다"
    correctAnswer: 1
    explanation: "적용되지 않습니다. 같은 클래스 내부에서 메서드를 호출할 때는 프록시를 거치지 않고 직접 호출되기 때문에 @Transactional이 동작하지 않습니다. 이를 내부 호출 문제라고 합니다."
  - question: "트랜잭션이 시작될 때 Spring이 커넥션 풀에서 커넥션을 획득하는 시점은?"
    options:
      - "애플리케이션 시작 시"
      - "@Transactional 메서드 진입 시"
      - "첫 번째 쿼리 실행 시"
      - "커밋 직전"
    correctAnswer: 1
    explanation: "@Transactional 메서드에 진입할 때 PlatformTransactionManager가 커넥션 풀에서 커넥션을 획득하고 트랜잭션을 시작합니다. 메서드가 끝나면 커밋 또는 롤백 후 커넥션을 풀에 반납합니다."
  - question: "Spring Boot에서 spring-boot-starter-data-jpa를 사용할 때 자동 설정되는 TransactionManager는?"
    options:
      - "DataSourceTransactionManager"
      - "JpaTransactionManager"
      - "HibernateTransactionManager"
      - "JtaTransactionManager"
    correctAnswer: 1
    explanation: "Spring Boot는 의존성에 따라 적절한 TransactionManager를 자동으로 등록합니다. spring-boot-starter-data-jpa를 사용하면 JpaTransactionManager가 자동 설정됩니다."
---

@Transactional을 붙이면 트랜잭션이 자동으로 처리된다는 건 알고 있습니다. 하지만 Spring이 정확히 무엇을 하는지, DB와 역할을 어떻게 나누는지 명확하지 않았습니다.

이 글에서는 @Transactional 이면에서 일어나는 일을 정리했습니다.

## @Transactional은 무엇을 하는가

먼저 역할을 명확히 구분해야 합니다.

**Spring의 역할**
- 트랜잭션 시작 (BEGIN)
- 트랜잭션 종료 (COMMIT 또는 ROLLBACK)
- 커넥션 획득과 반납 관리

**Database의 역할**
- ACID 속성 보장
- 격리 수준 처리
- 실제 데이터 변경과 복구

Spring은 트랜잭션의 **시작과 끝을 관리**하는 역할만 합니다. 트랜잭션의 본질적인 기능은 데이터베이스가 처리합니다.

```java
@Transactional
public void transfer(Long fromId, Long toId, int amount) {
    accountRepository.withdraw(fromId, amount);  // 출금
    accountRepository.deposit(toId, amount);     // 입금
}
```

이 코드를 실행하면 다음과 같은 일이 일어납니다.

```sql
-- Spring이 실행
BEGIN;

-- 애플리케이션 로직
UPDATE account SET balance = balance - 10000 WHERE id = 1;
UPDATE account SET balance = balance + 10000 WHERE id = 2;

-- Spring이 실행 (정상 완료 시)
COMMIT;
```

Spring은 메서드 실행 전에 `BEGIN`을, 완료 후에 `COMMIT`을 실행합니다. 예외가 발생하면 `ROLLBACK`을 실행합니다.

## 프록시 메커니즘

@Transactional이 동작하려면 프록시가 필요합니다.

### 프록시란

프록시는 실제 객체를 감싸는 대리 객체입니다. 클라이언트는 프록시를 통해 실제 객체에 접근합니다.

```
Client → Proxy → 실제 객체
```

프록시는 실제 객체의 메서드 호출 전후에 부가 기능을 추가할 수 있습니다.

### Spring의 프록시 생성

Spring은 @Transactional이 붙은 클래스를 감지하면 프록시 객체를 생성합니다.

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);
    }
}
```

Spring Boot 2.0부터는 CGLIB를 사용하여 프록시를 생성합니다. CGLIB는 클래스를 상속받아 프록시를 만듭니다.

```
OrderService (원본)
    ↑
OrderService$$EnhancerBySpringCGLIB (프록시)
```

실제로 주입되는 객체는 프록시입니다.

### 프록시의 동작 흐름

```java
// 1. 클라이언트가 프록시의 메서드를 호출
orderService.createOrder(order);

// 2. 프록시가 트랜잭션을 시작
transactionManager.getTransaction();  // BEGIN

try {
    // 3. 실제 객체의 메서드 실행
    실제_OrderService.createOrder(order);

    // 4. 정상 완료 시 커밋
    transactionManager.commit();  // COMMIT
} catch (Exception e) {
    // 5. 예외 발생 시 롤백
    transactionManager.rollback();  // ROLLBACK
    throw e;
}
```

프록시가 트랜잭션 처리 코드를 삽입합니다. 개발자는 비즈니스 로직만 작성하면 됩니다.

### 내부 호출 문제

프록시는 외부에서 호출될 때만 동작합니다. 같은 클래스 내부에서 메서드를 호출하면 프록시를 거치지 않습니다.

```java
@Service
public class OrderService {

    public void createOrder(Order order) {
        validateOrder(order);  // 내부 호출
        orderRepository.save(order);
    }

    @Transactional
    public void validateOrder(Order order) {
        // 트랜잭션이 적용되지 않음!
        if (order.getAmount() < 0) {
            throw new InvalidOrderException();
        }
    }
}
```

createOrder()에서 validateOrder()를 호출하면 `this.validateOrder()`가 실행됩니다. 이것은 프록시가 아닌 실제 객체의 메서드를 직접 호출하는 것입니다.

**해결 방법**
1. 클래스 분리
2. self-injection (권장하지 않음)
3. createOrder()에도 @Transactional 추가

가장 좋은 방법은 클래스를 분리하는 것입니다.

```java
@Service
public class OrderValidator {
    @Transactional
    public void validate(Order order) {
        // 트랜잭션 적용됨
    }
}

@Service
public class OrderService {
    private final OrderValidator validator;

    public void createOrder(Order order) {
        validator.validate(order);  // 외부 호출
        orderRepository.save(order);
    }
}
```

## PlatformTransactionManager

Spring의 트랜잭션 관리는 PlatformTransactionManager 인터페이스를 중심으로 동작합니다.

```java
public interface PlatformTransactionManager {
    TransactionStatus getTransaction(TransactionDefinition definition);
    void commit(TransactionStatus status);
    void rollback(TransactionStatus status);
}
```

이 인터페이스는 트랜잭션의 시작, 커밋, 롤백을 추상화합니다.

### 구현체

사용하는 데이터 접근 기술에 따라 다른 구현체가 필요합니다.

| 구현체 | 사용 기술 |
|--------|----------|
| DataSourceTransactionManager | JDBC, MyBatis |
| JpaTransactionManager | JPA (Hibernate) |
| HibernateTransactionManager | Hibernate 직접 사용 |
| JtaTransactionManager | 분산 트랜잭션 |

Spring Boot는 의존성을 보고 자동으로 적절한 TransactionManager를 등록합니다.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

이 의존성이 있으면 JpaTransactionManager가 자동 등록됩니다.

### @Transactional과의 관계

@Transactional 어노테이션은 내부적으로 PlatformTransactionManager를 사용합니다.

```java
@Transactional
public void createOrder(Order order) {
    // 비즈니스 로직
}
```

이 코드는 다음과 같이 동작합니다.

```java
TransactionStatus status = transactionManager.getTransaction(정의);

try {
    createOrder(order);
    transactionManager.commit(status);
} catch (RuntimeException e) {
    transactionManager.rollback(status);
    throw e;
}
```

프록시가 자동으로 이 코드를 실행합니다.

## 커넥션은 언제 획득하는가

트랜잭션과 커넥션은 밀접한 관계가 있습니다. 트랜잭션은 하나의 커넥션 안에서 동작합니다.

### 커넥션 획득 시점

트랜잭션이 시작될 때 커넥션을 획득합니다.

```java
@Transactional
public void createOrder(Order order) {
    // 메서드 진입 시점에 커넥션 획득
    orderRepository.save(order);
    // 메서드 종료 시점에 커넥션 반납
}
```

**흐름**
1. @Transactional 메서드 진입
2. TransactionManager가 커넥션 풀에서 커넥션 획득
3. `BEGIN` 실행
4. 비즈니스 로직 실행
5. `COMMIT` 또는 `ROLLBACK` 실행
6. 커넥션을 풀에 반납

### 커넥션 풀

커넥션 풀은 미리 생성된 커넥션을 보관하는 저장소입니다.

```
[HikariCP 커넥션 풀]
┌─────────────────┐
│ Connection 1    │ ← 사용 중
│ Connection 2    │ ← 유휴
│ Connection 3    │ ← 유휴
│ ...             │
│ Connection 10   │ ← 사용 중
└─────────────────┘
```

트랜잭션마다 하나의 커넥션을 사용합니다. 메서드가 끝나면 커넥션을 반납해야 다른 요청이 사용할 수 있습니다.

### 커넥션 누수

커넥션을 반납하지 않으면 풀이 고갈됩니다.

```java
// 안티 패턴
public void processOrders() {
    for (Order order : orders) {
        createOrder(order);  // 각각 새로운 트랜잭션/커넥션
    }
}
```

이 코드는 각 주문마다 트랜잭션을 시작하고 커넥션을 획득합니다. 처리 속도가 느리면 커넥션이 부족해질 수 있습니다.

```java
// 개선
@Transactional
public void processOrders() {
    for (Order order : orders) {
        orderRepository.save(order);  // 하나의 트랜잭션/커넥션
    }
}
```

외부 메서드에 @Transactional을 붙여 하나의 트랜잭션으로 묶습니다.

### ThreadLocal과 커넥션

Spring은 ThreadLocal을 사용하여 트랜잭션과 커넥션을 관리합니다.

```java
@Transactional
public void createOrder(Order order) {
    orderRepository.save(order);        // 같은 커넥션
    notificationService.send(order);    // 같은 커넥션
}
```

같은 스레드에서 실행되는 모든 데이터베이스 작업은 같은 커넥션을 사용합니다. ThreadLocal에 저장된 커넥션을 꺼내 씁니다.

## 주의할 점

### private 메서드

프록시는 메서드를 오버라이드해야 합니다. private 메서드는 오버라이드할 수 없습니다.

```java
@Transactional
private void validateOrder(Order order) {
    // 트랜잭션이 적용되지 않음
}
```

@Transactional은 public 메서드에만 사용해야 합니다.

### Checked Exception

기본적으로 RuntimeException만 롤백합니다.

```java
@Transactional
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException();  // 롤백되지 않음!
}
```

Checked Exception에서도 롤백하려면 명시해야 합니다.

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException();  // 롤백됨
}
```

### 트랜잭션 범위

트랜잭션은 가능한 짧게 유지해야 합니다.

```java
// 안티 패턴
@Transactional
public void processOrder(Order order) {
    validateOrder(order);
    sendEmail(order);        // 외부 API 호출 (느림)
    saveOrder(order);
}
```

외부 API 호출이나 무거운 작업은 트랜잭션 밖으로 빼야 합니다.

```java
// 개선
public void processOrder(Order order) {
    validateOrder(order);
    saveOrderWithTransaction(order);
    sendEmail(order);  // 트랜잭션 밖
}

@Transactional
public void saveOrderWithTransaction(Order order) {
    saveOrder(order);
}
```

트랜잭션이 길어지면 커넥션을 오래 점유하고, 다른 트랜잭션이 대기하게 됩니다.

## 프로그래매틱 트랜잭션 관리

@Transactional로 해결되지 않는 경우 코드로 직접 트랜잭션을 관리할 수 있습니다.

### TransactionTemplate

선언적 @Transactional 대신 코드로 트랜잭션을 제어합니다.

```java
@Service
public class OrderService {
    private final TransactionTemplate transactionTemplate;
    private final OrderRepository orderRepository;

    public OrderService(PlatformTransactionManager transactionManager,
                        OrderRepository orderRepository) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.orderRepository = orderRepository;
    }

    public void createOrder(Order order) {
        transactionTemplate.execute(status -> {
            try {
                orderRepository.save(order);
                // 조건에 따라 롤백
                if (order.getAmount() < 0) {
                    status.setRollbackOnly();
                }
                return null;
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
}
```

**사용 사례**:
- 조건부 트랜잭션 처리
- 부분 롤백이 필요한 경우
- 트랜잭션 내부에서 세밀한 제어가 필요한 경우

```java
// 복잡한 트랜잭션 제어
public void processOrders(List<Order> orders) {
    for (Order order : orders) {
        transactionTemplate.execute(status -> {
            try {
                orderRepository.save(order);
                // 개별 주문 실패는 무시하고 계속 진행
            } catch (Exception e) {
                log.warn("주문 처리 실패: {}", order.getId(), e);
                status.setRollbackOnly();
                // 다음 주문 계속 처리
            }
            return null;
        });
    }
}
```

**트레이드오프**:
- **장점**: 세밀한 제어, 조건부 롤백, 반환값 처리
- **단점**: 코드 복잡도 증가, 선언적 방식보다 가독성 낮음

### 트랜잭션 전파 기본

여러 트랜잭션 메서드가 호출될 때 어떻게 동작하는지 제어합니다.

```java
@Transactional
public void outerMethod() {
    innerMethod();  // 어떻게 동작할까?
}

@Transactional(propagation = Propagation.REQUIRED)  // 기본값
public void innerMethod() {
    // 외부 트랜잭션에 참여
}
```

**주요 전파 옵션**:

| 전파 옵션 | 동작 |
|----------|------|
| **REQUIRED** | 기존 트랜잭션 참여, 없으면 새로 생성 (기본값) |
| **REQUIRES_NEW** | 항상 새 트랜잭션 생성, 기존 트랜잭션 일시 중단 |
| **NESTED** | 중첩 트랜잭션 생성 (Savepoint 사용) |

```java
@Service
public class OrderService {

    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);
        // 알림 실패해도 주문은 성공
        notificationService.sendWithNewTransaction(order);
    }
}

@Service
public class NotificationService {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendWithNewTransaction(Order order) {
        // 독립적인 트랜잭션
        // 실패해도 외부 트랜잭션에 영향 없음
    }
}
```

**트레이드오프**:
- REQUIRED: 단순하지만 부분 롤백 불가
- REQUIRES_NEW: 독립적이지만 커넥션 2개 필요
- NESTED: 부분 롤백 가능하지만 모든 DB가 지원하지 않음

## 아키텍처로 풀어내는 트랜잭션 문제

@Transactional만으로는 해결되지 않는 복잡한 문제가 많습니다. 아키텍처 패턴으로 근본적으로 해결할 수 있습니다.

### 1. 이벤트 기반 아키텍처

트랜잭션 경계를 이벤트로 명확히 분리합니다.

```java
// 주문 생성 (트랜잭션 내)
@Service
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void createOrder(OrderRequest request) {
        Order order = new Order(request);
        orderRepository.save(order);

        // 이벤트 발행 (트랜잭션 커밋 후 실행)
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
    }
}

// 이벤트 처리 (별도 트랜잭션)
@Component
public class OrderEventListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 트랜잭션이 성공적으로 커밋된 후에만 실행
        emailService.sendConfirmation(event.getOrderId());
        smsService.sendNotification(event.getOrderId());
        // 실패해도 주문 트랜잭션에 영향 없음
    }
}
```

**TransactionPhase 옵션**:
- **AFTER_COMMIT**: 트랜잭션 커밋 후 (기본값, 가장 많이 사용)
- **AFTER_ROLLBACK**: 트랜잭션 롤백 후
- **AFTER_COMPLETION**: 커밋/롤백 후 (성공/실패 무관)
- **BEFORE_COMMIT**: 트랜잭션 커밋 전

**효과**:
- 트랜잭션 범위 최소화
- 부가 작업(이메일, 알림)이 핵심 로직에 영향 없음
- 실패 시 재처리 가능

**트레이드오프**:
- 이벤트가 유실될 수 있음 (서버 재시작)
- 비동기 처리로 즉시 확인 불가

### 2. Outbox Pattern

트랜잭션과 메시지 발행의 원자성을 보장합니다.

```java
// Outbox 테이블
@Entity
public class OutboxEvent {
    @Id @GeneratedValue
    private Long id;
    private String eventType;
    private String payload;
    private LocalDateTime createdAt;
    private boolean published;
}

// 주문 생성 시 Outbox에 함께 저장
@Service
public class OrderService {

    @Transactional
    public void createOrder(OrderRequest request) {
        // 1. 주문 저장
        Order order = orderRepository.save(new Order(request));

        // 2. Outbox 이벤트 저장 (같은 트랜잭션)
        OutboxEvent event = new OutboxEvent(
            "OrderCreated",
            objectMapper.writeValueAsString(order)
        );
        outboxRepository.save(event);

        // 트랜잭션 커밋 → 주문과 이벤트가 함께 저장됨 (원자성)
    }
}

// 별도 스케줄러가 Outbox를 폴링하여 메시지 발행
@Component
public class OutboxPublisher {

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void publishEvents() {
        List<OutboxEvent> events = outboxRepository.findByPublishedFalse();

        for (OutboxEvent event : events) {
            try {
                // Kafka로 발행
                kafkaTemplate.send("order-events", event.getPayload());

                // 발행 완료 표시
                event.setPublished(true);
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("이벤트 발행 실패", e);
                // 재시도 (다음 폴링에서 재시도됨)
            }
        }
    }
}
```

**동작 흐름**:
```
1. 주문 저장 + Outbox 이벤트 저장 (같은 트랜잭션)
   ↓
2. 트랜잭션 커밋 (원자성 보장)
   ↓
3. 스케줄러가 Outbox 폴링
   ↓
4. 메시지 큐(Kafka)로 발행
   ↓
5. published = true로 업데이트
```

**효과**:
- 트랜잭션과 메시지 발행의 원자성 보장
- 메시지 유실 방지
- At-least-once 전달 보장

**트레이드오프**:
- Outbox 테이블 관리 필요
- 폴링 오버헤드
- 약간의 지연 시간 (1~2초)

### 3. Saga 패턴 (분산 트랜잭션)

마이크로서비스 환경에서 여러 서비스에 걸친 트랜잭션을 처리합니다.

```java
// Orchestration 방식 - 주문 서비스가 전체 흐름 제어
@Service
public class OrderSagaOrchestrator {

    public OrderResult createOrder(OrderRequest request) {
        // 1. 주문 생성 (Order Service)
        Order order = orderService.createOrder(request);

        try {
            // 2. 결제 (Payment Service)
            Payment payment = paymentService.processPayment(order);

            // 3. 재고 차감 (Inventory Service)
            inventoryService.decreaseStock(order);

            // 4. 배송 시작 (Delivery Service)
            deliveryService.startDelivery(order);

            return OrderResult.success(order);

        } catch (PaymentFailedException e) {
            // 보상 트랜잭션: 주문 취소
            orderService.cancelOrder(order.getId());
            return OrderResult.failed("결제 실패");

        } catch (StockInsufficientException e) {
            // 보상 트랜잭션: 결제 취소 → 주문 취소
            paymentService.refund(payment.getId());
            orderService.cancelOrder(order.getId());
            return OrderResult.failed("재고 부족");
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

    @EventListener
    @Transactional
    public void handlePaymentFailed(PaymentFailedEvent event) {
        // 보상: 주문 취소
        Order order = orderRepository.findById(event.getOrderId());
        order.cancel();
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
}
```

**Orchestration vs Choreography**:

| | Orchestration | Choreography |
|---|---|---|
| **제어** | 중앙 조정자가 전체 흐름 제어 | 각 서비스가 이벤트에 반응 |
| **복잡도** | 로직 집중, 이해 쉬움 | 로직 분산, 추적 어려움 |
| **결합도** | 높음 (조정자에 의존) | 낮음 (이벤트만 의존) |
| **롤백** | 명시적 보상 트랜잭션 | 이벤트 기반 보상 |

**트레이드오프**:
- **장점**: 분산 환경에서 일관성 보장, 서비스 독립성
- **단점**: 복잡도 증가, Eventual Consistency, 디버깅 어려움

### 4. CQRS (Command Query Responsibility Segregation)

Command(쓰기)와 Query(읽기)를 분리하여 트랜잭션 복잡도를 낮춥니다.

```java
// Command (쓰기) - 강한 트랜잭션 일관성
@Service
public class OrderCommandService {

    @Transactional
    public void createOrder(CreateOrderCommand command) {
        Order order = new Order(command);
        orderRepository.save(order);

        // 읽기 모델 업데이트 이벤트 발행
        eventPublisher.publish(new OrderCreatedEvent(order));
    }
}

// Query (읽기) - 읽기 전용, 트랜잭션 불필요
@Service
public class OrderQueryService {

    @Transactional(readOnly = true)
    public OrderSummary getOrderSummary(Long orderId) {
        // 읽기 전용 모델에서 조회 (역정규화된 테이블)
        return orderReadRepository.findSummaryById(orderId);
    }
}

// 읽기 모델 업데이트 (비동기)
@Component
public class OrderReadModelUpdater {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void updateReadModel(OrderCreatedEvent event) {
        // 읽기 최적화된 모델 업데이트
        OrderSummary summary = OrderSummary.from(event.getOrder());
        orderReadRepository.save(summary);
    }
}
```

**효과**:
- 쓰기는 트랜잭션 일관성 유지
- 읽기는 트랜잭션 오버헤드 없이 빠르게
- 각각 독립적으로 확장 가능

**트레이드오프**:
- 읽기/쓰기 모델 동기화 필요
- Eventual Consistency
- 복잡도 증가

### 아키텍처 선택 가이드

| 문제 | 해결책 |
|------|--------|
| 외부 API 호출이 트랜잭션 범위에 포함됨 | 이벤트 기반 (TransactionalEventListener) |
| 메시지 발행이 트랜잭션과 함께 실패 | Outbox Pattern |
| 마이크로서비스 간 트랜잭션 필요 | Saga 패턴 |
| 복잡한 조회가 트랜잭션을 느리게 함 | CQRS (읽기/쓰기 분리) |

**진화 경로**:
```
1단계: @Transactional (단일 서비스)
  ↓
2단계: + 이벤트 기반 (트랜잭션 경계 분리)
  ↓
3단계: + Outbox Pattern (메시지 원자성)
  ↓
4단계: Saga 패턴 (분산 트랜잭션)
  ↓
5단계: CQRS (읽기/쓰기 완전 분리)
```

## 정리

Spring 트랜잭션 관리는 **선언적 방식**과 **아키텍처 패턴**으로 접근할 수 있습니다.

**기본 동작 원리**:
- Spring: 트랜잭션 시작(BEGIN)/종료(COMMIT/ROLLBACK) 관리
- Database: ACID 보장, 격리 수준 처리, 실제 데이터 변경/복구
- Proxy: @Transactional 메서드 호출 전후에 트랜잭션 코드 삽입
- PlatformTransactionManager: 커넥션 획득/반납, 트랜잭션 추상화

**트랜잭션 관리 방식**:
- **선언적 (@Transactional)**: 간단하지만 세밀한 제어 어려움
- **프로그래매틱 (TransactionTemplate)**: 조건부 롤백, 세밀한 제어 가능
- **트랜잭션 전파**: REQUIRED(기본), REQUIRES_NEW(독립), NESTED(중첩)

**주의사항**:
- 내부 호출: 프록시를 거치지 않아 트랜잭션 미적용 → 클래스 분리
- Private 메서드: 프록시 불가 → Public 메서드만 사용
- Checked Exception: 기본적으로 롤백 안 됨 → rollbackFor 명시
- 트랜잭션 범위: 외부 API 호출은 트랜잭션 밖으로 분리

**아키텍처 레벨 해결책**:
- **이벤트 기반**: TransactionalEventListener로 트랜잭션 경계 분리 (부가 작업 독립화)
- **Outbox Pattern**: 트랜잭션과 메시지 발행의 원자성 보장 (메시지 유실 방지)
- **Saga 패턴**: 분산 트랜잭션 대안, 보상 트랜잭션 (마이크로서비스 환경)
- **CQRS**: Command/Query 분리, 각각 최적화 (복잡도 vs 성능 트레이드오프)

**진화 전략**:
```
1단계: @Transactional (단일 서비스 기본)
  ↓
2단계: + TransactionalEventListener (경계 분리)
  ↓
3단계: + Outbox Pattern (메시지 원자성)
  ↓
4단계: Saga 패턴 (분산 환경)
  ↓
5단계: CQRS (읽기/쓰기 완전 분리)
```

**핵심 원칙**:
- 트랜잭션 범위는 최소화하되, 일관성이 필요한 작업은 함께 묶어야 합니다
- 외부 API, 무거운 작업은 트랜잭션 밖으로 분리하세요
- 커넥션은 한정된 자원입니다. 빠르게 획득하고 빠르게 반납하세요
- 단순한 경우 @Transactional로 충분하지만, 복잡한 분산 환경에서는 아키텍처 패턴이 필요합니다

@Transactional은 강력하지만 만능은 아닙니다. 문제의 복잡도에 맞는 적절한 해결책을 선택하는 것이 중요합니다.
