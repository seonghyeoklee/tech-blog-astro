---
title: 'DDD(도메인 주도 설계) - 복잡한 비즈니스를 코드로 풀어내는 방법'
description: 'DDD의 전략적/전술적 설계 패턴, 핵심 개념들과 실무 적용 방법을 정리했습니다'
pubDate: 'Dec 25 2024'
tags: ['Architecture', 'Spring']
series: 'tech-tradeoffs'
seriesOrder: 4
quiz:
  - question: 'DDD에서 Ubiquitous Language란?'
    options:
      - '프로그래밍 언어의 한 종류'
      - '개발자와 도메인 전문가가 공유하는 공통 언어'
      - 'SQL 쿼리 언어'
      - 'API 문서화 도구'
    correctAnswer: 1
    explanation: 'Ubiquitous Language(보편 언어)는 개발자와 도메인 전문가가 동일하게 사용하는 언어로, 코드와 대화에서 같은 용어를 사용하여 오해를 줄입니다.'

  - question: 'Bounded Context의 역할은?'
    options:
      - '데이터베이스를 분리하는 것'
      - '도메인 모델의 경계를 정의하고 모델의 일관성을 유지하는 것'
      - 'API 엔드포인트를 나누는 것'
      - '테스트 범위를 정하는 것'
    correctAnswer: 1
    explanation: 'Bounded Context는 특정 도메인 모델이 적용되는 명확한 경계입니다. 같은 용어도 Context마다 다른 의미를 가질 수 있으며, 각 Context 내에서 모델의 일관성을 유지합니다.'

  - question: 'Entity와 Value Object의 차이점은?'
    options:
      - 'Entity는 DB에 저장되고 Value Object는 저장되지 않는다'
      - 'Entity는 식별자로 구분하고 Value Object는 속성 값으로 동등성을 판단한다'
      - 'Entity는 클래스이고 Value Object는 인터페이스이다'
      - 'Value Object가 Entity보다 크기가 크다'
    correctAnswer: 1
    explanation: 'Entity는 고유한 식별자(ID)로 구분되며 생명주기를 가집니다. Value Object는 속성 값 자체로 동등성이 결정되며, 불변(immutable)하게 설계합니다.'

  - question: 'Aggregate의 핵심 규칙은?'
    options:
      - '모든 Entity를 하나로 묶는다'
      - '외부에서는 Aggregate Root를 통해서만 내부 객체에 접근한다'
      - 'Aggregate는 반드시 1개의 Entity만 포함한다'
      - 'Aggregate끼리는 직접 참조해야 한다'
    correctAnswer: 1
    explanation: 'Aggregate는 일관성 경계를 정의하며, 외부에서는 반드시 Aggregate Root를 통해서만 내부 객체에 접근합니다. 이를 통해 불변식(invariant)을 보장합니다.'

  - question: 'Domain Event를 사용하는 이유는?'
    options:
      - '로그를 남기기 위해'
      - '도메인에서 발생한 중요한 사건을 표현하고 시스템 간 느슨한 결합을 만들기 위해'
      - '예외를 처리하기 위해'
      - 'DB 트랜잭션을 관리하기 위해'
    correctAnswer: 1
    explanation: 'Domain Event는 도메인에서 발생한 의미 있는 사건을 표현합니다. 이벤트 기반 통신으로 Bounded Context 간 느슨한 결합을 만들고, 비동기 처리와 이력 관리에 활용됩니다.'
---

복잡한 비즈니스 로직을 어떻게 코드로 표현할까요? Service 클래스에 모든 로직을 넣으면 금방 수천 줄의 거대한 클래스가 됩니다. 요구사항이 바뀔 때마다 어디를 수정해야 할지 찾기 어렵고, 도메인 전문가와 대화할 때 같은 단어를 다르게 이해합니다.

DDD(Domain-Driven Design)는 이런 문제를 해결하기 위한 설계 접근법입니다. 비즈니스 도메인을 깊이 이해하고, 그 이해를 코드에 직접 반영합니다.

## DDD란

