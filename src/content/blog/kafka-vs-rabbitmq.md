---
title: 'Kafka vs RabbitMQ - 메시지 브로커, 어떻게 선택할까'
description: '설계 철학부터 아키텍처 심화, Spring Boot 코드, 신뢰성 패턴, 실무 선택 기준까지 정리했습니다'
pubDate: 'Feb 16 2025'
tags: ['Architecture', 'Spring']
series: 'tech-tradeoffs'
seriesOrder: 6
quiz:
  - question: 'Kafka에서 같은 주문 ID의 이벤트 순서를 보장하려면?'
    options:
      - '토픽을 하나만 사용한다'
      - '파티션 키를 주문 ID로 설정한다'
      - 'Consumer를 1개만 띄운다'
      - 'acks=all로 설정한다'
    correctAnswer: 1
    explanation: 'Kafka는 파티션 내에서만 순서를 보장합니다. 같은 파티션 키를 가진 메시지는 항상 같은 파티션으로 들어가므로, 주문 ID를 파티션 키로 사용하면 해당 주문의 이벤트 순서가 보장됩니다.'

  - question: 'RabbitMQ에서 주문 생성 이벤트는 재고 서비스와 알림 서비스 모두에 전달해야 합니다. 어떤 Exchange 타입이 적합할까요?'
    options:
      - 'Direct Exchange'
      - 'Topic Exchange'
      - 'Fanout Exchange'
      - 'Headers Exchange'
    correctAnswer: 2
    explanation: 'Fanout Exchange는 바인딩된 모든 큐에 메시지를 복사합니다. 같은 이벤트를 여러 서비스에 동시 전달할 때 적합합니다. Topic Exchange도 가능하지만 라우팅 키 패턴이 필요 없는 단순 브로드캐스트에는 Fanout이 직관적입니다.'

  - question: 'Kafka의 acks=1과 acks=all의 차이는?'
    options:
      - 'acks=1은 Consumer 확인, acks=all은 Broker 확인'
      - 'acks=1은 Leader만 확인, acks=all은 모든 ISR 복제본 확인'
      - 'acks=1은 동기, acks=all은 비동기'
      - '성능 차이가 없다'
    correctAnswer: 1
    explanation: 'acks=1은 Leader Broker가 메시지를 받으면 바로 응답합니다. Leader 장애 시 메시지가 유실될 수 있습니다. acks=all은 모든 ISR(In-Sync Replica)에 복제가 완료된 후 응답하므로 유실 가능성이 낮지만 지연이 늘어납니다.'

  - question: 'Kafka에서 Consumer가 메시지를 처리하다 실패한 후 재시작하면?'
    options:
      - '메시지가 사라진다'
      - '마지막으로 커밋된 offset부터 다시 읽는다'
      - '처음부터 모든 메시지를 다시 읽는다'
      - 'Broker가 실패한 메시지만 재전송한다'
    correctAnswer: 1
    explanation: 'Kafka Consumer는 offset으로 읽은 위치를 관리합니다. 재시작 시 마지막으로 커밋된 offset 이후부터 다시 읽습니다. 그래서 커밋 전에 실패하면 같은 메시지를 다시 받게 되고, 멱등성 처리가 필요합니다.'

  - question: '다음 중 RabbitMQ가 Kafka보다 적합한 시나리오는?'
    options:
      - '초당 10만 건의 로그 수집'
      - '이벤트 리플레이가 필요한 감사 시스템'
      - '요청-응답 패턴의 작업 큐'
      - '여러 Consumer Group이 같은 데이터를 읽어야 하는 경우'
    correctAnswer: 2
    explanation: 'RabbitMQ는 메시지별 라우팅, 우선순위 큐, 요청-응답 패턴에 강합니다. Kafka는 대용량 스트리밍, 이벤트 리플레이, 다수 Consumer Group 시나리오에 적합합니다.'
---

[이전 글](/blog/event-driven-architecture)에서 이벤트 기반 아키텍처를 다루면서, 메시지 브로커 선택에 대해서는 다음 글로 미뤘습니다. 이번 글에서 그 약속을 이행합니다.

"그냥 Kafka 쓰면 되지 않나요?" 이런 질문을 종종 받습니다. 반대로 "우리 시스템에 Kafka는 과한데..."라는 이야기도 있습니다. 둘 다 맞는 말입니다. 문제는 **"언제, 왜"** 하나를 선택해야 하는지 모르면 과하거나 부족한 선택을 하게 된다는 것입니다.

