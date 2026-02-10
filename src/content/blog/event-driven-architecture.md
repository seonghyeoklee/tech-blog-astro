---
title: '이벤트 기반 아키텍처 - 서비스 간 결합을 끊는 방법'
description: '직접 호출의 문제점부터 이벤트 패턴 3가지, Spring 이벤트 시스템, 메시지 브로커 도입 시점까지 정리했습니다'
pubDate: 'Feb 09 2025'
tags: ['Architecture', 'Spring']
series: 'tech-tradeoffs'
seriesOrder: 5
quiz:
  - question: '이벤트 기반 아키텍처의 가장 큰 장점은?'
    options:
      - '성능이 항상 좋아진다'
      - '발행자와 구독자 간 결합도를 낮춘다'
      - '트랜잭션 관리가 필요 없어진다'
      - '코드량이 줄어든다'
    correctAnswer: 1
    explanation: '이벤트 기반 아키텍처의 핵심은 발행자가 구독자를 몰라도 된다는 점입니다. 새로운 기능을 추가할 때 기존 코드를 수정하지 않아도 됩니다.'

  - question: 'Event Notification과 Event-Carried State Transfer의 차이는?'
    options:
      - 'Notification은 동기, State Transfer는 비동기'
      - 'Notification은 최소 정보만, State Transfer는 필요한 데이터를 모두 포함'
      - 'Notification은 Kafka용, State Transfer는 RabbitMQ용'
      - '차이가 없다'
    correctAnswer: 1
    explanation: 'Event Notification은 "무슨 일이 일어났다"만 알리고 수신자가 필요한 데이터를 조회합니다. Event-Carried State Transfer는 이벤트에 필요한 데이터를 모두 담아 추가 조회를 없앱니다.'

  - question: '@TransactionalEventListener의 기본 동작 시점은?'
    options:
      - '메서드 호출 즉시'
      - '트랜잭션 시작 시'
      - '트랜잭션 커밋 후'
      - '트랜잭션 롤백 후'
    correctAnswer: 2
    explanation: '@TransactionalEventListener는 기본적으로 AFTER_COMMIT 시점에 실행됩니다. 트랜잭션이 성공적으로 커밋된 후에만 이벤트를 처리하므로, 부가 작업이 핵심 로직에 영향을 주지 않습니다.'

  - question: 'Spring ApplicationEvent가 메시지 브로커와 다른 점은?'
    options:
      - 'Spring 이벤트가 더 빠르다'
      - 'Spring 이벤트는 같은 JVM 내에서만 동작한다'
      - 'Spring 이벤트는 비동기만 지원한다'
      - 'Spring 이벤트는 영속성을 보장한다'
    correctAnswer: 1
    explanation: 'Spring ApplicationEvent는 같은 JVM 프로세스 내에서만 동작합니다. 서버가 재시작되면 처리 중이던 이벤트가 유실됩니다. 서비스 간 통신이나 이벤트 유실 방지가 필요하면 메시지 브로커를 도입해야 합니다.'

  - question: '이벤트 기반 시스템에서 멱등성이 필요한 이유는?'
    options:
      - '성능 최적화를 위해'
      - '같은 이벤트가 중복 전달될 수 있기 때문에'
      - '이벤트 순서를 보장하기 위해'
      - '코드 가독성을 위해'
    correctAnswer: 1
    explanation: '네트워크 장애, 재시도, 메시지 브로커의 at-least-once 전달 등으로 같은 이벤트가 여러 번 도착할 수 있습니다. 멱등성을 보장하지 않으면 중복 처리(이중 결제, 이중 알림 등)가 발생합니다.'
---

주문이 완료되면 재고를 차감하고, 알림을 보내고, 포인트를 적립해야 합니다. 처음에는 OrderService에서 직접 호출합니다. 그런데 기능이 추가될 때마다 OrderService가 비대해지고, 알림 서비스 장애가 주문까지 실패시킵니다.

이벤트 기반 아키텍처는 이 문제를 해결합니다. "주문이 완료됐다"는 사실만 알리고, 나머지는 각자 알아서 처리하게 하는 것입니다.

## 직접 호출의 문제