DDD(Domain-Driven Design, 도메인 주도 설계)는 Eric Evans가 2003년에 제안한 소프트웨어 설계 방법론입니다. 핵심 아이디어는 **복잡한 소프트웨어는 도메인의 복잡성에서 비롯되므로, 도메인 모델을 중심에 두고 설계해야 한다**는 것입니다.

### DDD의 두 가지 측면

```
DDD
├── 전략적 설계 (Strategic Design)
│   ├── 큰 그림에서 시스템을 어떻게 나눌 것인가
│   ├── Bounded Context, Context Map
│   └── Ubiquitous Language
│
└── 전술적 설계 (Tactical Design)
    ├── 코드 레벨에서 도메인을 어떻게 표현할 것인가
    ├── Entity, Value Object, Aggregate
    └── Domain Event, Repository, Domain Service
```

## 전략적 설계

전략적 설계는 시스템의 큰 그림을 다룹니다. 복잡한 도메인을 어떻게 나누고 연결할지 결정합니다.

### Ubiquitous Language (보편 언어)

개발자와 도메인 전문가가 **같은 용어**를 사용합니다. 코드에서도 그 용어를 그대로 씁니다.

**문제 상황:**

```
도메인 전문가: "고객이 주문을 취소하면 환불 처리해야 해요"
개발자 A: "User가 Order를 delete하면 Payment를 rollback하는 거죠?"
개발자 B: "cancel 메서드에서 refund 호출하면 되나요?"
```

용어가 다르면 오해가 생깁니다.

**Ubiquitous Language 적용:**

```java
// 도메인 전문가의 언어를 코드에 그대로 반영
public class Order {
    public void cancel() {
        if (!this.canBeCancelled()) {
            throw new OrderCannotBeCancelledException();
        }
        this.status = OrderStatus.CANCELLED;
        // 도메인 이벤트 발행
        registerEvent(new OrderCancelledEvent(this.id));
    }
}

public class RefundService {
    public void processRefund(OrderCancelledEvent event) {
        // 환불 처리
    }
}
```

**용어 정의 예시 (주문 도메인):**

| 용어 | 정의 | 코드 |
|------|------|------|
| 주문(Order) | 고객이 상품을 구매하기 위한 요청 | `Order` 클래스 |
| 주문 항목(OrderItem) | 주문에 포함된 개별 상품 | `OrderItem` 클래스 |
| 주문 취소(Cancel) | 배송 전 주문을 무효화 | `order.cancel()` |
| 환불(Refund) | 취소된 주문의 금액 반환 | `RefundService.processRefund()` |

### Bounded Context (경계가 있는 컨텍스트)

같은 단어도 문맥에 따라 다른 의미를 가집니다. Bounded Context는 **특정 도메인 모델이 적용되는 경계**입니다.

**예시: "상품(Product)"의 의미**

```
┌─────────────────────────────────────────────────────────────────┐
│                         E-Commerce System                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   카탈로그 BC    │    주문 BC      │         재고 BC             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│    Product      │   OrderItem     │      InventoryItem          │
│  - name         │  - productId    │    - sku                    │
│  - description  │  - quantity     │    - quantity               │
│  - price        │  - unitPrice    │    - location               │
│  - category     │  - options      │    - reservedQuantity       │
│  - images       │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

각 Context에서 "상품"의 관심사가 다릅니다:
- **카탈로그**: 상품 정보, 이미지, 카테고리
- **주문**: 주문한 수량, 가격, 옵션
- **재고**: SKU, 재고 수량, 위치

**코드 예시:**

```java
// 카탈로그 Context
package com.shop.catalog.domain;

public class Product {
    private ProductId id;
    private String name;
    private String description;
    private Money price;
    private Category category;
    private List<ProductImage> images;

    public void updatePrice(Money newPrice) {
        // 가격 변경 로직
    }
}

// 주문 Context
package com.shop.order.domain;

public class OrderItem {
    private ProductId productId;  // 참조만 유지
    private String productName;   // 스냅샷
    private Money unitPrice;      // 주문 시점 가격
    private int quantity;
    private List<OrderOption> options;

