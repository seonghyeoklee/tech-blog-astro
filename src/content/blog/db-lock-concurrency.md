---
title: '데이터베이스 락과 동시성 제어'
description: '비관적 락과 낙관적 락의 차이, 데드락 해결 방법을 정리했습니다'
pubDate: 'Dec 14 2024'
tags: ['Database', 'MySQL']
series: 'database-fundamentals'
seriesOrder: 3
quiz:
  - question: "SELECT ... FOR UPDATE 구문의 역할은?"
    options:
      - "조회만 허용"
      - "해당 행에 배타적 락을 건다"
      - "업데이트를 예약한다"
      - "트랜잭션을 시작한다"
    correctAnswer: 1
    explanation: "SELECT FOR UPDATE는 조회한 행에 배타적 락(X Lock)을 걸어서 다른 트랜잭션이 수정하지 못하게 합니다. 비관적 락의 대표적인 방법입니다."
  - question: "JPA @Version을 사용한 낙관적 락에서 충돌 시 발생하는 예외는?"
    options:
      - "LockTimeoutException"
      - "OptimisticLockException"
      - "PessimisticLockException"
      - "ConcurrencyException"
    correctAnswer: 1
    explanation: "낙관적 락에서 버전 충돌이 발생하면 OptimisticLockException이 발생합니다. 재시도 로직으로 처리해야 합니다."
  - question: "데드락을 예방하는 가장 좋은 방법은?"
    options:
      - "락 타임아웃을 길게 설정"
      - "락 획득 순서를 항상 동일하게"
      - "트랜잭션을 사용하지 않음"
      - "낙관적 락만 사용"
    correctAnswer: 1
    explanation: "데드락의 주요 원인은 서로 다른 순서로 락을 획득하는 것입니다. 항상 같은 순서(예: ID 오름차순)로 락을 획득하면 데드락을 예방할 수 있습니다."
  - question: "충돌이 자주 발생하는 환경에서 권장되는 락 방식은?"
    options:
      - "낙관적 락"
      - "비관적 락"
      - "락 사용 안 함"
      - "분산 락"
    correctAnswer: 1
    explanation: "충돌이 자주 발생하면 낙관적 락은 재시도가 많아져 비효율적입니다. 비관적 락으로 미리 락을 걸어 충돌을 방지하는 것이 좋습니다."
---

재고가 1개 남은 상품을 동시에 2명이 구매하면 어떻게 될까요? 락 없이는 둘 다 구매에 성공할 수 있습니다. 동시성 문제는 테스트에서 발견하기 어렵고, 운영 환경에서 갑자기 나타납니다.

## 동시성 문제가 발생하는 상황

### Lost Update (갱신 손실)

두 트랜잭션이 같은 데이터를 동시에 수정하면 하나의 변경이 사라집니다.

```
시간    트랜잭션 A                    트랜잭션 B
─────────────────────────────────────────────────────────
T1      SELECT stock FROM products
        WHERE id = 1;  -- stock = 10
T2                                    SELECT stock FROM products
                                      WHERE id = 1;  -- stock = 10
T3      UPDATE products
        SET stock = 10 - 1  -- 9
        WHERE id = 1;
T4                                    UPDATE products
                                      SET stock = 10 - 1  -- 9
                                      WHERE id = 1;
T5      COMMIT;
T6                                    COMMIT;
─────────────────────────────────────────────────────────
결과: stock = 9 (10개에서 2개 팔았는데 9개?)
```

### 재고 차감 예시

실제 코드로 보면 이렇습니다.

```java
@Service
public class OrderService {

    @Transactional
    public void order(Long productId, int quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        if (product.getStock() < quantity) {
            throw new RuntimeException("재고 부족");
        }

        product.decreaseStock(quantity);  // stock = stock - quantity
        orderRepository.save(new Order(productId, quantity));
    }
}
```

동시에 100명이 요청하면 재고보다 더 많이 팔릴 수 있습니다.

## MySQL InnoDB 락 종류

### Shared Lock (S) vs Exclusive Lock (X)

```
┌─────────────────────────────────────────────────────────┐
│  Shared Lock (공유 락)                                  │
│  - 읽기 락                                              │
│  - 여러 트랜잭션이 동시에 획득 가능                      │
│  - SELECT ... FOR SHARE                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Exclusive Lock (배타 락)                               │
│  - 쓰기 락                                              │
│  - 한 트랜잭션만 획득 가능                               │
│  - SELECT ... FOR UPDATE                               │
│  - UPDATE, DELETE                                      │
└─────────────────────────────────────────────────────────┘
```