## 근본적인 차이: 설계 철학

Kafka와 RabbitMQ는 같은 문제를 풀지 않습니다. 설계 출발점이 다릅니다.

### Kafka — 분산 커밋 로그

Kafka는 **이벤트 저장소**입니다. 메시지를 소비해도 삭제하지 않습니다. 디스크에 순서대로 기록하고, Consumer가 offset을 이동하며 읽습니다.

```
Producer                        Kafka Cluster
   │                    ┌─────────────────────────────┐
   │    write           │  Topic: order-events        │
   ├───────────────────→│                             │
   │                    │  Partition 0: [0][1][2][3]──→│  Consumer Group A
   │                    │  Partition 1: [0][1][2]────→│  (주문 서비스)
   │                    │  Partition 2: [0][1][2][3]──→│
   │                    │                             │
   │                    │  같은 데이터를 다시 읽을 수   │  Consumer Group B
   │                    │  있음 (offset 이동)         │  (분석 서비스)
   │                    └─────────────────────────────┘
```

**Dumb Broker, Smart Consumer** — Broker는 메시지를 저장만 하고, 누가 어디까지 읽었는지는 Consumer가 관리합니다.

### RabbitMQ — 메시지 라우터

RabbitMQ는 **메시지 배달부**입니다. Exchange가 라우팅 규칙에 따라 적절한 Queue로 메시지를 배달하고, Consumer가 소비하면 Queue에서 삭제합니다.

```
Producer                        RabbitMQ
   │                    ┌───────────────────────────────────┐
   │    publish         │                                   │
   ├───────────────────→│  Exchange ─── Binding ──→ Queue 1 │──→ Consumer A
   │                    │     │                             │    (재고 서비스)
   │                    │     └─── Binding ──→ Queue 2      │──→ Consumer B
   │                    │                                   │    (알림 서비스)
   │                    │  소비 후 Queue에서 삭제             │
   │                    └───────────────────────────────────┘
```

**Smart Broker, Dumb Consumer** — Broker가 라우팅, 우선순위, 재전송까지 관리합니다. Consumer는 받은 메시지를 처리만 하면 됩니다.

### 설계 철학 비교

| 항목 | Kafka | RabbitMQ |
|------|-------|----------|
| 핵심 개념 | 분산 커밋 로그 | AMQP 메시지 브로커 |
| 데이터 모델 | 이벤트 스트림 (append-only) | 메시지 큐 (소비 후 삭제) |
| Broker 역할 | 저장만 (dumb broker) | 라우팅 + 전달 관리 (smart broker) |
| Consumer 역할 | offset 관리 (smart consumer) | ACK만 보냄 (dumb consumer) |
| 비유 | 신문사 (발행된 신문은 보관) | 우체국 (배달하면 끝) |

## Kafka 아키텍처 심화

[이전 글](/blog/event-driven-architecture)에서 기본적인 비교를 다뤘으니, 여기서는 각각의 내부 구조를 파고들겠습니다.

### Topic과 Partition

Kafka의 Topic은 논리적인 메시지 채널입니다. Topic은 여러 Partition으로 나뉘고, 각 Partition은 순서가 보장되는 append-only 로그입니다.

```
Topic: order-events (3 Partitions)

Partition 0: [msg0] [msg1] [msg2] [msg3] [msg4] ──→
Partition 1: [msg0] [msg1] [msg2] ──→
Partition 2: [msg0] [msg1] [msg2] [msg3] ──→

                     ↑
            파티션 내에서만 순서 보장
```

**파티션 키가 핵심입니다.** 같은 키를 가진 메시지는 항상 같은 Partition으로 들어갑니다.

```java
// 주문 ID를 파티션 키로 — 같은 주문의 이벤트는 순서 보장
kafkaTemplate.send("order-events", String.valueOf(orderId), event);
```

주문 ID `1001`의 생성, 결제, 배송 이벤트가 항상 같은 Partition에 들어가므로 순서가 보장됩니다. 반면 주문 `1001`과 `1002`는 다른 Partition에 있을 수 있어 서로 간의 순서는 보장되지 않습니다.

### Consumer Group과 Offset

