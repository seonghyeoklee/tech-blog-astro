---
title: 'SQL vs NoSQL - 일관성과 확장성의 선택'
description: 'RDB와 NoSQL의 차이, 각각의 장단점, 실무에서의 선택 기준을 정리했습니다'
pubDate: 'Dec 21 2024'
tags: ['Database', 'Architecture', 'Redis']
series: 'tech-tradeoffs'
seriesOrder: 4
quiz:
  - question: "ACID 트랜잭션이 반드시 필요한 상황은?"
    options:
      - "실시간 채팅 메시지 저장"
      - "은행 계좌 이체"
      - "사용자 활동 로그 수집"
      - "상품 조회수 카운팅"
    correctAnswer: 1
    explanation: "은행 이체는 출금과 입금이 원자적으로 처리되어야 합니다. 중간에 실패하면 전체가 롤백되어야 하므로 ACID 트랜잭션이 필수입니다."
  - question: "NoSQL이 수평 확장에 유리한 이유는?"
    options:
      - "쿼리가 단순해서"
      - "스키마가 없어서"
      - "데이터가 독립적으로 분산 저장되어서"
      - "인덱스가 없어서"
    correctAnswer: 2
    explanation: "NoSQL은 JOIN 없이 데이터를 독립적으로 저장합니다. 데이터 간 의존성이 적어 여러 서버에 분산하기 쉽고, 샤딩이 자연스럽습니다."
  - question: "MongoDB의 Document 모델 장점은?"
    options:
      - "복잡한 JOIN 쿼리 지원"
      - "관련 데이터를 한 문서에 저장해 조회가 빠름"
      - "정규화로 중복 제거"
      - "강력한 스키마 검증"
    correctAnswer: 1
    explanation: "Document 모델은 관련 데이터를 하나의 문서에 임베딩합니다. 한 번의 조회로 필요한 데이터를 모두 가져올 수 있어 읽기 성능이 좋습니다."
  - question: "SQL과 NoSQL을 함께 사용하는 Polyglot Persistence의 예시는?"
    options:
      - "MySQL로 모든 데이터 처리"
      - "주문은 MySQL, 세션은 Redis, 로그는 MongoDB"
      - "MongoDB로 모든 데이터 처리"
      - "Redis로 모든 데이터 처리"
    correctAnswer: 1
    explanation: "데이터 특성에 맞는 저장소를 선택합니다. 트랜잭션이 필요한 주문은 RDB, 빠른 접근이 필요한 세션은 Redis, 유연한 스키마가 필요한 로그는 MongoDB를 사용합니다."
  - question: "Read가 압도적으로 많고 쓰기가 적은 데이터에 적합한 전략은?"
    options:
      - "Write-heavy NoSQL"
      - "Redis 캐시 + RDB"
      - "샤딩된 MongoDB"
      - "인메모리 RDB"
    correctAnswer: 1
    explanation: "읽기가 많은 경우 Redis 같은 캐시를 앞에 두고 RDB를 원본으로 사용합니다. 캐시 히트율이 높으면 DB 부하를 크게 줄일 수 있습니다."
---

새로운 프로젝트의 데이터베이스를 선택해야 합니다. MySQL로 갈까요, MongoDB로 갈까요? 아니면 둘 다 쓸까요?

"NoSQL이 확장성이 좋다던데" vs "우리 서비스는 트랜잭션이 중요해". 둘 다 맞는 말입니다. 하지만 데이터의 특성, 읽기/쓰기 패턴, 확장 요구사항에 따라 정답이 달라집니다.

## SQL (관계형 데이터베이스)이란

SQL 데이터베이스는 테이블 간의 관계를 정의하고, 정규화된 스키마로 데이터를 저장합니다.

### 구조

