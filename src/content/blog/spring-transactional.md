---
title: 'Spring @Transactional 동작 원리'
description: '@Transactional이 실제로 어떻게 동작하는지, 왜 안 먹히는 경우가 있는지 정리했습니다'
pubDate: 'Dec 14 2024'
tags: ['Spring', 'Database']
series: 'spring-fundamentals'
seriesOrder: 3
quiz:
  - question: "@Transactional의 기본 전파 옵션(propagation)은?"
    options:
      - "REQUIRES_NEW"
      - "REQUIRED"
      - "NESTED"
      - "SUPPORTS"
    correctAnswer: 1
    explanation: "기본값은 REQUIRED입니다. 기존 트랜잭션이 있으면 참여하고, 없으면 새로 시작합니다."
  - question: "REQUIRES_NEW 전파 옵션의 특징은?"
    options:
      - "기존 트랜잭션에 참여한다"
      - "항상 새 트랜잭션을 시작한다"
      - "트랜잭션 없이 실행한다"
      - "중첩 트랜잭션을 만든다"
    correctAnswer: 1
    explanation: "REQUIRES_NEW는 항상 새로운 트랜잭션을 시작합니다. 기존 트랜잭션은 일시 중단되고, 새 트랜잭션이 독립적으로 커밋/롤백됩니다."
  - question: "@Transactional에서 기본적으로 롤백되지 않는 예외는?"
    options:
      - "RuntimeException"
      - "NullPointerException"
      - "IOException"
      - "IllegalArgumentException"
    correctAnswer: 2
    explanation: "기본적으로 RuntimeException과 Error만 롤백됩니다. IOException 같은 Checked Exception은 롤백되지 않습니다. rollbackFor 옵션으로 변경할 수 있습니다."
  - question: "@Transactional(readOnly = true)의 효과는?"
    options:
      - "SELECT만 허용"
      - "UPDATE 시 예외 발생"
      - "JPA flush 생략 및 성능 최적화"
      - "효과 없음"
    correctAnswer: 2
    explanation: "readOnly = true로 설정하면 JPA는 스냅샷을 만들지 않고 flush를 생략합니다. 변경 감지가 필요 없어 성능이 좋아집니다."
---

@Transactional을 붙이면 트랜잭션이 적용됩니다. 하지만 왜 private 메서드에서는 안 되는지, 같은 클래스 내부 호출에서 왜 롤백이 안 되는지 설명하기 어렵습니다. AOP 기반 동작 원리를 이해하면 이런 문제를 쉽게 해결할 수 있습니다.

## @Transactional 동작 방식

@Transactional은 AOP 프록시로 동작합니다. 메서드 실행 전에 트랜잭션을 시작하고, 정상 완료 시 commit, 예외 발생 시 rollback 합니다.

```
클라이언트 요청
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                    Proxy 객체                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  TransactionInterceptor                            │ │
│  │  1. 트랜잭션 시작 (getTransaction)                  │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                               │
│                         ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Target 객체의 메서드 실행                          │ │
│  │  orderService.createOrder()                        │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                               │
│                 ┌───────┴───────┐                       │
│                 ▼               ▼                       │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  정상 완료        │  │  예외 발생        │            │
│  │  → commit()      │  │  → rollback()    │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### PlatformTransactionManager

Spring은 트랜잭션 추상화를 제공합니다. 어떤 데이터 접근 기술을 쓰든 같은 방식으로 트랜잭션을 관리합니다.

```java
public interface PlatformTransactionManager {
    TransactionStatus getTransaction(TransactionDefinition definition);
    void commit(TransactionStatus status);
    void rollback(TransactionStatus status);
}
```

JPA를 쓰면 JpaTransactionManager, JDBC를 쓰면 DataSourceTransactionManager가 사용됩니다. Spring Boot는 설정에 따라 자동으로 등록합니다.

### 프록시가 하는 일

간략화하면 이런 코드가 실행됩니다.

```java
// 프록시에서 실행되는 코드 (개념적)
public Object invoke(MethodInvocation invocation) throws Throwable {
    TransactionStatus status = transactionManager.getTransaction(definition);

    try {
        Object result = invocation.proceed();  // 실제 메서드 실행
        transactionManager.commit(status);
        return result;
    } catch (RuntimeException e) {
        transactionManager.rollback(status);
        throw e;
    }
}
```

## 트랜잭션 전파 옵션

하나의 트랜잭션 안에서 다른 @Transactional 메서드를 호출하면 어떻게 될까요? propagation 옵션이 결정합니다.

### REQUIRED (기본값)

기존 트랜잭션이 있으면 참여하고, 없으면 새로 시작합니다.

```java
@Transactional
public void outer() {
    inner();  // 같은 트랜잭션에 참여
}