Consumer Group은 **같은 Topic을 협력해서 소비하는 Consumer들의 묶음**입니다.

```
Topic: order-events (4 Partitions)

                    Consumer Group: order-processor
Partition 0 ──────→ Consumer A
Partition 1 ──────→ Consumer A
Partition 2 ──────→ Consumer B
Partition 3 ──────→ Consumer C

규칙: 하나의 Partition은 Group 내 하나의 Consumer만 소비
```

Consumer가 Group 내에서 추가되거나 제거되면 **리밸런싱**이 일어납니다. Partition이 Consumer들에게 재할당됩니다. 이 과정에서 일시적으로 소비가 중단됩니다.

**Offset**은 Consumer가 어디까지 읽었는지 기록하는 위치값입니다.

```
Partition 0: [0] [1] [2] [3] [4] [5] [6]
                          ↑           ↑
                    committed      current
                     offset        position

committed offset(3): 여기까지는 처리 완료
current position(6): 지금 읽고 있는 위치
```

Offset 커밋 방식에 따라 메시지 유실과 중복 처리가 결정됩니다.

| 방식 | 동작 | 위험 |
|------|------|------|
| Auto Commit | 일정 주기로 자동 커밋 | 처리 전 커밋되면 메시지 유실 |
| Manual Commit | 처리 완료 후 직접 커밋 | 커밋 전 장애 시 중복 처리 (재시작 후 다시 읽음) |

### Replication과 ISR

Kafka는 Partition을 여러 Broker에 복제합니다. Leader가 읽기/쓰기를 담당하고, Follower가 복제합니다.

```
Partition 0의 복제 구조

Broker 1 (Leader):   [0] [1] [2] [3] [4]   ← Producer가 여기에 쓰기
Broker 2 (Follower): [0] [1] [2] [3] [4]   ← 복제 완료 (ISR)
Broker 3 (Follower): [0] [1] [2] [3]       ← 복제 지연 (ISR에서 제외)
```

**ISR(In-Sync Replica)**은 Leader와 동기화가 완료된 Follower 목록입니다. Producer의 `acks` 설정에 따라 신뢰성과 성능 사이의 트레이드오프가 결정됩니다.

| acks | 동작 | 성능 | 안정성 |
|------|------|------|--------|
| `0` | 전송만 하고 확인 안 함 | 최고 | 유실 가능 |
| `1` | Leader 기록 확인 | 중간 | Leader 장애 시 유실 가능 |
| `all` | 모든 ISR 복제 확인 | 낮음 | 유실 거의 없음 |

실무에서는 중요한 이벤트(결제, 주문)는 `acks=all`, 로그 수집처럼 유실이 허용되는 경우에는 `acks=1`을 사용합니다.

## RabbitMQ 아키텍처 심화

### AMQP 모델: Exchange → Binding → Queue

RabbitMQ는 AMQP(Advanced Message Queuing Protocol) 표준을 구현합니다. 메시지 흐름은 세 단계입니다.

```
Producer ──→ Exchange ──→ Binding ──→ Queue ──→ Consumer
              (우체국)     (배달 규칙)   (우편함)
```

Producer는 Queue에 직접 보내지 않습니다. Exchange에 보내면, Binding 규칙에 따라 적절한 Queue로 라우팅됩니다.

### Exchange 타입 4가지

**1. Direct Exchange**

라우팅 키가 정확히 일치하는 Queue에 전달합니다.

```
Exchange (direct)
   │
   ├── routing_key = "order.created" ──→ Queue: order-processing
   ├── routing_key = "order.cancelled" ──→ Queue: order-cancellation
   └── routing_key = "order.shipped" ──→ Queue: shipping-notification
```

용도: 특정 이벤트를 특정 Queue에 1:1로 매핑할 때.

**2. Topic Exchange**

라우팅 키 패턴(`*`, `#` 와일드카드)으로 매칭합니다.

```
Exchange (topic)
   │
   │  routing_key = "order.created"
   ├── pattern "order.*" ──→ Queue: all-order-events
   ├── pattern "order.created" ──→ Queue: new-order-processing
   └── pattern "#" ──→ Queue: audit-log (모든 메시지)

   * = 단어 1개 매칭
   # = 0개 이상 단어 매칭
```

용도: 이벤트 유형에 따라 여러 Queue에 유연하게 라우팅할 때.