주문 완료 후 여러 후속 작업을 처리하는 코드입니다.

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final StockService stockService;
    private final NotificationService notificationService;
    private final PointService pointService;
    private final CouponService couponService;

    @Transactional
    public void completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.complete();

        // 후속 작업들이 모두 직접 연결되어 있음
        stockService.decrease(order.getItems());       // 재고 차감
        notificationService.send(order.getUserId());   // 알림 발송
        pointService.accumulate(order.getUserId(), order.getAmount()); // 포인트 적립
        couponService.markUsed(order.getCouponId());   // 쿠폰 사용 처리
    }
}
```

동작은 합니다. 하지만 문제가 쌓입니다.

**1. 강한 결합**

OrderService가 4개 서비스에 직접 의존합니다. 쿠폰 서비스의 인터페이스가 바뀌면 OrderService도 수정해야 합니다. 리뷰 작성 요청, 통계 집계 같은 기능이 추가될 때마다 OrderService에 코드를 넣어야 합니다.

**2. 장애 전파**

NotificationService에서 외부 API 호출이 실패하면 어떻게 될까요? 트랜잭션 전체가 롤백됩니다. 알림 발송 실패가 주문 완료까지 실패시키는 것입니다.

**3. 성능 저하**

모든 작업이 동기로 순차 실행됩니다. 각 서비스 호출이 100ms씩 걸린다면 총 400ms 이상이 됩니다. 후속 작업이 늘어날수록 응답 시간도 길어집니다.

```
completeOrder() 호출
├── order.complete()          50ms
├── stockService.decrease()   100ms
├── notificationService.send() 200ms  ← 외부 API, 느림
├── pointService.accumulate()  80ms
└── couponService.markUsed()   50ms
                              ─────
                        총 약 480ms (모두 동기)
```

## 이벤트 기반 아키텍처란

핵심은 **"이것을 해라"가 아니라 "이런 일이 일어났다"로 바꾸는 것**입니다.

직접 호출은 명령입니다. "재고를 차감해라", "알림을 보내라". 발신자가 수신자를 알아야 하고, 수신자의 인터페이스에 맞춰야 합니다.

이벤트는 사실의 통보입니다. "주문이 완료됐다". 누가 이 사실에 관심이 있는지는 발신자가 알 필요 없습니다.

### 직접 호출 방식

```
┌──────────────┐     ┌──────────────┐
│              │────→│ StockService │
│              │     └──────────────┘
│              │     ┌──────────────────────┐
│ OrderService │────→│ NotificationService  │
│              │     └──────────────────────┘
│              │     ┌──────────────┐
│              │────→│ PointService │
│              │     └──────────────┘
└──────────────┘
  모든 서비스를 직접 알아야 함
```

### 이벤트 방식

```
                         ┌──────────────┐
                    ┌───→│ StockService │
┌──────────────┐    │    └──────────────┘
│              │    │    ┌──────────────────────┐
│ OrderService │──→[E]──→│ NotificationService  │
│              │    │    └──────────────────────┘
└──────────────┘    │    ┌──────────────┐
  이벤트만 발행      └───→│ PointService │
                         └──────────────┘
                [E] = OrderCompletedEvent
```

| 항목 | 직접 호출 | 이벤트 방식 |
|------|----------|------------|
| 결합도 | 높음 (서비스를 직접 참조) | 낮음 (이벤트만 공유) |
| 새 기능 추가 | 기존 코드 수정 필요 | 구독자만 추가 |
| 장애 전파 | 하나 실패 → 전체 실패 | 발행자에 영향 없음 |
| 흐름 추적 | 쉬움 (코드 따라가면 됨) | 어려움 (이벤트 흐름 추적 필요) |
| 트랜잭션 | 하나의 트랜잭션 | 각자 별도 트랜잭션 |

## 이벤트 패턴 3가지

Martin Fowler는 이벤트를 사용하는 패턴을 세 가지로 구분했습니다. 각 패턴은 이벤트에 담는 정보의 양이 다릅니다.

### 1. Event Notification

가장 단순한 형태입니다. **"무슨 일이 일어났다"만 알리고, 최소한의 정보만 담습니다.**

```java
// 이벤트 — ID만 포함
public record OrderCompletedEvent(Long orderId) {}

// 발행자
@Service
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow();
        order.complete();

        // "주문이 완료됐다"는 사실만 알림
        eventPublisher.publishEvent(new OrderCompletedEvent(orderId));
    }
}

// 구독자 — 필요한 데이터를 직접 조회
@Component
public class PointAccumulateListener {

    private final OrderRepository orderRepository;
    private final PointService pointService;