```
┌─────────────────────────────────────────────────────┐
│                   Relational DB                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │   users     │    │   orders    │    │  items  │  │
│  │─────────────│    │─────────────│    │─────────│  │
│  │ id (PK)     │◄──┐│ id (PK)     │    │ id (PK) │  │
│  │ name        │   ││ user_id(FK) │────┤order_id │  │
│  │ email       │   ││ total       │    │ product │  │
│  └─────────────┘   │└─────────────┘    │ price   │  │
│                    └───────────────────└─────────┘  │
│                                                      │
│  ✓ 정규화된 스키마    ✓ 외래키 관계    ✓ ACID 보장   │
└─────────────────────────────────────────────────────┘
```

### 코드 예시

```java
// 주문 조회 - JOIN으로 관련 데이터 함께 가져오기
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o FROM Order o
        JOIN FETCH o.user
        JOIN FETCH o.items
        WHERE o.id = :orderId
        """)
    Optional<Order> findByIdWithDetails(@Param("orderId") Long orderId);
}

// 계좌 이체 - 트랜잭션으로 원자성 보장
@Service
public class TransferService {

    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new AccountNotFoundException(fromId));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new AccountNotFoundException(toId));

        from.withdraw(amount);
        to.deposit(amount);

        // 둘 다 성공하거나 둘 다 실패 (원자성)
    }
}
```

### 장점

**1. ACID 트랜잭션**

```java
@Transactional
public void createOrderWithPayment(OrderRequest request) {
    Order order = orderRepository.save(new Order(request));
    Payment payment = paymentRepository.save(new Payment(order));
    Inventory inventory = inventoryRepository.decrease(request.getItems());

    // 하나라도 실패하면 전체 롤백
    // 데이터 일관성 100% 보장
}
```

돈이 오가는 금융 시스템, 재고 관리, 예약 시스템에서 필수입니다.

**2. 강력한 스키마와 데이터 무결성**

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    status ENUM('PENDING', 'PAID', 'SHIPPED') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 잘못된 데이터는 DB 레벨에서 거부
INSERT INTO orders (user_id, total, status)
VALUES (999, -100, 'INVALID');  -- 에러 발생
```

**3. 복잡한 쿼리와 JOIN**

```sql
-- 복잡한 분석 쿼리도 한 번에
SELECT
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent,
    AVG(o.total) as avg_order_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
GROUP BY u.id
HAVING total_spent > 100000
ORDER BY total_spent DESC;
```

### 단점

**1. 수평 확장이 어렵습니다**

```
┌─────────────────────────────────────────────────────┐
│                   수직 확장 (Scale Up)               │
│  ┌─────────┐      ┌─────────────────────────────┐   │
│  │ 4 Core  │  →   │       16 Core               │   │
│  │ 16GB    │      │       64GB                  │   │
│  │ 500GB   │      │       2TB                   │   │
│  └─────────┘      └─────────────────────────────┘   │
│                                                      │
│  ✗ 하드웨어 한계에 도달하면?                         │
│  ✗ 비용이 기하급수적으로 증가                        │
└─────────────────────────────────────────────────────┘
```

JOIN과 트랜잭션이 여러 서버에 걸쳐야 하면 복잡해집니다.

**2. 스키마 변경이 부담됩니다**

```sql
-- 수억 건 테이블에 컬럼 추가
ALTER TABLE orders ADD COLUMN discount DECIMAL(10, 2);
-- 테이블 락 발생, 서비스 영향...

-- pt-online-schema-change 같은 도구 필요
```

**3. 비정형 데이터 저장이 불편합니다**

```sql
-- 상품마다 속성이 다르면?
-- 의류: 사이즈, 색상
-- 전자제품: 전압, 무게
-- 음식: 유통기한, 알레르기