**3. Fanout Exchange**

바인딩된 모든 Queue에 메시지를 복사합니다. 라우팅 키를 무시합니다.

```
Exchange (fanout)
   │
   ├──→ Queue: stock-service      (재고 차감)
   ├──→ Queue: notification-service (알림 발송)
   └──→ Queue: analytics-service   (분석 집계)
```

용도: 하나의 이벤트를 여러 서비스에 동시 전달할 때 (pub/sub).

**4. Headers Exchange**

라우팅 키 대신 메시지 헤더 속성으로 매칭합니다.

```
Exchange (headers)
   │
   │  headers: {type: "order", region: "kr"}
   ├── match(type=order, region=kr) ──→ Queue: kr-order
   └── match(type=order, region=us) ──→ Queue: us-order
```

용도: 라우팅 키 하나로 표현하기 어려운 복합 조건이 필요할 때.

### Prefetch와 Fair Dispatch

RabbitMQ는 기본적으로 라운드 로빈으로 메시지를 분배합니다. 문제는 Consumer마다 처리 속도가 다를 때 발생합니다.

```
기본 라운드 로빈: 처리 속도를 무시하고 번갈아 분배
Queue: [msg1] [msg2] [msg3] [msg4] [msg5] [msg6]
         ↓      ↓      ↓      ↓      ↓      ↓
      ConsA  ConsB  ConsA  ConsB  ConsA  ConsB
      (느림)  (빠름)  (느림)  (빠름)  (느림)  (빠름)

ConsA는 밀리고, ConsB는 놀게 됨
```

`prefetchCount`를 설정하면 Consumer가 한 번에 가져갈 수 있는 미확인 메시지 수를 제한합니다.

```
prefetchCount = 1: ACK를 보내야 다음 메시지를 받음
Queue: [msg1] [msg2] [msg3] [msg4] [msg5]
         ↓      ↓      ↓      ↓      ↓
      ConsA  ConsB  ConsB  ConsA  ConsB
                     (A가 아직 처리 중이면 B가 받음)
```

처리가 빠른 Consumer가 더 많은 메시지를 가져가므로 부하가 균등해집니다.

## Spring Boot 코드 예시

주문 도메인을 기준으로 Kafka와 RabbitMQ 각각의 구현을 살펴보겠습니다.

### Kafka 설정과 구현

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all  # 모든 ISR 복제 확인
      retries: 3
    consumer:
      group-id: order-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false  # 수동 커밋
      properties:
        spring.json.trusted.packages: "com.example.order.event"