    @EventListener
    public void handle(OrderCompletedEvent event) {
        // 이벤트에 금액 정보가 없으니 직접 조회
        Order order = orderRepository.findById(event.orderId())
            .orElseThrow();
        pointService.accumulate(order.getUserId(), order.getAmount());
    }
}
```

이벤트가 가볍고 발행자가 단순해집니다. 대신 구독자가 데이터를 조회해야 하므로 발행자 서비스에 대한 의존이 생깁니다.

### 2. Event-Carried State Transfer

**이벤트에 필요한 데이터를 모두 담습니다.** 구독자가 추가 조회 없이 바로 처리할 수 있습니다.

```java
// 이벤트 — 처리에 필요한 데이터를 모두 포함
public record OrderCompletedEvent(
    Long orderId,
    Long userId,
    BigDecimal totalAmount,
    List<OrderItemInfo> items,
    Long couponId,
    LocalDateTime completedAt
) {}

// 발행자
@Service
public class OrderService {

    @Transactional
    public void completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow();
        order.complete();

        // 구독자가 필요로 하는 데이터를 모두 담아 발행
        eventPublisher.publishEvent(new OrderCompletedEvent(
            order.getId(),
            order.getUserId(),
            order.getTotalAmount(),
            order.getItemInfos(),
            order.getCouponId(),
            LocalDateTime.now()
        ));
    }
}

// 구독자 — 추가 조회 없이 바로 처리
@Component
public class PointAccumulateListener {

    private final PointService pointService;

    @EventListener
    public void handle(OrderCompletedEvent event) {
        // 이벤트에 모든 정보가 있으므로 바로 처리
        pointService.accumulate(event.userId(), event.totalAmount());
    }
}
```

구독자가 발행자 서비스를 조회할 필요가 없습니다. 서비스 간 결합이 완전히 끊어집니다. 다만 이벤트가 커지고, 구독자마다 필요한 데이터가 다르면 이벤트에 온갖 필드가 추가될 수 있습니다.

### 3. Event Sourcing

**상태를 저장하는 대신 이벤트의 시퀀스를 저장합니다.** 현재 상태는 이벤트를 처음부터 재생한 결과입니다.

```java
// 이벤트들
public sealed interface OrderEvent {
    Long orderId();
    LocalDateTime occurredAt();
}

public record OrderCreated(Long orderId, Long userId,
    List<OrderItem> items, LocalDateTime occurredAt) implements OrderEvent {}

public record OrderPaid(Long orderId, BigDecimal amount,
    String paymentMethod, LocalDateTime occurredAt) implements OrderEvent {}

public record OrderShipped(Long orderId, String trackingNumber,
    LocalDateTime occurredAt) implements OrderEvent {}

public record OrderCancelled(Long orderId, String reason,
    LocalDateTime occurredAt) implements OrderEvent {}

// 이벤트 스토어
@Repository
public class OrderEventStore {

    private final JdbcTemplate jdbcTemplate;

    public void append(OrderEvent event) {
        jdbcTemplate.update(
            "INSERT INTO order_events (order_id, event_type, payload, occurred_at) VALUES (?, ?, ?, ?)",
            event.orderId(),
            event.getClass().getSimpleName(),
            toJson(event),
            event.occurredAt()
        );
    }

    public List<OrderEvent> getEvents(Long orderId) {
        return jdbcTemplate.query(
            "SELECT * FROM order_events WHERE order_id = ? ORDER BY occurred_at",
            orderId
        ).stream().map(this::toEvent).toList();
    }
}

// 현재 상태 = 이벤트 재생
public class Order {

    private Long id;
    private OrderStatus status;
    private BigDecimal paidAmount;

    public static Order replay(List<OrderEvent> events) {
        Order order = new Order();
        for (OrderEvent event : events) {
            order.apply(event);
        }
        return order;
    }