    public Money calculateTotal() {
        return unitPrice.multiply(quantity);
    }
}

// 재고 Context
package com.shop.inventory.domain;

public class InventoryItem {
    private Sku sku;
    private int availableQuantity;
    private int reservedQuantity;
    private WarehouseLocation location;

    public void reserve(int quantity) {
        if (availableQuantity < quantity) {
            throw new InsufficientStockException();
        }
        this.reservedQuantity += quantity;
        this.availableQuantity -= quantity;
    }
}
```

### Context Map (컨텍스트 맵)

Bounded Context들이 어떻게 관계를 맺는지 시각화합니다.

```
┌─────────────┐         ┌─────────────┐
│  카탈로그    │◄───────│    주문     │
│    BC       │ 조회    │     BC      │
└─────────────┘         └──────┬──────┘
                               │ 이벤트
                               ▼
┌─────────────┐         ┌─────────────┐
│   결제      │◄───────│    재고     │
│    BC       │ 이벤트  │     BC      │
└─────────────┘         └─────────────┘
```

**Context 간 관계 패턴:**

| 패턴 | 설명 | 예시 |
|------|------|------|
| **Shared Kernel** | 두 Context가 공유하는 모델 | 공통 User 모델 |
| **Customer-Supplier** | 상류(Supplier)가 하류(Customer)에 API 제공 | 주문 → 재고 |
| **Conformist** | 하류가 상류 모델을 그대로 따름 | 외부 결제 API 사용 |
| **Anti-Corruption Layer** | 외부 모델을 내부 모델로 변환 | 레거시 시스템 연동 |
| **Published Language** | 표준화된 교환 형식 | JSON 이벤트 스키마 |

**Anti-Corruption Layer 예시:**

```java
// 외부 레거시 시스템의 응답
public class LegacyOrderResponse {
    private String orderNo;      // "ORD-2024-001"
    private String custCode;     // "C001"
    private String status;       // "A" (Active)
    private BigDecimal amt;
}

// Anti-Corruption Layer
@Component
public class OrderTranslator {

    public Order translate(LegacyOrderResponse legacy) {
        return Order.builder()
            .id(new OrderId(legacy.getOrderNo()))
            .customerId(translateCustomerId(legacy.getCustCode()))
            .status(translateStatus(legacy.getStatus()))
            .totalAmount(Money.of(legacy.getAmt()))
            .build();
    }

    private OrderStatus translateStatus(String legacyStatus) {
        return switch (legacyStatus) {
            case "A" -> OrderStatus.CONFIRMED;
            case "C" -> OrderStatus.CANCELLED;
            case "D" -> OrderStatus.DELIVERED;
            default -> throw new UnknownStatusException(legacyStatus);
        };
    }
}
```

## 전술적 설계

전술적 설계는 코드 레벨에서 도메인을 어떻게 표현할지 다룹니다.

### Entity (엔티티)

**고유한 식별자**로 구분되는 객체입니다. 속성이 바뀌어도 같은 Entity입니다.

```java
public class Order {
    private final OrderId id;  // 식별자
    private OrderStatus status;
    private List<OrderItem> items;
    private Money totalAmount;
    private LocalDateTime orderedAt;

    // 식별자로 동등성 판단
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order order)) return false;
        return id.equals(order.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    // 비즈니스 로직을 Entity에 포함
    public void addItem(Product product, int quantity) {
        OrderItem item = OrderItem.create(product, quantity);
        this.items.add(item);
        this.totalAmount = calculateTotal();
    }

    public void cancel() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("진행 중인 주문만 취소할 수 있습니다");
        }
        this.status = OrderStatus.CANCELLED;
    }

    private Money calculateTotal() {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }
}
```

### Value Object (값 객체)

**속성 값**으로 동등성을 판단하는 불변 객체입니다. 식별자가 없습니다.

```java
// Value Object: 불변, 속성으로 동등성 판단
public class Money {
    private final BigDecimal amount;
    private final Currency currency;

    public static final Money ZERO = new Money(BigDecimal.ZERO, Currency.KRW);