```

```java
// Producer — 파티션 키 + 전송 결과 콜백
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderCreated(OrderCreatedEvent event) {
        // 주문 ID를 파티션 키로 사용 — 같은 주문의 이벤트는 순서 보장
        kafkaTemplate.send("order-events", String.valueOf(event.orderId()), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("메시지 전송 실패 - orderId: {}", event.orderId(), ex);
                    // 재시도 또는 fallback 처리
                } else {
                    log.info("메시지 전송 성공 - topic: {}, partition: {}, offset: {}",
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

```java
// Consumer — 수동 ACK + 동시 처리
@Service
@Slf4j
public class OrderEventConsumer {

    private final OrderProcessingService orderProcessingService;

    @KafkaListener(
        topics = "order-events",
        groupId = "stock-service",
        concurrency = "3"  // 3개 스레드로 병렬 처리
    )
    public void handleOrderEvent(
            OrderCreatedEvent event,
            Acknowledgment ack) {

        try {
            orderProcessingService.process(event);
            ack.acknowledge();  // 처리 완료 후 수동 커밋
        } catch (Exception e) {
            log.error("이벤트 처리 실패 - orderId: {}", event.orderId(), e);
            // ACK를 보내지 않으면 다음 poll에서 다시 받음
            throw e;
        }
    }
}
```

### RabbitMQ 설정과 구현

```yaml
# application.yml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    listener:
      simple:
        acknowledge-mode: manual  # 수동 ACK
        prefetch: 10  # Consumer당 미확인 메시지 최대 10개
        retry:
          enabled: true
          max-attempts: 3
          initial-interval: 1000  # 1초 후 첫 재시도
          multiplier: 2.0  # 2초, 4초로 간격 증가
```

```java
// Exchange, Queue, Binding 선언
@Configuration
public class RabbitMQConfig {

    // Exchange 선언
    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange("order.exchange");
    }

    // 각 서비스별 Queue
    @Bean
    public Queue stockQueue() {
        return QueueBuilder.durable("stock.queue")
            .withArgument("x-dead-letter-exchange", "order.dlx")  // DLQ 설정
            .withArgument("x-dead-letter-routing-key", "stock.dead")
            .build();
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable("notification.queue")
            .withArgument("x-dead-letter-exchange", "order.dlx")
            .withArgument("x-dead-letter-routing-key", "notification.dead")
            .build();
    }

    // Binding — 라우팅 규칙
    @Bean
    public Binding stockBinding(Queue stockQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(stockQueue)
            .to(orderExchange)
            .with("order.created");  // order.created 이벤트만 수신
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(notificationQueue)
            .to(orderExchange)
            .with("order.*");  // 모든 주문 이벤트 수신
    }
}
```

```java
// Producer
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final RabbitTemplate rabbitTemplate;

    public void publishOrderCreated(OrderCreatedEvent event) {
        rabbitTemplate.convertAndSend(
            "order.exchange",     // exchange
            "order.created",      // routing key
            event,
            message -> {
                // 메시지 영속화 — Broker 재시작 시에도 유실 방지
                message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                message.getMessageProperties().setMessageId(UUID.randomUUID().toString());
                return message;
            }
        );
        log.info("주문 이벤트 발행 - orderId: {}", event.orderId());
    }
}
```

```java
// Consumer — 수동 ACK
@Service
@Slf4j
public class StockEventConsumer {

    private final StockService stockService;

    @RabbitListener(queues = "stock.queue")
    public void handleOrderCreated(
            OrderCreatedEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        try {
            stockService.decreaseStock(event.items());
            channel.basicAck(deliveryTag, false);  // 처리 성공 — ACK
        } catch (Exception e) {
            log.error("재고 차감 실패 - orderId: {}", event.orderId(), e);
            // 재시도 불가능한 오류면 DLQ로 보냄 (requeue: false)
            channel.basicNack(deliveryTag, false, false);
        }
    }
}
```

## 핵심 차별점 심화 비교

[이전 글](/blog/event-driven-architecture)에서 기본 비교를 다뤘으니, 여기서는 실무에서 차이를 만드는 포인트를 깊이 들어가겠습니다.

### 메시지 보관과 재처리

이 차이가 가장 큰 실무적 영향을 줍니다.

**Kafka** — 메시지를 소비해도 삭제하지 않습니다. `retention.ms` 설정 기간 동안 보관합니다. Consumer가 offset을 되돌리면 과거 데이터를 다시 읽을 수 있습니다.

```
3일 전 장애로 일부 이벤트 처리 실패
→ Consumer Group의 offset을 3일 전으로 되돌림
→ 해당 기간의 이벤트를 다시 처리
```

**RabbitMQ** — Consumer가 ACK를 보내면 Queue에서 삭제합니다. 재처리가 필요하면 DLQ(Dead Letter Queue)에 보관된 실패 메시지만 복구할 수 있습니다. 정상 처리된 메시지는 이미 사라졌습니다.

### 순서 보장

**Kafka** — Partition 내에서만 순서를 보장합니다. 전체 Topic에 대한 순서는 보장하지 않습니다. 파티션 키 설계가 중요합니다.

**RabbitMQ** — 단일 Queue 내에서 순서가 보장됩니다. 다만 Consumer가 여러 개이고 prefetch가 1보다 크면 처리 완료 순서는 달라질 수 있습니다.

### 라우팅 유연성

**Kafka** — 라우팅이 단순합니다. Producer가 Topic을 지정하고, Consumer가 Topic을 구독합니다. 세밀한 라우팅이 필요하면 Topic을 나누거나 Consumer에서 필터링합니다.

**RabbitMQ** — Exchange와 Binding으로 정교한 라우팅이 가능합니다. 같은 메시지를 조건에 따라 다른 Queue로 보내거나, 패턴 매칭으로 유연하게 분배합니다.

### 처리량

**Kafka** — 배치 I/O, 순차 쓰기, zero-copy 등의 최적화로 높은 처리량을 냅니다. Partition을 늘리면 수평 확장됩니다.

**RabbitMQ** — 메시지별로 라우팅하고 ACK를 관리합니다. 메시지당 오버헤드가 Kafka보다 큽니다. 수만 TPS 수준에서는 충분하지만 수십만 TPS가 필요하면 한계가 있습니다.

### 종합 비교

| 항목 | Kafka | RabbitMQ |
|------|-------|----------|
| 메시지 보관 | 설정 기간 동안 보관 | ACK 후 삭제 |
| 재처리 | offset 되돌리기로 가능 | DLQ에 있는 것만 가능 |
| 순서 보장 | Partition 내 보장 | 단일 Queue 내 보장 |
| 라우팅 | Topic 단위 (단순) | Exchange/Binding (유연) |
| 처리량 | 수십만 TPS | 수만 TPS |
| 메시지당 지연 | 배치 처리로 약간 높을 수 있음 | 메시지별 처리로 지연 낮음 |
| Consumer 확장 | Partition 수 이하로 제한 | Queue당 Consumer 무제한 |
| 프로토콜 | 자체 프로토콜 | AMQP 표준 |

## 신뢰성 패턴

메시지 시스템에서 가장 중요한 질문은 "메시지가 정확히 전달되는가?"입니다.

### 전달 보장 수준

| 수준 | 의미 | Kafka | RabbitMQ |
|------|------|-------|----------|
| At-most-once | 최대 1번 (유실 가능) | `acks=0` + auto commit | Auto ACK |
| At-least-once | 최소 1번 (중복 가능) | `acks=all` + manual commit | Manual ACK + publisher confirm |
| Exactly-once | 정확히 1번 | Transactional Producer + `read_committed` | 직접 멱등성 구현 필요 |

대부분의 실무 시스템은 **At-least-once + 멱등성 처리**를 선택합니다. Exactly-once는 구현 비용이 높고 성능 오버헤드도 큽니다.

### Dead Letter Queue

처리에 실패한 메시지를 별도 공간에 보관하는 패턴입니다.

**RabbitMQ** — DLQ가 네이티브로 지원됩니다. Queue 선언 시 `x-dead-letter-exchange`를 지정하면, 처리 실패한 메시지가 자동으로 DLQ로 이동합니다.

```
메시지 처리 실패 흐름 (RabbitMQ)

Queue ──→ Consumer ──→ 처리 실패
                          │
                    basicNack(requeue: false)
                          │
                          ↓
                    Dead Letter Exchange ──→ DLQ
                                             │
                                       수동 확인 후 재처리
```

**Kafka** — DLQ가 기본 기능은 아니지만, Spring Kafka가 `@RetryableTopic`으로 재시도와 DLT(Dead Letter Topic)를 지원합니다.

### Kafka 재시도 전략: @RetryableTopic

Spring Kafka 2.7+에서 제공하는 `@RetryableTopic`은 재시도 Topic을 자동으로 생성하고 관리합니다.

```java
@Service
@Slf4j
public class OrderEventConsumer {

    @RetryableTopic(
        attempts = "3",  // 최대 3번 시도
        backoff = @Backoff(delay = 1000, multiplier = 2.0),  // 1초, 2초, 4초
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE
    )
    @KafkaListener(topics = "order-events", groupId = "stock-service")
    public void handleOrderEvent(OrderCreatedEvent event) {
        log.info("주문 이벤트 처리 - orderId: {}", event.orderId());
        stockService.decreaseStock(event.items());
        // 예외 발생 시 자동으로 retry topic으로 이동
    }

    @DltHandler
    public void handleDlt(OrderCreatedEvent event) {
        // 모든 재시도 실패 후 DLT(Dead Letter Topic)에 도착
        log.error("최종 처리 실패 - orderId: {}", event.orderId());
        // 알림 발송, DB 기록 등 후속 처리
        failedEventRepository.save(new FailedEvent(event, LocalDateTime.now()));
    }
}
```

이 코드가 생성하는 Topic 구조입니다.

```
order-events (원본)
  ↓ 1차 실패
order-events-retry-0 (1초 후 재시도)
  ↓ 2차 실패
order-events-retry-1 (2초 후 재시도)
  ↓ 3차 실패
order-events-dlt (Dead Letter Topic — 수동 확인 필요)
```

## 실무 선택 기준

### Kafka가 적합한 시나리오

- **이벤트 스트리밍** — 실시간 로그 수집, 사용자 행동 추적, 메트릭 수집
- **이벤트 리플레이** — 장애 복구 시 과거 이벤트를 다시 처리해야 하는 경우
- **대량 처리** — 초당 수만~수십만 건의 이벤트를 처리해야 하는 경우
- **다수 Consumer Group** — 같은 이벤트를 여러 서비스가 독립적으로 소비하는 경우

### RabbitMQ가 적합한 시나리오

- **작업 큐** — 이메일 발송, 이미지 처리 등 백그라운드 작업 분배
- **복잡한 라우팅** — 이벤트 타입, 지역, 우선순위에 따라 다른 처리가 필요한 경우
- **우선순위 큐** — 긴급 주문을 먼저 처리해야 하는 경우
- **요청-응답 패턴** — RPC 스타일의 동기적 메시지 교환이 필요한 경우

### 선택 체크리스트

| 질문 | Kafka | RabbitMQ |
|------|-------|----------|
| 이벤트를 나중에 다시 읽어야 하는가? | O | X |
| 초당 10만 건 이상 처리해야 하는가? | O | 한계 있음 |
| 여러 서비스가 같은 이벤트를 독립적으로 소비하는가? | O (Consumer Group) | 가능하지만 구조가 복잡 |
| 메시지별로 세밀한 라우팅이 필요한가? | X | O (Exchange/Binding) |
| 메시지 우선순위가 필요한가? | X | O |
| 요청-응답 패턴이 필요한가? | X | O |
| 운영 인력과 인프라가 충분한가? | 필요 (ZooKeeper/KRaft) | 상대적으로 간단 |

### 둘 다 쓰는 하이브리드 구조

규모가 큰 시스템에서는 두 브로커를 용도에 맞게 함께 사용하기도 합니다.

```
┌─────────────────────────────────────────────────────────┐
│                    주문 시스템                            │
│                                                         │
│  ┌─────────┐                                            │
│  │  주문    │──→ Kafka (order-events)                    │
│  │  서비스  │        │                                   │
│  └─────────┘        ├──→ Consumer Group: 정산 서비스     │
│                     ├──→ Consumer Group: 분석 서비스     │
│                     └──→ Consumer Group: 검색 인덱싱     │
│                                                         │
│                     RabbitMQ                             │
│  ┌─────────┐        │                                   │
│  │  알림    │←── notification.queue (이메일/푸시/SMS)    │
│  │  서비스  │        └── 우선순위 큐 적용                 │
│  └─────────┘                                            │
│                                                         │
│  Kafka: 이벤트 스트림 (대량, 리플레이 필요)               │
│  RabbitMQ: 작업 큐 (라우팅, 우선순위 필요)               │
└─────────────────────────────────────────────────────────┘
```

Kafka는 이벤트 스트리밍 파이프라인으로, RabbitMQ는 작업 분배 큐로 사용합니다. 각자 잘하는 일을 맡기는 것입니다.

## 정리

- **Kafka는 분산 커밋 로그**, RabbitMQ는 메시지 라우터입니다. 설계 철학이 다릅니다
- **Kafka**는 이벤트를 보관하고 재처리할 수 있습니다. 대량 스트리밍, 여러 Consumer Group, 이벤트 리플레이에 강합니다
- **RabbitMQ**는 메시지별 라우팅이 유연합니다. 작업 큐, 우선순위 처리, 요청-응답 패턴에 적합합니다
- **순서 보장**: Kafka는 Partition 내, RabbitMQ는 Queue 내에서 보장합니다
- **신뢰성 패턴**: 대부분 At-least-once + 멱등성으로 충분합니다. DLQ로 실패 메시지를 관리하세요
- **선택 기준**: "이벤트를 다시 읽어야 하는가?"와 "세밀한 라우팅이 필요한가?"가 핵심 질문입니다
- **둘 다 쓸 수 있습니다.** 이벤트 스트림은 Kafka, 작업 분배는 RabbitMQ로 역할을 나누는 것도 방법입니다

관련 글: [이벤트 기반 아키텍처](/blog/event-driven-architecture) · [Spring 트랜잭션 메커니즘](/blog/spring-transaction-mechanism) · [모놀리식 vs MSA](/blog/monolithic-vs-msa) · [Redis 자료구조](/blog/redis-data-structures)