    private void apply(OrderEvent event) {
        switch (event) {
            case OrderCreated e -> {
                this.id = e.orderId();
                this.status = OrderStatus.CREATED;
            }
            case OrderPaid e -> {
                this.paidAmount = e.amount();
                this.status = OrderStatus.PAID;
            }
            case OrderShipped e -> this.status = OrderStatus.SHIPPED;
            case OrderCancelled e -> this.status = OrderStatus.CANCELLED;
        }
    }
}
```

모든 변경 이력이 남습니다. "왜 이 주문이 취소됐는가?"를 추적하기 쉽습니다. 반면 구현 복잡도가 높고, 이벤트가 쌓이면 상태 복원이 느려질 수 있습니다(Snapshot으로 해결).

### 패턴별 비교

| 항목 | Event Notification | Event-Carried State Transfer | Event Sourcing |
|------|-------------------|----------------------------|----------------|
| 이벤트 크기 | 작음 (ID 정도) | 큼 (필요한 데이터 전부) | 중간 (변경 사실) |
| 구독자의 추가 조회 | 필요 | 불필요 | 불필요 |
| 서비스 간 결합도 | 중간 | 낮음 | 낮음 |
| 구현 복잡도 | 낮음 | 낮음 | 높음 |
| 이력 추적 | 불가 | 불가 | 완전한 이력 |
| 적합한 상황 | 내부 모듈 간 알림 | 서비스 간 데이터 전달 | 감사 로그, 금융 도메인 |

대부분의 프로젝트에서는 Event Notification이나 Event-Carried State Transfer를 선택합니다. Event Sourcing은 이력 추적이 핵심인 도메인(금융, 물류)에서 가치가 있습니다.

## Spring 이벤트 시스템

Spring은 `ApplicationEventPublisher`를 통해 같은 JVM 내에서 이벤트를 발행하고 수신할 수 있습니다.

### 기본 사용법

```java
// 이벤트 정의
public record OrderCompletedEvent(Long orderId, Long userId, BigDecimal amount) {}

// 발행
@Service
@RequiredArgsConstructor
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.complete();

        eventPublisher.publishEvent(
            new OrderCompletedEvent(order.getId(), order.getUserId(), order.getTotalAmount())
        );
    }
}
```

### @EventListener — 동기 처리

```java
@Component
public class StockDecreaseListener {

    @EventListener
    public void handle(OrderCompletedEvent event) {
        // 발행자와 같은 스레드, 같은 트랜잭션에서 실행
        stockService.decrease(event.orderId());
    }
}
```

`@EventListener`는 동기로 동작합니다. 발행 시점에 바로 실행되고, 같은 트랜잭션에 참여합니다. 리스너에서 예외가 발생하면 발행자의 트랜잭션도 롤백됩니다.

### @TransactionalEventListener — 트랜잭션 커밋 후 처리

```java
@Component
public class NotificationListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCompletedEvent event) {
        // 트랜잭션이 성공적으로 커밋된 후에만 실행
        // 실패해도 주문 트랜잭션에 영향 없음
        notificationService.send(event.userId());
    }
}
```

트랜잭션 커밋 후 실행되므로 부가 작업이 핵심 로직에 영향을 주지 않습니다. `@TransactionalEventListener`의 동작 원리와 주의사항은 [Spring 트랜잭션 메커니즘](/blog/spring-transaction-mechanism) 글에서 다뤘습니다.

### @Async + @EventListener — 비동기 처리

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("event-");
        executor.initialize();
        return executor;
    }
}

@Component
public class PointAccumulateListener {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCompletedEvent event) {
        // 별도 스레드에서 실행, 별도 트랜잭션
        pointService.accumulate(event.userId(), event.amount());
    }
}
```

`@Async`를 추가하면 별도 스레드에서 실행됩니다. 발행자는 이벤트를 발행한 즉시 반환하고, 리스너는 백그라운드에서 처리합니다.

### 동기 vs 비동기 이벤트

| 항목 | @EventListener | @TransactionalEventListener | @Async + @TransactionalEventListener |
|------|---------------|---------------------------|--------------------------------------|
| 실행 시점 | 즉시 | 트랜잭션 커밋 후 | 트랜잭션 커밋 후 (별도 스레드) |
| 트랜잭션 | 발행자와 동일 | 발행자 트랜잭션 밖 | 별도 트랜잭션 |
| 실패 시 영향 | 발행자 롤백 | 발행자에 영향 없음 | 발행자에 영향 없음 |
| 응답 시간 | 느려짐 | 느려짐 | 영향 없음 |
| 적합한 작업 | 같은 트랜잭션이 필요한 작업 | 부가 작업 (알림, 로그) | 오래 걸리는 부가 작업 |

주의할 점이 있습니다. **Spring ApplicationEvent는 같은 JVM 내에서만 동작합니다.** 서버가 2대 이상이어도 이벤트는 발행된 서버에서만 처리됩니다. 서버가 재시작되면 처리 중이던 이벤트는 유실됩니다.

## 메시지 브로커가 필요한 시점

Spring 이벤트만으로 충분한 경우도 많습니다. 하지만 한계가 분명합니다.