@Transactional(propagation = Propagation.REQUIRED)  // 기본값
public void inner() {
    // outer()와 같은 트랜잭션
}
```

```
┌─────────────────────────────────────────┐
│           Transaction                    │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   outer()   │→ │   inner()   │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  inner에서 예외 → 전체 롤백              │
└─────────────────────────────────────────┘
```

### REQUIRES_NEW

항상 새 트랜잭션을 시작합니다. 기존 트랜잭션은 잠시 중단됩니다.

```java
@Transactional
public void outer() {
    inner();  // 별도 트랜잭션
    // inner가 롤백되어도 outer는 커밋 가능
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void inner() {
    // 독립된 새 트랜잭션
}
```

```
┌─────────────────────────────────────────────────────┐
│  Transaction 1 (outer)                              │
│  ┌─────────────┐                ┌─────────────┐    │
│  │   outer()   │ ─── 일시중단 ─→ │ 계속 실행    │    │
│  └──────┬──────┘                └─────────────┘    │
│         │                             ▲            │
│         ▼                             │            │
│    ┌─────────────────────────────────┐│            │
│    │  Transaction 2 (inner)          ││            │
│    │  ┌─────────────┐               ││            │
│    │  │   inner()   │ ──── 완료 ────┘│            │
│    │  └─────────────┘                │            │
│    │  독립적으로 커밋 또는 롤백       │            │
│    └─────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

### 실무에서 REQUIRES_NEW를 쓰는 경우

주문 생성 후 알림을 보내는 상황입니다.

```java
@Service
public class OrderService {

    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);

        // 알림 발송 실패해도 주문은 성공해야 함
        notificationService.sendNotification(order);
    }
}

@Service
public class NotificationService {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendNotification(Order order) {
        // 실패해도 주문 트랜잭션에 영향 없음
        notificationRepository.save(notification);
        emailSender.send(order.getUserEmail());
    }
}
```

알림 발송이 실패해도 주문 데이터는 커밋됩니다.

### NESTED

중첩 트랜잭션을 생성합니다. Savepoint를 사용해서 부분 롤백이 가능합니다.

```java
@Transactional
public void outer() {
    processA();

    try {
        inner();  // 중첩 트랜잭션
    } catch (Exception e) {
        // inner만 롤백, outer는 계속
    }

    processB();  // 실행됨
}

@Transactional(propagation = Propagation.NESTED)
public void inner() {
    // 예외 발생하면 savepoint까지만 롤백
}
```

REQUIRES_NEW와 다른 점은 같은 커넥션을 사용한다는 것입니다.

## 트랜잭션이 안 먹히는 경우

### 1. private 메서드

Spring AOP는 프록시 기반입니다. 프록시는 public 메서드만 가로챌 수 있습니다.

```java
@Service
public class OrderService {

    @Transactional  // 무시됨
    private void internalProcess(Order order) {
        orderRepository.save(order);
    }
}
```

### 2. self-invocation

같은 클래스 내부에서 호출하면 프록시를 거치지 않습니다.

```java
@Service
public class OrderService {

    public void createOrder(Order order) {
        process(order);  // 프록시를 거치지 않음
    }

    @Transactional  // 적용 안 됨!
    public void process(Order order) {
        orderRepository.save(order);
    }
}
```

해결 방법:

```java
// 방법 1: 별도 클래스로 분리 (권장)
@Service
public class OrderService {
    private final OrderProcessor processor;

    public void createOrder(Order order) {
        processor.process(order);  // 프록시를 거침
    }
}

@Service
public class OrderProcessor {
    @Transactional
    public void process(Order order) {
        orderRepository.save(order);
    }
}
```

### 3. Checked Exception

기본적으로 RuntimeException만 롤백합니다. Checked Exception은 롤백되지 않습니다.

```java
@Transactional
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException("파일 오류");  // 롤백 안 됨!
}
```

해결 방법:

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException("파일 오류");  // 롤백됨
}
```

### 4. 예외를 catch해서 삼킴

예외가 프록시까지 전파되지 않으면 롤백되지 않습니다.

```java
@Transactional
public void createOrder(Order order) {
    try {
        orderRepository.save(order);
        throw new RuntimeException("오류");
    } catch (Exception e) {
        log.error("에러 발생", e);
        // 예외를 삼킴 → 롤백 안 됨
    }
}
```

롤백하려면 예외를 다시 던지거나 수동으로 롤백해야 합니다.

```java
@Transactional
public void createOrder(Order order) {
    try {
        orderRepository.save(order);
        throw new RuntimeException("오류");
    } catch (Exception e) {
        log.error("에러 발생", e);
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```

## 실무 예제: 트랜잭션 분리

### 문제 상황

이벤트 로그를 저장하면서 메인 로직 실패에 영향받지 않게 하고 싶습니다.

```java
@Service
public class OrderService {

    @Transactional
    public void createOrder(Order order) {
        eventLogService.log("주문 시작", order);  // 로그는 항상 저장되어야 함

        orderRepository.save(order);

        if (order.getAmount() > 1000000) {
            throw new RuntimeException("금액 초과");  // 여기서 실패하면 로그도 롤백됨
        }

        eventLogService.log("주문 완료", order);
    }
}
```

### 해결: REQUIRES_NEW 적용

```java
@Service
public class EventLogService {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String message, Object data) {
        EventLog log = new EventLog(message, data, LocalDateTime.now());
        eventLogRepository.save(log);
    }
}
```

이제 메인 트랜잭션이 롤백되어도 이벤트 로그는 저장됩니다.

### 이벤트 기반 분리

더 깔끔한 방법은 이벤트를 사용하는 것입니다.

```java
@Service
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);

        eventPublisher.publishEvent(new OrderCreatedEvent(order));
    }
}