    public Money(BigDecimal amount, Currency currency) {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("금액은 0 이상이어야 합니다");
        }
        this.amount = amount;
        this.currency = currency;
    }

    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money multiply(int quantity) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(quantity)), this.currency);
    }

    // 속성 값으로 동등성 판단
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money money)) return false;
        return amount.compareTo(money.amount) == 0
            && currency == money.currency;
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }
}

// Value Object: 주소
public class Address {
    private final String city;
    private final String street;
    private final String zipCode;

    public Address(String city, String street, String zipCode) {
        this.city = Objects.requireNonNull(city);
        this.street = Objects.requireNonNull(street);
        this.zipCode = Objects.requireNonNull(zipCode);
    }

    // 새 주소 생성 (불변성 유지)
    public Address changeStreet(String newStreet) {
        return new Address(this.city, newStreet, this.zipCode);
    }
}
```

**Entity vs Value Object 비교:**

| 특성 | Entity | Value Object |
|------|--------|--------------|
| **식별** | ID로 구분 | 속성 값으로 구분 |
| **동등성** | ID가 같으면 동일 | 모든 속성이 같으면 동일 |
| **가변성** | 상태 변경 가능 | 불변 (새 객체 생성) |
| **생명주기** | 독립적 생명주기 | 소유 Entity에 종속 |
| **예시** | Order, User, Product | Money, Address, DateRange |

### Aggregate (애그리거트)

**일관성 경계**를 정의하는 Entity와 Value Object의 클러스터입니다. **Aggregate Root**를 통해서만 내부에 접근합니다.

```
┌─────────────────────────────────────────┐
│           Order Aggregate               │
│  ┌─────────────────────────────────┐   │
│  │     Order (Aggregate Root)      │   │
│  │  - id: OrderId                  │   │
│  │  - status: OrderStatus          │   │
│  │  - customerId: CustomerId       │◄──┼── 외부 접근은 Root를 통해서만
│  │  - shippingAddress: Address     │   │
│  └──────────────┬──────────────────┘   │
│                 │ contains             │
│  ┌──────────────▼──────────────────┐   │
│  │         OrderItem               │   │
│  │  - productId: ProductId         │   │
│  │  - quantity: int                │   │
│  │  - unitPrice: Money             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Aggregate 설계 규칙:**

1. **Root를 통한 접근**: 외부에서는 Aggregate Root만 참조
2. **트랜잭션 경계**: 하나의 트랜잭션에서 하나의 Aggregate만 수정
3. **ID로 참조**: 다른 Aggregate는 ID로만 참조 (직접 참조 X)
4. **불변식 보호**: Root가 내부 일관성 보장

```java
// Aggregate Root
public class Order {
    private final OrderId id;
    private CustomerId customerId;  // 다른 Aggregate는 ID로만 참조
    private List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;
    private Address shippingAddress;

    // 외부에서 OrderItem에 직접 접근 불가
    // 반드시 Order를 통해 조작
    public void addItem(ProductId productId, String productName, Money price, int quantity) {
        validateCanModify();

        // 이미 있는 상품이면 수량 증가
        Optional<OrderItem> existingItem = findItem(productId);
        if (existingItem.isPresent()) {
            existingItem.get().increaseQuantity(quantity);
        } else {
            items.add(OrderItem.create(productId, productName, price, quantity));
        }

        // 불변식 검증
        validateTotalAmount();
    }

    public void removeItem(ProductId productId) {
        validateCanModify();
        items.removeIf(item -> item.getProductId().equals(productId));
    }

    // 불변식: 주문 금액은 100만원 이하
    private void validateTotalAmount() {
        Money total = calculateTotal();
        if (total.isGreaterThan(Money.of(1_000_000))) {
            throw new OrderAmountExceededException();
        }
    }

    private void validateCanModify() {
        if (status != OrderStatus.PENDING) {
            throw new OrderCannotBeModifiedException();
        }
    }

    // 읽기 전용 복사본 반환
    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}

// Aggregate 내부 Entity
public class OrderItem {
    private final ProductId productId;
    private final String productName;
    private final Money unitPrice;
    private int quantity;

    // 패키지 프라이빗: Order를 통해서만 생성
    static OrderItem create(ProductId productId, String name, Money price, int quantity) {
        return new OrderItem(productId, name, price, quantity);
    }

    void increaseQuantity(int amount) {
        this.quantity += amount;
    }

    public Money getSubtotal() {
        return unitPrice.multiply(quantity);
    }
}
```