```
Spring ApplicationEvent의 한계
├── 같은 JVM 내에서만 동작 (서비스 간 통신 불가)
├── 서버 재시작 시 이벤트 유실
├── 재시도/실패 처리를 직접 구현해야 함
└── 이벤트 순서 보장이 안 됨
```

다음 상황이 하나라도 해당되면 메시지 브로커 도입을 고려해야 합니다.

- **서비스가 별도 프로세스로 분리됨** — MSA로 전환했거나 예정인 경우
- **이벤트 유실이 허용되지 않음** — 결제, 포인트 등 중요한 처리
- **대량의 이벤트를 처리해야 함** — 초당 수천 건 이상
- **이벤트 재처리가 필요함** — 장애 복구, 데이터 재동기화

### Kafka vs RabbitMQ

| 항목 | Kafka | RabbitMQ |
|------|-------|----------|
| 모델 | 로그 기반 (이벤트 저장) | 큐 기반 (메시지 소비 후 삭제) |
| 처리량 | 매우 높음 (수십만 TPS) | 높음 (수만 TPS) |
| 이벤트 보관 | 설정 기간 동안 보관 | 소비하면 삭제 |
| 순서 보장 | 파티션 내 보장 | 큐 내 보장 |
| 재처리 | offset 조정으로 가능 | 불가 (DLQ로 우회) |
| 적합한 경우 | 이벤트 스트리밍, 대용량 | 작업 큐, 요청-응답 |

Kafka와 RabbitMQ의 상세 비교는 다음 글에서 다루겠습니다.

### 진화 과정

시스템이 복잡해질수록 이벤트 처리 방식도 발전합니다.

```
1단계: 직접 호출
OrderService → StockService, NotificationService ...
└── 단순하지만 결합도 높음

        ↓ 후속 작업이 늘어나고 장애 전파가 문제될 때

2단계: Spring 이벤트 (같은 JVM)
OrderService → ApplicationEvent → Listeners
└── 결합도 해소, 단일 서버에서 충분

        ↓ MSA 전환 또는 이벤트 유실이 허용되지 않을 때

3단계: 메시지 브로커 (Kafka, RabbitMQ)
OrderService → Kafka → Consumer Services
└── 서비스 간 통신, 이벤트 영속성, 재처리 가능
```

[Spring 트랜잭션 메커니즘](/blog/spring-transaction-mechanism) 글에서 다뤘던 **Outbox Pattern**은 2단계에서 3단계로 넘어갈 때 트랜잭션과 메시지 발행의 원자성을 보장하는 방법입니다. 서비스가 더 분리되면 [모놀리식 vs MSA](/blog/monolithic-vs-msa) 글에서 다뤘던 **SAGA 패턴**으로 분산 트랜잭션을 처리하게 됩니다.

## 이벤트 도입 시 주의할 점

이벤트 기반으로 바꾸면 결합도는 낮아지지만, 새로운 문제가 생깁니다.

### 최종 일관성 (Eventual Consistency)

직접 호출에서는 하나의 트랜잭션으로 즉시 일관성을 보장했습니다. 이벤트 방식에서는 각 구독자가 별도 트랜잭션으로 처리하므로 **일시적으로 데이터가 불일치할 수 있습니다.**

```java
// 주문 완료 후 포인트가 바로 반영되지 않을 수 있음
orderService.completeOrder(orderId);  // 주문 완료 (트랜잭션 1)

// 이벤트가 아직 처리되기 전
pointService.getPoints(userId);  // 포인트가 아직 이전 값일 수 있음
```

사용자에게 "포인트가 곧 적립됩니다"라고 안내하거나, 조회 시 보정 처리를 하는 등의 대응이 필요합니다.

### 멱등성

네트워크 장애나 재시도로 같은 이벤트가 여러 번 도착할 수 있습니다. 구독자는 같은 이벤트를 두 번 받아도 결과가 같아야 합니다.

```java
@Component
public class PointAccumulateListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCompletedEvent event) {
        // 이미 처리한 이벤트인지 확인
        if (pointHistoryRepository.existsByOrderId(event.orderId())) {
            return;  // 중복 처리 방지
        }

        pointService.accumulate(event.userId(), event.amount());
        pointHistoryRepository.save(
            new PointHistory(event.orderId(), event.amount())
        );
    }
}
```

### 이벤트 순서