@Component
public class OrderEventHandler {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 주문 트랜잭션 커밋 후 실행
        notificationService.send(event.getOrder());
    }
}
```

`@TransactionalEventListener`는 트랜잭션 커밋 후에 실행되므로 주문이 성공했을 때만 알림이 발송됩니다.

## @Transactional 옵션 정리

### readOnly

읽기 전용 트랜잭션을 표시합니다. 데이터 변경을 방지하고 성능 최적화에 도움이 됩니다.

```java
@Transactional(readOnly = true)
public List<Order> findOrders(Long userId) {
    return orderRepository.findByUserId(userId);
}
```

JPA의 경우 flush를 생략하고 스냅샷을 만들지 않아 성능이 좋아집니다.

### timeout

트랜잭션 타임아웃을 설정합니다. 초 단위입니다.

```java
@Transactional(timeout = 10)  // 10초
public void longProcess() {
    // 10초 넘으면 롤백
}
```

### isolation

격리 수준을 설정합니다. 기본값은 데이터베이스 기본 설정을 따릅니다.

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void process() {
    // READ_COMMITTED 격리 수준으로 실행
}
```

## 정리: @Transactional 체크리스트

트랜잭션 문제를 겪으면 다음을 확인하세요.

- public 메서드에 붙였는가?
- 같은 클래스 내부 호출이 아닌가?
- checked exception을 던지고 있지 않은가?
- 예외를 catch해서 삼키고 있지 않은가?
- 외부 API 호출을 트랜잭션 안에서 하고 있지 않은가?

실무 권장 사항입니다.

- 조회 메서드에는 `readOnly = true`를 붙이세요
- 트랜잭션 범위는 최소화하세요 (외부 API 호출은 밖에서)
- REQUIRES_NEW는 정말 필요한 경우만 사용하세요 (커넥션 2개 사용)

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- @Transactional은 AOP 프록시로 동작합니다
- 전파 옵션으로 트랜잭션 간 관계를 설정합니다
- private 메서드, self-invocation, checked exception에 주의하세요
- 트랜잭션 범위는 최소화하고 readOnly를 활용하세요