-- EAV 패턴 (안티패턴)
CREATE TABLE product_attributes (
    product_id BIGINT,
    attribute_name VARCHAR(100),
    attribute_value TEXT
);
-- 쿼리가 복잡해지고 성능 저하
```

---

## NoSQL이란

NoSQL은 "Not Only SQL"의 약자로, 스키마 유연성과 수평 확장성을 중시합니다.

### NoSQL 유형

```
┌──────────────────────────────────────────────────────────────┐
│                        NoSQL 종류                             │
├────────────────┬────────────────────────────────────────────┤
│  Document DB   │  MongoDB, CouchDB                          │
│                │  JSON 형태, 유연한 스키마                    │
├────────────────┼────────────────────────────────────────────┤
│  Key-Value     │  Redis, DynamoDB, Memcached                │
│                │  단순 조회, 캐시, 세션 저장                  │
├────────────────┼────────────────────────────────────────────┤
│  Column-Family │  Cassandra, HBase                          │
│                │  시계열 데이터, 대용량 쓰기                  │
├────────────────┼────────────────────────────────────────────┤
│  Graph DB      │  Neo4j, Amazon Neptune                     │
│                │  소셜 네트워크, 추천 시스템                  │
└────────────────┴────────────────────────────────────────────┘
```

### MongoDB (Document DB) 예시

```javascript
// 유연한 스키마 - 상품마다 다른 속성 저장
{
  "_id": ObjectId("..."),
  "name": "맥북 프로 14",
  "category": "electronics",
  "price": 2990000,
  "specs": {
    "cpu": "M3 Pro",
    "memory": "18GB",
    "storage": "512GB SSD"
  },
  "reviews": [
    { "user": "kim", "rating": 5, "comment": "최고" },
    { "user": "lee", "rating": 4, "comment": "비쌈" }
  ]
}

// 의류는 다른 속성
{
  "_id": ObjectId("..."),
  "name": "후드티",
  "category": "clothing",
  "price": 59000,
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["black", "white", "navy"]
}
```

```java
// Spring Data MongoDB
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private int price;
    private Map<String, Object> specs;  // 유연한 속성
    private List<Review> reviews;        // 임베디드 문서
}

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findByCategory(String category);

    @Query("{ 'specs.cpu': ?0 }")
    List<Product> findByCpu(String cpu);
}
```

### Redis (Key-Value) 예시

```java
// 세션 저장
@Service
public class SessionService {
    private final RedisTemplate<String, Object> redisTemplate;

    public void saveSession(String sessionId, UserSession session) {
        redisTemplate.opsForValue().set(
            "session:" + sessionId,
            session,
            Duration.ofHours(24)  // TTL 24시간
        );
    }

    public UserSession getSession(String sessionId) {
        return (UserSession) redisTemplate.opsForValue()
            .get("session:" + sessionId);
    }
}

// 캐시로 활용
@Cacheable(value = "products", key = "#id")
public Product getProduct(Long id) {
    return productRepository.findById(id)
        .orElseThrow(() -> new ProductNotFoundException(id));
}
```

### 장점

**1. 수평 확장이 자연스럽습니다**

```
┌─────────────────────────────────────────────────────────────┐
│                  수평 확장 (Scale Out)                       │
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ Shard 1 │   │ Shard 2 │   │ Shard 3 │   │ Shard 4 │     │
│  │  A-F    │   │  G-L    │   │  M-R    │   │  S-Z    │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│       ↑             ↑             ↑             ↑           │
│       └─────────────┴─────────────┴─────────────┘           │
│                         Router                               │
│                                                              │
│  ✓ 서버 추가로 무한 확장                                     │
│  ✓ 데이터가 독립적이라 샤딩이 쉬움                           │
└─────────────────────────────────────────────────────────────┘
```

**2. 스키마 유연성**

```javascript
// 버전 1: 초기 스키마
{ "name": "상품A", "price": 10000 }

// 버전 2: 필드 추가 (기존 데이터 영향 없음)
{ "name": "상품A", "price": 10000, "discount": 1000, "tags": ["new"] }

// 마이그레이션 없이 새 필드 사용
```

**3. 높은 쓰기 성능 (Write-heavy 워크로드)**

```java
// 로그, 이벤트, 센서 데이터 대량 저장
@Service
public class EventLogService {
    private final MongoTemplate mongoTemplate;