**Aggregate 크기 결정:**

```java
// 잘못된 설계: 너무 큰 Aggregate
public class Order {
    private Customer customer;          // Customer Aggregate 포함 ❌
    private List<Product> products;     // Product Aggregate 포함 ❌
    private Payment payment;            // Payment Aggregate 포함 ❌
}

// 올바른 설계: ID로 참조
public class Order {
    private CustomerId customerId;      // ID만 참조 ✅
    private List<OrderItem> items;      // 내부 Entity ✅
    private PaymentId paymentId;        // ID만 참조 ✅
}
```

### Domain Event (도메인 이벤트)

도메인에서 발생한 **의미 있는 사건**을 표현합니다.

```java
// Domain Event 정의
public class OrderPlacedEvent {
    private final OrderId orderId;
    private final CustomerId customerId;
    private final Money totalAmount;
    private final LocalDateTime occurredAt;

    public OrderPlacedEvent(Order order) {
        this.orderId = order.getId();
        this.customerId = order.getCustomerId();
        this.totalAmount = order.getTotalAmount();
        this.occurredAt = LocalDateTime.now();
    }
}

public class OrderCancelledEvent {
    private final OrderId orderId;
    private final String reason;
    private final LocalDateTime occurredAt;

    public OrderCancelledEvent(OrderId orderId, String reason) {
        this.orderId = orderId;
        this.reason = reason;
        this.occurredAt = LocalDateTime.now();
    }
}

// Aggregate에서 이벤트 발행
public class Order {
    private List<Object> domainEvents = new ArrayList<>();

    public void place() {
        validateCanPlace();
        this.status = OrderStatus.PLACED;
        this.orderedAt = LocalDateTime.now();

        // 이벤트 등록
        registerEvent(new OrderPlacedEvent(this));
    }

    public void cancel(String reason) {
        validateCanCancel();
        this.status = OrderStatus.CANCELLED;

        registerEvent(new OrderCancelledEvent(this.id, reason));
    }

    protected void registerEvent(Object event) {
        domainEvents.add(event);
    }

    public List<Object> pullDomainEvents() {
        List<Object> events = new ArrayList<>(domainEvents);
        domainEvents.clear();
        return events;
    }
}

// 이벤트 핸들러 (다른 Bounded Context)
@Component
public class OrderEventHandler {
    private final InventoryService inventoryService;
    private final NotificationService notificationService;

    @EventListener
    public void handle(OrderPlacedEvent event) {
        // 재고 차감
        inventoryService.reserve(event.getOrderId());

        // 알림 발송
        notificationService.sendOrderConfirmation(event.getCustomerId());
    }

    @EventListener
    public void handle(OrderCancelledEvent event) {
        // 재고 복구
        inventoryService.release(event.getOrderId());
    }
}
```

### Repository (리포지토리)

Aggregate의 **영속성**을 담당합니다. 컬렉션처럼 Aggregate를 저장하고 조회합니다.

```java
// Repository 인터페이스 (도메인 레이어)
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByCustomerId(CustomerId customerId);
    void delete(Order order);
}

// Repository 구현체 (인프라 레이어)
@Repository
public class JpaOrderRepository implements OrderRepository {
    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Order save(Order order) {
        OrderEntity entity = mapper.toEntity(order);
        OrderEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.getValue())
            .map(mapper::toDomain);
    }
}

// Application Service에서 사용
@Service
@Transactional
public class OrderApplicationService {
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderId placeOrder(PlaceOrderCommand command) {
        // 도메인 객체 생성
        Order order = Order.create(
            command.getCustomerId(),
            command.getItems(),
            command.getShippingAddress()
        );

        // 비즈니스 로직 실행
        order.place();

        // 저장
        Order saved = orderRepository.save(order);

        // 이벤트 발행
        saved.pullDomainEvents().forEach(eventPublisher::publishEvent);

        return saved.getId();
    }
}
```