이벤트 A, B가 순서대로 발행되었더라도 비동기 처리에서는 B가 먼저 도착할 수 있습니다. 순서가 중요한 경우 이벤트에 시퀀스 번호를 포함하거나, Kafka의 파티션 키를 활용합니다.

```java
// 같은 주문의 이벤트는 같은 파티션으로 → 순서 보장
kafkaTemplate.send("order-events",
    String.valueOf(order.getId()),  // 파티션 키 = orderId
    event
);
```

### 디버깅과 추적

직접 호출은 스택 트레이스를 따라가면 됩니다. 이벤트 방식은 발행자와 구독자가 분리되어 있어 흐름을 추적하기 어렵습니다.

**Correlation ID**를 사용하면 하나의 요청에서 파생된 모든 이벤트를 추적할 수 있습니다.

```java
public record OrderCompletedEvent(
    Long orderId,
    Long userId,
    BigDecimal amount,
    String correlationId  // 요청 추적용 ID
) {}

// 발행 시
String correlationId = UUID.randomUUID().toString();
MDC.put("correlationId", correlationId);

eventPublisher.publishEvent(
    new OrderCompletedEvent(orderId, userId, amount, correlationId)
);

// 구독자에서
@EventListener
public void handle(OrderCompletedEvent event) {
    MDC.put("correlationId", event.correlationId());
    log.info("포인트 적립 처리 - orderId: {}", event.orderId());
    // 로그에 같은 correlationId가 남으므로 추적 가능
}
```

### 과도한 이벤트화

모든 것을 이벤트로 만들 필요는 없습니다. 강한 일관성이 필요하거나, 호출 관계가 1:1이고 변경 가능성이 낮다면 직접 호출이 나을 수 있습니다. 이벤트는 도구이지 목적이 아닙니다.

## 판단 기준

### 이벤트 도입이 적합한 경우

- 하나의 액션에 여러 후속 작업이 따라옴
- 후속 작업이 계속 추가될 가능성이 있음
- 후속 작업의 실패가 핵심 작업에 영향을 주면 안 됨
- 서비스 간 결합도를 낮추고 싶음
- 비동기 처리로 응답 시간을 줄이고 싶음

### 직접 호출이 나은 경우

- 호출 관계가 1:1이고 변경 가능성이 낮음
- 즉시 일관성이 반드시 필요함 (재고 차감 후 바로 확인)
- 작업 간 순서와 결과가 보장되어야 함
- 시스템 복잡도를 높이고 싶지 않음

### 체크리스트

| 질문 | 예 → 이벤트 고려 | 아니오 → 직접 호출 유지 |
|------|-----------------|----------------------|
| 후속 작업이 3개 이상인가? | 결합도 문제가 커짐 | 직접 호출로 충분 |
| 후속 작업이 앞으로 늘어날 가능성이 있는가? | OCP 위반 | 확정적이면 직접 호출 |
| 후속 작업 실패가 핵심 작업에 영향을 주면 안 되는가? | 장애 격리 필요 | 하나의 트랜잭션으로 처리 |
| 후속 작업을 비동기로 처리해도 되는가? | 응답 시간 개선 가능 | 동기 처리 필요 |
| 여러 서비스(프로세스)가 관심을 가지는가? | 메시지 브로커까지 고려 | Spring 이벤트로 충분 |

## 정리

- **직접 호출**은 단순하지만 결합도, 장애 전파, 성능 문제를 만듭니다
- **이벤트 기반 아키텍처**는 "무슨 일이 일어났다"를 알리는 방식으로 서비스 간 결합을 끊습니다
- **이벤트 패턴 3가지**: Event Notification(최소 정보), Event-Carried State Transfer(데이터 포함), Event Sourcing(이벤트로 상태 관리)
- **Spring 이벤트**: `@EventListener`(동기), `@TransactionalEventListener`(커밋 후), `@Async`(비동기)로 같은 JVM 내 이벤트 처리
- **메시지 브로커**: 서비스 분리, 이벤트 유실 방지, 대량 처리가 필요하면 Kafka/RabbitMQ 도입
- **트레이드오프**: 최종 일관성, 멱등성, 순서 보장, 디버깅 어려움을 감수해야 합니다
- **모든 것을 이벤트로 만들 필요는 없습니다.** 1:1 관계이고 일관성이 중요하면 직접 호출이 나을 수 있습니다

다음 글에서는 메시지 브로커 선택 기준을 다루겠습니다. Kafka와 RabbitMQ, 언제 무엇을 선택해야 하는지 비교합니다.