    public void logEvent(Event event) {
        // 단순 삽입, 관계 없음, 빠름
        mongoTemplate.insert(event, "events");
    }

    public void bulkInsert(List<Event> events) {
        // 배치 삽입으로 더 빠르게
        mongoTemplate.insertAll(events);
    }
}
```

### 단점

**1. 트랜잭션 제한**

```java
// MongoDB 4.0+에서 멀티 도큐먼트 트랜잭션 지원하지만...
// RDB만큼 강력하지 않고 성능 오버헤드 있음

// 권장: 단일 도큐먼트에 관련 데이터 임베딩
{
  "orderId": "ORD-001",
  "user": { "id": 1, "name": "kim" },  // 임베딩
  "items": [                            // 임베딩
    { "productId": 101, "qty": 2 },
    { "productId": 102, "qty": 1 }
  ],
  "total": 50000
}
// 단일 도큐먼트 수정은 원자적
```

**2. JOIN 없음 (데이터 중복)**

```javascript
// 주문에 사용자 정보 포함 (중복 저장)
{
  "orderId": "ORD-001",
  "user": {
    "id": 1,
    "name": "kim",
    "email": "kim@example.com"  // 사용자가 이메일 변경하면?
  }
}

// 이메일 변경 시 모든 주문 문서 업데이트 필요
// 또는 일관성 포기하고 비정규화 유지
```

**3. 일관성 모델 (Eventual Consistency)**

```
┌─────────────────────────────────────────────────────────────┐
│                   Eventual Consistency                       │
│                                                              │
│  Client → Primary ──복제──→ Secondary 1                     │
│              │                  ↓                            │
│              │              Secondary 2                      │
│              │                  ↓                            │
│              └── 잠시 후 동기화됨                            │
│                                                              │
│  ⚠ 쓰기 직후 읽기 시 이전 데이터가 보일 수 있음              │
└─────────────────────────────────────────────────────────────┘
```

---

## 핵심 비교

| 항목 | SQL (RDB) | NoSQL |
|------|-----------|-------|
| **스키마** | 고정, 정규화 | 유연, 비정규화 |
| **트랜잭션** | ACID 보장 | 제한적 (BASE) |
| **확장** | 수직 확장 중심 | 수평 확장 용이 |
| **쿼리** | SQL, JOIN | 단순 쿼리, No JOIN |
| **일관성** | 강한 일관성 | 최종 일관성 |
| **성능** | 읽기/쓰기 균형 | 특정 패턴에 최적화 |
| **사용 사례** | 금융, ERP, 트랜잭션 | 캐시, 로그, 대용량 |

### CAP 정리 관점

```
                    Consistency
                        △
                       / \
                      /   \
                     /     \
                    /   CA  \
                   /  (RDB)  \
                  /───────────\
                 /             \
                / CP        AP  \
               / MongoDB   Cassandra
              /   Redis    DynamoDB \
             ▽───────────────────────▽
        Partition              Availability
        Tolerance
```

- **CA (Consistency + Availability)**: 전통적인 RDB. 네트워크 파티션 시 가용성 포기
- **CP (Consistency + Partition Tolerance)**: MongoDB, Redis. 일관성 우선
- **AP (Availability + Partition Tolerance)**: Cassandra, DynamoDB. 가용성 우선

---

## 실무 선택 기준

### SQL을 선택해야 할 때

```
✅ 데이터 간 관계가 복잡하고 JOIN이 빈번
✅ 트랜잭션과 데이터 일관성이 핵심
✅ 금융, 결제, 재고 등 정확성이 중요한 도메인
✅ 복잡한 분석 쿼리가 필요
✅ 스키마가 안정적이고 변경이 적음
```

```java
// 예: 은행 시스템
@Transactional(isolation = Isolation.SERIALIZABLE)
public void transfer(Account from, Account to, BigDecimal amount) {
    // 절대 데이터 불일치가 발생하면 안 됨
    from.withdraw(amount);
    to.deposit(amount);
    transactionLogRepository.save(new TransactionLog(from, to, amount));
}
```

### NoSQL을 선택해야 할 때

```
✅ 대용량 데이터 + 높은 쓰기 처리량
✅ 스키마가 자주 변경됨
✅ 수평 확장이 필요 (트래픽 급증 대응)
✅ 데이터 간 관계가 단순하거나 없음
✅ 최종 일관성으로 충분
```

```java
// 예: 사용자 활동 로그
@Service
public class ActivityLogService {
    private final MongoTemplate mongoTemplate;