### Domain Service (도메인 서비스)

**여러 Aggregate에 걸친 로직**이나 Entity에 속하지 않는 도메인 로직을 처리합니다.

```java
// Domain Service: 여러 Aggregate에 걸친 로직
public class OrderPricingService {

    public Money calculateFinalPrice(Order order, Customer customer, List<Coupon> coupons) {
        Money basePrice = order.getTotalAmount();

        // 회원 등급 할인
        Money memberDiscount = calculateMemberDiscount(basePrice, customer.getGrade());

        // 쿠폰 할인
        Money couponDiscount = calculateCouponDiscount(basePrice, coupons);

        // 최종 가격 (순수 계산 로직)
        return basePrice.subtract(memberDiscount).subtract(couponDiscount);
    }

    private Money calculateMemberDiscount(Money price, MemberGrade grade) {
        return switch (grade) {
            case VIP -> price.multiply(0.1);
            case GOLD -> price.multiply(0.05);
            case SILVER -> price.multiply(0.03);
            default -> Money.ZERO;
        };
    }
}

// Domain Service: 외부 의존 없는 순수 도메인 로직
public class TransferService {

    public void transfer(Account from, Account to, Money amount) {
        // 출금
        from.withdraw(amount);

        // 입금
        to.deposit(amount);

        // 이체 기록 생성
        TransferRecord record = TransferRecord.create(from.getId(), to.getId(), amount);
    }
}
```

## 패키지 구조

DDD 프로젝트의 전형적인 패키지 구조입니다.

```
src/main/java/com/shop/
├── order/                          # Bounded Context
│   ├── domain/                     # 도메인 레이어
│   │   ├── model/
│   │   │   ├── Order.java          # Aggregate Root
│   │   │   ├── OrderItem.java      # Entity
│   │   │   ├── OrderId.java        # Value Object
│   │   │   ├── OrderStatus.java    # Enum
│   │   │   └── Money.java          # Value Object
│   │   ├── event/
│   │   │   ├── OrderPlacedEvent.java
│   │   │   └── OrderCancelledEvent.java
│   │   ├── service/
│   │   │   └── OrderPricingService.java  # Domain Service
│   │   └── repository/
│   │       └── OrderRepository.java      # Repository Interface
│   │
│   ├── application/                # 애플리케이션 레이어
│   │   ├── service/
│   │   │   └── OrderApplicationService.java
│   │   ├── command/
│   │   │   ├── PlaceOrderCommand.java
│   │   │   └── CancelOrderCommand.java
│   │   └── query/
│   │       └── OrderQueryService.java
│   │
│   └── infrastructure/             # 인프라 레이어
│       ├── persistence/
│       │   ├── JpaOrderRepository.java
│       │   ├── OrderEntity.java
│       │   └── OrderMapper.java
│       └── messaging/
│           └── OrderEventPublisher.java
│
├── catalog/                        # 다른 Bounded Context
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
└── shared/                         # 공유 커널
    └── domain/
        ├── Money.java
        └── Address.java
```

## DDD 적용 가이드

### 적합한 경우

✅ **프로젝트 특성:**
- 복잡한 비즈니스 로직
- 도메인 전문가와 협업 필요
- 장기 운영 및 확장 예정
- 여러 팀이 협업하는 대규모 시스템

✅ **도메인 특성:**
- 비즈니스 규칙이 많고 자주 변경됨
- 도메인 용어가 중요함 (금융, 의료, 물류)
- 여러 하위 도메인으로 분리 가능

### 부적합한 경우

❌ **피해야 할 상황:**
- 단순 CRUD 애플리케이션
- 비즈니스 로직이 거의 없는 경우
- 빠른 프로토타입 개발
- 도메인 전문가 없이 개발하는 경우

### 점진적 적용 전략