락 호환성:

|     | S   | X   |
|-----|-----|-----|
| S   | O   | X   |
| X   | X   | X   |

### Record Lock

특정 인덱스 레코드에 거는 락입니다.

```sql
-- id = 1인 행에 X락
SELECT * FROM products WHERE id = 1 FOR UPDATE;
```

### Gap Lock

인덱스 레코드 사이의 간격에 거는 락입니다. Phantom Read를 방지합니다.

```sql
-- id가 10과 20 사이인 곳에 INSERT 방지
SELECT * FROM products WHERE id BETWEEN 10 AND 20 FOR UPDATE;
```

id 15를 INSERT하려는 다른 트랜잭션은 대기합니다.

### Next-Key Lock

Record Lock + Gap Lock입니다. InnoDB의 기본 락 방식입니다.

## 비관적 락 vs 낙관적 락

동시성을 제어하는 두 가지 전략이 있습니다.

### 비관적 락 (Pessimistic Lock)

"충돌이 발생할 것이다"라고 가정하고, 데이터를 읽을 때 미리 락을 겁니다.

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);
}

@Service
public class OrderService {

    @Transactional
    public void order(Long productId, int quantity) {
        // SELECT ... FOR UPDATE 실행
        Product product = productRepository.findByIdWithLock(productId)
            .orElseThrow();

        product.decreaseStock(quantity);
    }
}
```

실행되는 SQL:

```sql
SELECT * FROM products WHERE id = 1 FOR UPDATE;
```

다른 트랜잭션은 이 락이 해제될 때까지 대기합니다.

```
트랜잭션 A                         트랜잭션 B
─────────────────────────────────────────────────────
SELECT ... FOR UPDATE (락 획득)
                                   SELECT ... FOR UPDATE
                                   (대기...)
UPDATE ...
COMMIT (락 해제)
                                   (락 획득)
                                   SELECT 결과 반환
                                   UPDATE ...
                                   COMMIT
```

### 낙관적 락 (Optimistic Lock)

"충돌이 거의 없을 것이다"라고 가정하고, 수정 시점에 충돌을 감지합니다.

```java
@Entity
public class Product {

    @Id
    private Long id;

    private int stock;

    @Version  // 낙관적 락을 위한 버전 컬럼
    private Long version;
}

@Service
public class OrderService {

    @Transactional
    public void order(Long productId, int quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.decreaseStock(quantity);
        // UPDATE시 version 체크
    }
}
```

실행되는 SQL:

```sql
UPDATE products
SET stock = 9, version = 2
WHERE id = 1 AND version = 1;
-- 영향받은 행이 0이면 OptimisticLockException 발생
```

충돌 시 예외가 발생하므로 재시도 로직이 필요합니다.

```java
@Service
public class OrderService {

    @Retryable(value = OptimisticLockException.class, maxAttempts = 3)
    @Transactional
    public void order(Long productId, int quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.decreaseStock(quantity);
    }
}
```

### 언제 무엇을 쓸까?

| 상황 | 추천 방식 | 이유 |
|------|----------|------|
| 충돌이 자주 발생 | 비관적 락 | 재시도 비용이 큼 |
| 충돌이 거의 없음 | 낙관적 락 | 락 대기 없이 빠름 |
| 읽기가 대부분 | 낙관적 락 | 불필요한 락 방지 |
| 금융, 재고 등 정합성 중요 | 비관적 락 | 확실한 동시성 제어 |

## 데드락

두 트랜잭션이 서로 상대방의 락을 기다리면 영원히 진행되지 않습니다.

### 데드락 발생 예시

```
트랜잭션 A                         트랜잭션 B
─────────────────────────────────────────────────────
UPDATE accounts
SET balance = balance - 100
WHERE id = 1;  (id=1 락 획득)
                                   UPDATE accounts
                                   SET balance = balance - 50
                                   WHERE id = 2;  (id=2 락 획득)

UPDATE accounts
SET balance = balance + 100
WHERE id = 2;  (id=2 대기...)
                                   UPDATE accounts
                                   SET balance = balance + 50
                                   WHERE id = 1;  (id=1 대기...)