    public void log(UserActivity activity) {
        // 관계 없음, 대량 쓰기, 최종 일관성 OK
        mongoTemplate.insert(activity, "activities");
    }
}
```

---

## Polyglot Persistence: 둘 다 쓰기

실무에서는 한 가지만 사용하지 않습니다. 데이터 특성에 맞는 저장소를 조합합니다.

### 전형적인 구성

```
┌─────────────────────────────────────────────────────────────┐
│                     E-commerce System                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   MySQL     │  │   Redis     │  │     MongoDB         │  │
│  │─────────────│  │─────────────│  │─────────────────────│  │
│  │ • 사용자    │  │ • 세션      │  │ • 상품 카탈로그     │  │
│  │ • 주문      │  │ • 캐시      │  │ • 리뷰              │  │
│  │ • 결제      │  │ • 장바구니  │  │ • 로그              │  │
│  │ • 재고      │  │ • 랭킹      │  │ • 추천 데이터       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│        ▲                 ▲                   ▲               │
│        │                 │                   │               │
│        └────────┬────────┴───────────────────┘               │
│                 │                                            │
│        ┌────────┴────────┐                                   │
│        │   Application   │                                   │
│        └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

### 구현 예시

```java
@Service
public class ProductService {

    private final ProductJpaRepository mysqlRepo;      // 재고, 가격
    private final ProductMongoRepository mongoRepo;    // 상세 정보
    private final RedisTemplate<String, Product> redisTemplate;  // 캐시

    public ProductDetail getProduct(Long productId) {
        // 1. 캐시 확인
        String cacheKey = "product:" + productId;
        ProductDetail cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // 2. MySQL에서 핵심 정보 (재고, 가격)
        Product product = mysqlRepo.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        // 3. MongoDB에서 상세 정보 (스펙, 리뷰)
        ProductSpec spec = mongoRepo.findByProductId(productId);

        // 4. 조합
        ProductDetail detail = ProductDetail.of(product, spec);

        // 5. 캐시 저장
        redisTemplate.opsForValue().set(cacheKey, detail, Duration.ofHours(1));

        return detail;
    }

    @Transactional
    public void purchase(Long productId, int quantity) {
        // MySQL 트랜잭션으로 재고 차감 (정확성 필수)
        Product product = mysqlRepo.findByIdWithLock(productId);
        product.decreaseStock(quantity);

        // 구매 이벤트는 MongoDB에 로깅 (유연한 스키마)
        mongoRepo.logPurchaseEvent(new PurchaseEvent(productId, quantity));

        // 캐시 무효화
        redisTemplate.delete("product:" + productId);
    }
}
```

### 캐시 전략

```java
// Cache-Aside 패턴 (가장 일반적)
@Service
public class CacheAsideService {

    @Cacheable(value = "users", key = "#id")
    public User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }

    @CacheEvict(value = "users", key = "#user.id")
    public void updateUser(User user) {
        userRepository.save(user);
    }
}
```