```
1단계: Ubiquitous Language 정립
├── 도메인 전문가와 용어 정의
├── 용어집(Glossary) 작성
└── 코드에 용어 적용

2단계: Bounded Context 식별
├── 핵심 도메인 파악
├── Context 경계 정의
└── Context Map 작성

3단계: 핵심 도메인 전술적 설계
├── Aggregate 설계
├── Entity/Value Object 분리
└── Repository 패턴 적용

4단계: 확장
├── Domain Event 도입
├── 다른 Context에 적용
└── Anti-Corruption Layer 구축
```

## 주의사항

### 흔한 실수

**1. 빈약한 도메인 모델 (Anemic Domain Model)**

```java
// ❌ 잘못된 예: getter/setter만 있는 Entity
public class Order {
    private Long id;
    private String status;
    private BigDecimal amount;

    // getter, setter만 존재
}

// 로직이 Service에 집중
@Service
public class OrderService {
    public void cancelOrder(Long orderId) {
        Order order = repository.findById(orderId);
        if (order.getStatus().equals("PENDING")) {
            order.setStatus("CANCELLED");
            // 모든 로직이 Service에...
        }
    }
}

// ✅ 올바른 예: 풍부한 도메인 모델
public class Order {
    private OrderId id;
    private OrderStatus status;
    private Money amount;

    public void cancel() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("진행 중인 주문만 취소 가능");
        }
        this.status = OrderStatus.CANCELLED;
    }
}
```

**2. 너무 큰 Aggregate**

```java
// ❌ 잘못된 예
public class Order {
    private Customer customer;       // 다른 Aggregate 포함
    private List<Product> products;  // 다른 Aggregate 포함
    private Payment payment;         // 다른 Aggregate 포함
}

// ✅ 올바른 예
public class Order {
    private CustomerId customerId;   // ID만 참조
    private List<OrderItem> items;   // 내부 Entity
    private PaymentId paymentId;     // ID만 참조
}
```

**3. 잘못된 트랜잭션 범위**

```java
// ❌ 잘못된 예: 여러 Aggregate를 한 트랜잭션에서 수정
@Transactional
public void placeOrder(OrderCommand command) {
    Order order = orderRepository.save(new Order(...));

    // 다른 Aggregate 수정
    Inventory inventory = inventoryRepository.findByProductId(productId);
    inventory.decrease(quantity);  // ❌ 다른 Aggregate

    Customer customer = customerRepository.findById(customerId);
    customer.addPoints(100);       // ❌ 다른 Aggregate
}

// ✅ 올바른 예: 이벤트로 느슨하게 연결
@Transactional
public void placeOrder(OrderCommand command) {
    Order order = Order.create(...);
    order.place();
    orderRepository.save(order);

    // 이벤트 발행 → 다른 Aggregate는 별도 트랜잭션에서 처리
    eventPublisher.publish(new OrderPlacedEvent(order));
}

@EventListener
@Transactional
public void onOrderPlaced(OrderPlacedEvent event) {
    // 별도 트랜잭션
    inventoryService.reserve(event.getOrderId());
}
```

## 정리

**DDD 핵심 개념:**
- **Ubiquitous Language**: 개발자와 도메인 전문가의 공통 언어
- **Bounded Context**: 도메인 모델의 경계, 같은 용어도 Context마다 다른 의미
- **Entity**: 식별자로 구분, 상태 변경 가능
- **Value Object**: 속성 값으로 동등성 판단, 불변
- **Aggregate**: 일관성 경계, Root를 통해서만 접근
- **Domain Event**: 도메인의 의미 있는 사건, Context 간 통신

**DDD 적용 원칙:**
- 도메인 로직은 도메인 객체에 (풍부한 도메인 모델)
- Aggregate는 작게 유지
- Aggregate 간에는 ID로만 참조
- 하나의 트랜잭션에서 하나의 Aggregate만 수정
- 도메인 이벤트로 Context 간 느슨한 결합

**언제 적용하나:**
- 복잡한 비즈니스 로직이 있을 때
- 도메인 전문가와 협업이 필요할 때
- 장기 운영 및 확장이 예상될 때
- 단순 CRUD에는 오버엔지니어링