─────────────────────────────────────────────────────
→ 서로 무한 대기 (데드락)
```

### MySQL 데드락 감지

InnoDB는 데드락을 자동 감지하고, 한 트랜잭션을 롤백시킵니다.

```
ERROR 1213 (40001): Deadlock found when trying to get lock;
try restarting transaction
```

### 데드락 로그 확인

```sql
SHOW ENGINE INNODB STATUS;
```

```
------------------------
LATEST DETECTED DEADLOCK
------------------------
*** (1) TRANSACTION:
TRANSACTION 12345, ACTIVE 2 sec
mysql tables in use 1, locked 1
LOCK WAIT 3 lock struct(s)
...

*** (2) TRANSACTION:
TRANSACTION 12346, ACTIVE 1 sec
mysql tables in use 1, locked 1
3 lock struct(s)
...

*** WE ROLL BACK TRANSACTION (1)
```

### 데드락 예방

**1. 락 순서 통일**

항상 같은 순서로 락을 획득합니다.

```java
// 나쁜 예: 순서가 일정하지 않음
public void transfer(Long from, Long to, int amount) {
    Account fromAccount = accountRepository.findByIdWithLock(from);
    Account toAccount = accountRepository.findByIdWithLock(to);
}

// 좋은 예: ID 순으로 항상 락 획득
public void transfer(Long from, Long to, int amount) {
    Long firstId = Math.min(from, to);
    Long secondId = Math.max(from, to);

    Account first = accountRepository.findByIdWithLock(firstId);
    Account second = accountRepository.findByIdWithLock(secondId);
}
```

**2. 트랜잭션 범위 최소화**

락을 오래 들고 있으면 충돌 확률이 높아집니다.

```java
// 나쁜 예: 외부 API 호출이 트랜잭션 안에
@Transactional
public void order(OrderRequest request) {
    Product product = productRepository.findByIdWithLock(request.getProductId());
    product.decreaseStock(request.getQuantity());

    PaymentResult result = paymentApi.pay(request);  // 외부 API 호출
    // 이 동안 락 유지...
}

// 좋은 예: 외부 API 호출은 트랜잭션 밖에서
public void order(OrderRequest request) {
    decreaseStock(request);  // 트랜잭션 1

    PaymentResult result = paymentApi.pay(request);  // 트랜잭션 없음

    saveOrder(request, result);  // 트랜잭션 2
}

@Transactional
public void decreaseStock(OrderRequest request) {
    Product product = productRepository.findByIdWithLock(request.getProductId());
    product.decreaseStock(request.getQuantity());
}
```

**3. 락 타임아웃 설정**

```sql
-- 글로벌 설정
SET innodb_lock_wait_timeout = 5;  -- 5초

-- 세션별 설정
SET SESSION innodb_lock_wait_timeout = 3;
```

Spring에서:

```java
@QueryHints(@QueryHint(name = "javax.persistence.lock.timeout", value = "3000"))
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<Product> findByIdWithLock(Long id);
```

## 분산 환경에서의 락

서버가 여러 대면 데이터베이스 락만으로는 부족할 수 있습니다.

### Redis 분산 락

```java
@Component
public class RedisLockService {

    private final RedisTemplate<String, String> redisTemplate;

    public boolean tryLock(String key, long timeoutMs) {
        Boolean result = redisTemplate.opsForValue()
            .setIfAbsent(key, "locked", Duration.ofMillis(timeoutMs));
        return Boolean.TRUE.equals(result);
    }

    public void unlock(String key) {
        redisTemplate.delete(key);
    }
}

@Service
public class OrderService {

    private final RedisLockService lockService;

    public void order(Long productId, int quantity) {
        String lockKey = "product:lock:" + productId;

        if (!lockService.tryLock(lockKey, 3000)) {
            throw new RuntimeException("락 획득 실패");
        }

        try {
            // 재고 차감 로직
            processOrder(productId, quantity);
        } finally {
            lockService.unlock(lockKey);
        }
    }
}
```

더 안전한 분산 락이 필요하면 Redisson의 RLock을 사용하세요.

```java
RLock lock = redissonClient.getLock("product:lock:" + productId);

try {
    if (lock.tryLock(3, 10, TimeUnit.SECONDS)) {
        processOrder(productId, quantity);
    }
} finally {
    lock.unlock();
}
```

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- 동시성 문제는 여러 트랜잭션이 같은 데이터를 수정할 때 발생합니다
- 비관적 락은 SELECT FOR UPDATE로 미리 락을 겁니다
- 낙관적 락은 @Version으로 수정 시점에 충돌을 감지합니다
- 데드락은 락 순서 통일과 트랜잭션 범위 최소화로 예방합니다