```
┌──────────────────────────────────────────────────────────┐
│                   Cache-Aside 패턴                        │
│                                                          │
│  1. 캐시 조회 ──→ [Redis] ──→ Hit? ──→ 반환             │
│         │                       │                        │
│         │                       ↓ Miss                   │
│         │               2. DB 조회                       │
│         │                       │                        │
│         │                       ↓                        │
│         │              [MySQL/Mongo]                     │
│         │                       │                        │
│         │                       ↓                        │
│         │            3. 캐시에 저장                       │
│         │                       │                        │
│         └───────────────────────┴──→ 반환                │
└──────────────────────────────────────────────────────────┘
```

---

## 마이그레이션과 동기화

### SQL → NoSQL 부분 마이그레이션

```java
// 1단계: 이중 쓰기
@Service
public class DualWriteService {

    @Transactional
    public void saveProduct(Product product) {
        // 기존 MySQL 저장
        mysqlRepo.save(product);

        // 새로운 MongoDB에도 저장
        try {
            mongoRepo.save(toDocument(product));
        } catch (Exception e) {
            log.warn("MongoDB 저장 실패, 나중에 동기화", e);
        }
    }
}

// 2단계: 읽기 전환
@Service
public class ReadMigrationService {

    private final boolean useMongoForRead = true;  // Feature Flag

    public ProductDetail getProduct(Long id) {
        if (useMongoForRead) {
            return mongoRepo.findById(id);
        }
        return mysqlRepo.findById(id);
    }
}

// 3단계: 쓰기 전환 후 MySQL 제거
```

### CDC (Change Data Capture)

```
┌─────────────────────────────────────────────────────────────┐
│                  Debezium CDC Pipeline                       │
│                                                              │
│  [MySQL] ──binlog──→ [Debezium] ──→ [Kafka] ──→ [MongoDB]   │
│                                         │                    │
│                                         └──→ [Elasticsearch] │
│                                         │                    │
│                                         └──→ [Redis Cache]   │
│                                                              │
│  ✓ 실시간 동기화                                             │
│  ✓ 원본 DB 영향 없음                                         │
│  ✓ 다양한 대상으로 복제                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 선택 체크리스트

### 데이터 특성 분석

```
□ 데이터 간 관계가 복잡한가? → SQL
□ 스키마가 자주 변경되는가? → NoSQL
□ 트랜잭션이 필수인가? → SQL
□ 대용량 쓰기가 필요한가? → NoSQL (Cassandra, MongoDB)
□ 복잡한 분석 쿼리가 필요한가? → SQL
□ 수평 확장이 필요한가? → NoSQL
□ 빠른 읽기/쓰기가 필요한가? → NoSQL (Redis)
```

### 팀과 인프라 역량

```
□ 팀이 SQL에 익숙한가? → SQL로 시작
□ 운영 경험이 있는 DB는? → 그것으로 시작
□ 관리형 서비스 사용 가능? → Aurora, DocumentDB, ElastiCache
□ 모니터링/백업 체계가 있는가? → 익숙한 것으로
```

### 일반적인 권장사항

```
1. 대부분의 서비스: MySQL/PostgreSQL로 시작
   - 트랜잭션 안전, 익숙함, 충분한 성능

2. 캐시가 필요하면: Redis 추가
   - 세션, 빈번한 조회, 임시 데이터

3. 특정 요구사항 발생 시: NoSQL 추가
   - 로그/이벤트 → MongoDB, Elasticsearch
   - 시계열 → TimescaleDB, InfluxDB
   - 그래프 → Neo4j
```

---

## 정리

- **SQL**: 관계와 일관성이 중요할 때. 금융, 주문, 재고
- **NoSQL**: 확장성과 유연성이 중요할 때. 캐시, 로그, 카탈로그
- **실무에서는 Polyglot**: 데이터 특성에 맞게 조합
- **시작은 단순하게**: 필요할 때 복잡성 추가

"우리 서비스에 맞는 DB는?"이라는 질문에 정답은 없습니다. 데이터의 특성, 팀의 역량, 확장 요구사항을 고려해서 선택하되, 처음부터 과도하게 복잡한 구성은 피하세요.
