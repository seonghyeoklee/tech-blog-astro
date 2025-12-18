---
title: 'DB 트랜잭션 기본 - ACID와 격리 수준'
description: '트랜잭션의 본질과 격리 수준별 동작 차이를 정리했습니다'
pubDate: 'Jan 01 2025'
tags: ['Database', 'MySQL']
series: 'database-fundamentals'
seriesOrder: 1
quiz:
  - question: "READ COMMITTED 격리 수준에서 발생할 수 있는 현상은?"
    options:
      - "Dirty Read"
      - "Non-Repeatable Read"
      - "Phantom Read만 발생"
      - "모든 이상 현상 방지"
    correctAnswer: 1
    explanation: "READ COMMITTED는 커밋된 데이터만 읽지만, 같은 트랜잭션 내에서 동일한 SELECT를 두 번 실행했을 때 다른 결과가 나올 수 있습니다. 이를 Non-Repeatable Read라고 합니다."
  - question: "ACID 속성 중 '격리성'을 의미하는 것은?"
    options:
      - "Atomicity"
      - "Consistency"
      - "Isolation"
      - "Durability"
    correctAnswer: 2
    explanation: "Isolation(격리성)은 여러 트랜잭션이 동시에 실행될 때 서로 영향을 주지 않도록 격리하는 속성입니다. 격리 수준(READ COMMITTED, REPEATABLE READ 등)에 따라 격리 정도가 달라집니다."
  - question: "Spring의 @Transactional이 실제로 트랜잭션을 처리하는 주체는?"
    options:
      - "Spring Framework"
      - "JVM"
      - "Database (MySQL, PostgreSQL 등)"
      - "애플리케이션 서버 (Tomcat 등)"
    correctAnswer: 2
    explanation: "Spring은 트랜잭션의 시작(BEGIN)과 종료(COMMIT/ROLLBACK)를 관리하는 역할만 합니다. 실제 트랜잭션 격리, ACID 보장 등의 동작은 데이터베이스가 처리합니다."
  - question: "트랜잭션의 원자성(Atomicity)을 보장하기 위해 데이터베이스가 사용하는 메커니즘은?"
    options:
      - "Redo Log"
      - "Undo Log"
      - "Binary Log"
      - "Transaction Log"
    correctAnswer: 1
    explanation: "데이터베이스는 Undo Log를 사용하여 원자성을 보장합니다. 데이터를 변경하기 전에 원래 값을 Undo Log에 기록하고, ROLLBACK 시 이를 읽어서 원래 상태로 되돌립니다."
  - question: "MySQL InnoDB의 기본 격리 수준인 REPEATABLE READ에서 발생할 수 있는 문제는?"
    options:
      - "Dirty Read"
      - "Non-Repeatable Read"
      - "Phantom Read"
      - "모든 문제 발생 안 함"
    correctAnswer: 2
    explanation: "REPEATABLE READ에서는 트랜잭션 시작 시점의 스냅샷을 계속 보기 때문에 Dirty Read와 Non-Repeatable Read는 방지됩니다. 하지만 새로 INSERT된 row는 보일 수 있는 Phantom Read 문제가 발생할 수 있습니다."
  - question: "트랜잭션에서 Durability(지속성)를 보장하는 메커니즘은?"
    options:
      - "Undo Log"
      - "Buffer Pool"
      - "Redo Log"
      - "Query Cache"
    correctAnswer: 2
    explanation: "데이터베이스는 Redo Log를 사용하여 지속성을 보장합니다. 트랜잭션 커밋 시 Redo Log에 변경 내용을 기록하고, 장애 발생 시 Redo Log를 읽어서 커밋된 데이터를 복구합니다."
  - question: "다음 중 격리 수준이 가장 높은 것은?"
    options:
      - "READ UNCOMMITTED"
      - "READ COMMITTED"
      - "REPEATABLE READ"
      - "SERIALIZABLE"
    correctAnswer: 3
    explanation: "SERIALIZABLE이 가장 높은 격리 수준으로, 모든 이상 현상(Dirty Read, Non-Repeatable Read, Phantom Read)을 방지합니다. 하지만 동시성이 가장 낮아 성능이 떨어질 수 있습니다."
  - question: "트랜잭션이 롤백될 때 원래 상태로 되돌리기 위해 사용되는 것은?"
    options:
      - "Redo Log의 이전 값"
      - "Undo Log의 이전 값"
      - "Binary Log의 역순 실행"
      - "Buffer Pool의 스냅샷"
    correctAnswer: 1
    explanation: "ROLLBACK 시 Undo Log에 기록된 이전 값을 읽어서 원래 상태로 되돌립니다. Undo Log는 트랜잭션이 변경하기 전의 원본 데이터를 보관합니다."
  - question: "@Transactional 애노테이션에서 readOnly=true 옵션의 효과는?"
    options:
      - "데이터베이스 읽기 전용 모드로 전환"
      - "SELECT 쿼리만 실행 가능하도록 제한"
      - "변경 감지(Dirty Checking) 비활성화로 성능 향상"
      - "트랜잭션을 생성하지 않음"
    correctAnswer: 2
    explanation: "readOnly=true는 JPA의 변경 감지(Dirty Checking)를 비활성화하여 성능을 향상시킵니다. 데이터베이스 레벨에서도 최적화 힌트를 제공하지만, 실제 쓰기 작업을 물리적으로 막지는 않습니다."
  - question: "다음 중 Non-Repeatable Read 문제가 발생하는 상황은?"
    options:
      - "커밋되지 않은 데이터를 읽는 경우"
      - "같은 SELECT를 두 번 실행했는데 결과가 다른 경우"
      - "새로 INSERT된 row가 보이는 경우"
      - "데드락이 발생하는 경우"
    correctAnswer: 1
    explanation: "Non-Repeatable Read는 같은 트랜잭션 내에서 동일한 SELECT를 두 번 실행했을 때 다른 결과가 나오는 현상입니다. READ COMMITTED 격리 수준에서 발생할 수 있습니다."
---

예를 들어, `@Transactional`을 단순히 "다 함께 성공하거나 실패하는 것"으로만 이해하고 사용하는 경우가 있습니다. 그러다 프로덕션에서 동시 주문 처리 중 재고가 마이너스로 떨어지는 버그가 발생할 수 있습니다. 원인은 격리 수준입니다. READ COMMITTED에서는 두 트랜잭션이 같은 재고를 동시에 읽을 수 있기 때문입니다.

## 트랜잭션이 필요한 이유

계좌 이체를 생각해봅니다. A 계좌에서 10만원을 빼고, B 계좌에 10만원을 넣는 작업입니다.

```java
@Service
public class TransferService {
    public void transfer(Long fromId, Long toId, int amount) {
        accountRepository.decreaseBalance(fromId, amount);  // A 계좌 -10만원
        // 여기서 서버 죽으면?
        accountRepository.increaseBalance(toId, amount);    // B 계좌 +10만원
    }
}
```

두 쿼리 사이에 서버가 죽으면? A 계좌에서 10만원이 빠졌는데, B 계좌에는 안 들어간 상태가 됩니다. 돈이 공중에서 사라진 겁니다.

트랜잭션은 이 두 작업을 하나로 묶어서, 둘 다 성공하거나 둘 다 실패하게 만듭니다.

```java
@Transactional
public void transfer(Long fromId, Long toId, int amount) {
    accountRepository.decreaseBalance(fromId, amount);
    accountRepository.increaseBalance(toId, amount);
    // 둘 다 성공 → COMMIT
    // 하나라도 실패 → ROLLBACK (처음 상태로)
}
```

Spring이 트랜잭션을 "관리"할 뿐이고, 실제 동작은 DB가 처리합니다.

## ACID 속성

트랜잭션이 보장하는 4가지 속성입니다.

### Atomicity (원자성)

트랜잭션은 전부 성공하거나 전부 실패합니다. 부분 성공은 없습니다.

```java
@Transactional
public void createOrder(Order order) {
    orderRepository.save(order);           // 1. 주문 저장
    stockRepository.decrease(productId);   // 2. 재고 감소
    pointRepository.add(userId, points);   // 3. 포인트 적립

    // 3번에서 실패하면? → 1, 2번도 ROLLBACK
}
```

DB는 **Undo Log**로 이를 보장합니다. 데이터를 변경하기 전에 원래 값을 Undo Log에 기록합니다. ROLLBACK 시 Undo Log를 읽어서 원래 상태로 되돌립니다.

```
1. Undo Log에 "재고 = 100" 기록
2. 재고를 99로 변경
3. 에러 발생
4. Undo Log 읽어서 재고를 100으로 복구
```

### Consistency (일관성)

트랜잭션 전후로 데이터 무결성이 유지됩니다. DB 제약조건을 위반하는 상태로는 커밋되지 않습니다.

```java
// DB 제약: stock >= 0

@Transactional
public void purchase(Long productId, int quantity) {
    Product product = productRepository.findById(productId);
    product.decreaseStock(quantity);  // stock = -5
    // COMMIT 시도 → 제약 위반 → 트랜잭션 실패
}
```

일관성은 DB 제약조건(CHECK, FK, UNIQUE)과 애플리케이션 로직이 함께 보장합니다.

### Isolation (격리성)

동시에 실행되는 트랜잭션들이 서로 영향을 주지 않습니다. 이게 가장 복잡합니다.

A 트랜잭션이 재고를 수정하는 중에 B 트랜잭션이 같은 재고를 읽으면 어떤 값을 봐야 할까요? 수정 전 값? 수정 중인 값?

완벽한 격리는 성능을 심하게 떨어뜨립니다. 그래서 DB는 격리 수준이라는 옵션을 제공합니다.

### Durability (지속성)

커밋된 데이터는 시스템이 죽어도 살아있습니다.

```java
@Transactional
public void payment(Payment payment) {
    paymentRepository.save(payment);
    // COMMIT 직후 서버 죽어도
    // → 재시작 시 payment 데이터는 DB에 남아있음
}
```

InnoDB는 **Redo Log**로 이를 보장합니다. 변경 사항을 먼저 Redo Log에 기록하고(Write-Ahead Logging), 그 다음 실제 데이터 파일에 씁니다.

```
1. Redo Log에 "payment 데이터 저장" 기록
2. 사용자에게 "COMMIT 완료" 응답
3. 서버 죽음
4. 재시작 시 Redo Log 읽어서 데이터 복구
```

정리:
- **Undo Log**: ROLLBACK용 (원자성)
- **Redo Log**: 복구용 (지속성)

## 격리 수준

동시에 여러 트랜잭션이 같은 데이터에 접근하면 문제가 생깁니다.

```
시간    트랜잭션 A                    트랜잭션 B
────────────────────────────────────────────────────
 1      BEGIN
 2      SELECT stock FROM product
        WHERE id = 1  → 100
 3                                    BEGIN
 4                                    UPDATE product SET stock = 50 WHERE id = 1
 5                                    COMMIT
 6      SELECT stock FROM product
        WHERE id = 1  → ???
 7      COMMIT
```

6번에서 A는 어떤 값을 봐야 할까요? B가 변경한 50? 아니면 처음 읽었던 100? 이걸 정하는 게 격리 수준입니다.

### READ UNCOMMITTED

가장 낮은 격리 수준입니다. 커밋 안 된 데이터도 읽습니다.

```java
// 트랜잭션 A
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
public int getStock(Long productId) {
    return productRepository.findById(productId).getStock();  // 50 (B가 아직 커밋 안 함)
}

// 트랜잭션 B
@Transactional
public void updateStock(Long productId) {
    Product product = productRepository.findById(productId);
    product.setStock(50);
    // A가 여기서 읽음
    throw new RuntimeException();  // ROLLBACK됨
}
```

B가 ROLLBACK하면 A가 읽은 50은 존재한 적 없는 값이 됩니다. 이게 **Dirty Read**입니다. 실무에서 쓸 일이 거의 없습니다.

### READ COMMITTED

커밋된 데이터만 읽습니다. Oracle, PostgreSQL의 기본값입니다.

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void processOrder(Long productId) {
    // 1. 재고 확인
    int stock = productRepository.findById(productId).getStock();  // 100

    // 2. 다른 트랜잭션이 재고를 50으로 변경하고 COMMIT

    // 3. 다시 읽기
    int stockAgain = productRepository.findById(productId).getStock();  // 50

    // stock != stockAgain
}
```

같은 SELECT를 두 번 실행했는데 결과가 다릅니다. 이게 **Non-Repeatable Read**입니다.

실무 예시: 주문 수량 검증 시 재고를 확인했는데, 실제 차감할 때는 다른 트랜잭션이 먼저 차감해버려서 재고가 마이너스로 떨어지는 경우가 있습니다.

### REPEATABLE READ

트랜잭션 시작 시점의 스냅샷을 계속 봅니다. MySQL InnoDB의 기본값입니다.

```java
// application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    # MySQL InnoDB는 기본적으로 REPEATABLE READ
```

InnoDB는 **MVCC(Multi-Version Concurrency Control)**로 구현합니다.

```java
@Transactional  // REPEATABLE READ (기본값)
public void processOrder(Long productId) {
    // 트랜잭션 시작 시점의 스냅샷 생성

    int stock1 = productRepository.findById(productId).getStock();  // 100

    // 다른 트랜잭션이 재고를 50으로 변경하고 COMMIT

    int stock2 = productRepository.findById(productId).getStock();  // 100 (변하지 않음!)

    // stock1 == stock2
}
```

트랜잭션 시작 시점의 데이터를 계속 봅니다. 다른 트랜잭션이 중간에 값을 바꿔도 보이지 않습니다.

**Phantom Read 문제**

```java
@Transactional
public int countProducts(String category) {
    int count1 = productRepository.countByCategory(category);  // 10개

    // 다른 트랜잭션이 같은 카테고리에 상품 1개 INSERT하고 COMMIT

    int count2 = productRepository.countByCategory(category);  // 11개?
}
```

기존 row의 변경은 안 보이지만, 새로 INSERT된 row는 보일 수 있습니다. 이게 Phantom Read입니다.

**MySQL InnoDB의 특별함**

MySQL InnoDB는 REPEATABLE READ에서도 Phantom Read를 방지합니다. **Next-Key Lock**(레코드 락 + 갭 락)으로 범위 내 새 row의 INSERT 자체를 막습니다.

```sql
-- 트랜잭션 A
BEGIN;
SELECT * FROM product WHERE category = 'electronics' FOR UPDATE;
-- 이 범위에 대해 갭 락 설정

-- 트랜잭션 B
INSERT INTO product (name, category) VALUES ('New Product', 'electronics');
-- 대기 (A가 COMMIT할 때까지)
```

### SERIALIZABLE

가장 높은 격리 수준입니다. 트랜잭션을 순차 실행하는 것처럼 동작합니다.

```java
@Transactional(isolation = Isolation.SERIALIZABLE)
public Product getProduct(Long id) {
    // SELECT에도 락이 걸림
    return productRepository.findById(id);
}
```

모든 SELECT가 `SELECT ... FOR SHARE`처럼 동작합니다. 읽기에도 락이 걸려서 다른 트랜잭션이 수정하려면 기다려야 합니다.

동시성이 크게 떨어지고 데드락 가능성도 높아집니다. 정합성이 극도로 중요한 경우가 아니면 쓸 일이 없습니다.

### 격리 수준별 문제 정리

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read |
|----------|------------|---------------------|--------------|
| READ UNCOMMITTED | O | O | O |
| READ COMMITTED | X | O | O |
| REPEATABLE READ | X | X | O (InnoDB는 X) |
| SERIALIZABLE | X | X | X |

MySQL InnoDB는 REPEATABLE READ에서 Gap Lock으로 Phantom Read까지 방지합니다.

## 실무 예시

**예시 1: 재고 동시성 문제**

```java
// 문제 코드
@Transactional
public void purchase(Long productId, int quantity) {
    Product product = productRepository.findById(productId);
    if (product.getStock() < quantity) {
        throw new RuntimeException("재고 부족");
    }
    product.decreaseStock(quantity);  // stock = stock - quantity
}
```

READ COMMITTED에서 두 트랜잭션이 동시에 재고 100을 읽고, 각각 50씩 차감하면 최종 재고가 0이 아니라 50이 되는 문제가 발생합니다.

해결 방법 1: 비관적 락(Pessimistic Lock)

```java
@Transactional
public void purchase(Long productId, int quantity) {
    Product product = productRepository.findByIdWithLock(productId);
    // SELECT ... FOR UPDATE
    // 다른 트랜잭션은 대기

    if (product.getStock() < quantity) {
        throw new RuntimeException("재고 부족");
    }
    product.decreaseStock(quantity);
}
```

해결 방법 2: 낙관적 락(Optimistic Lock)

```java
@Entity
public class Product {
    @Version
    private Long version;  // JPA가 자동 관리
}

// 충돌 시 재시도
@Transactional
public void purchase(Long productId, int quantity) {
    try {
        Product product = productRepository.findById(productId);
        product.decreaseStock(quantity);
    } catch (OptimisticLockException e) {
        // 재시도 로직
    }
}
```

**예시 2: 데드락**

```
트랜잭션 A: product 1 잠금 → product 2 잠금 시도
트랜잭션 B: product 2 잠금 → product 1 잠금 시도
→ 서로 기다림 (Deadlock)
```

```sql
-- MySQL 데드락 확인
SHOW ENGINE INNODB STATUS;

-- 데드락 발생 예시
ERROR 1213 (40001): Deadlock found when trying to get lock
```

해결 방법: 락 순서를 일관되게 유지. Product ID 순서대로 락을 획득.

**예시 3: 긴 트랜잭션**

```java
@Transactional
public void processOrder(Order order) {
    orderRepository.save(order);

    // 외부 API 호출 (3초 소요)
    paymentGateway.pay(order);  // 이 동안 DB 락 유지!

    emailService.send(order);   // 이메일 발송 (1초)
}
```

5초 동안 트랜잭션이 유지되면서 DB 커넥션과 락을 잡고 있습니다. 다른 요청들이 대기하게 됩니다.

해결 방법: 트랜잭션을 최소화.

```java
@Transactional
public void saveOrder(Order order) {
    orderRepository.save(order);  // DB 작업만
}

public void processOrder(Order order) {
    saveOrder(order);             // 트랜잭션 짧게
    paymentGateway.pay(order);    // 트랜잭션 밖에서 실행
    emailService.send(order);
}
```

## 고급 트랜잭션 메커니즘

기본 격리 수준 외에도 복잡한 시나리오를 처리하는 다양한 메커니즘이 있습니다.

### Savepoint (부분 롤백)

**특징:**
- 트랜잭션 중간에 체크포인트 생성
- 전체가 아닌 특정 지점까지만 롤백 가능
- 복잡한 트랜잭션에서 부분 실패 처리

```sql
-- MySQL
BEGIN;

INSERT INTO orders (user_id, amount) VALUES (1, 10000);
SAVEPOINT sp1;

INSERT INTO order_items (order_id, product_id) VALUES (100, 1);
SAVEPOINT sp2;

INSERT INTO payment (order_id, amount) VALUES (100, 10000);
-- payment 실패 시

ROLLBACK TO SAVEPOINT sp2;  -- payment만 취소, order와 order_items는 유지
-- 또는
ROLLBACK TO SAVEPOINT sp1;  -- order_items, payment 취소, order만 유지

COMMIT;
```

```java
// Spring에서 Savepoint 사용
@Transactional
public void createOrderWithSavepoint(Order order) {
    orderRepository.save(order);

    Object savepoint = TransactionAspectSupport.currentTransactionStatus()
        .createSavepoint();

    try {
        paymentService.processPayment(order);
    } catch (PaymentException e) {
        // 결제 실패 시 결제만 롤백
        TransactionAspectSupport.currentTransactionStatus()
            .rollbackToSavepoint(savepoint);
        order.setStatus(OrderStatus.PAYMENT_PENDING);
    }
}
```

**트레이드오프:**
- **장점**: 부분 실패 처리, 복잡한 로직 관리 용이
- **단점**: 코드 복잡도 증가, Savepoint 관리 오버헤드

### Two-Phase Locking (2PL)

**특징:**
- 락 획득 단계(Growing Phase)와 락 해제 단계(Shrinking Phase) 분리
- SERIALIZABLE 격리 수준의 구현 방식
- 데드락 가능성 존재

```
Growing Phase (락 획득만 가능):
  트랜잭션 시작 → 필요한 데이터에 락 획득 → 모든 락 획득 완료

Shrinking Phase (락 해제만 가능):
  첫 번째 락 해제 → 나머지 락 순차 해제 → 트랜잭션 종료
```

**Strict 2PL** (실제 DB가 사용):
- 모든 락을 COMMIT/ROLLBACK 시점까지 유지
- 중간에 락 해제 금지

```java
// Strict 2PL 예시 (개념)
BEGIN;
  SELECT ... FOR UPDATE;  -- 락 획득
  UPDATE ...;             -- 락 유지
  INSERT ...;             -- 락 유지
  // 모든 락을 계속 유지
COMMIT;                    -- 이 시점에 모든 락 해제
```

**트레이드오프:**
- **장점**: SERIALIZABLE 보장, 일관성 유지
- **단점**: 동시성 저하, 데드락 가능성, 락 대기 시간 증가

### MVCC (Multi-Version Concurrency Control) 상세

InnoDB의 REPEATABLE READ 구현 원리입니다.

```
실제 데이터:
  id | name  | version | trx_id
  ───────────────────────────────
  1  | Alice | v3      | 103

Undo Log 버전 체인:
  v3 (trx_id=103): Alice
   ↑
  v2 (trx_id=102): Bob
   ↑
  v1 (trx_id=101): Charlie
```

```java
// 트랜잭션 T1 (trx_id=100, 시작 시점)
@Transactional
public void readData() {
    // T1의 Read View: 100 이전 버전만 보임
    User user = userRepository.findById(1);  // "Charlie" (v1)

    // 다른 트랜잭션들이 v2, v3 생성

    User userAgain = userRepository.findById(1);  // 여전히 "Charlie" (v1)
    // → 일관된 스냅샷
}

// 트랜잭션 T2 (trx_id=104, 나중 시작)
@Transactional
public void readDataLater() {
    // T2의 Read View: 104 이전 버전 보임
    User user = userRepository.findById(1);  // "Alice" (v3)
}
```

**Read View 생성 규칙:**
- 트랜잭션 시작 시점에 활성 트랜잭션 ID 목록 스냅샷
- 이후 Undo Log에서 적절한 버전 선택

**트레이드오프:**
- **장점**: 읽기와 쓰기가 서로 블록하지 않음, 높은 동시성
- **단점**: Undo Log 관리 오버헤드, 오래된 트랜잭션 시 Undo Log 비대화

### 락 전략 비교

| 락 타입 | 범위 | 동시성 | 사용 사례 |
|---------|------|--------|----------|
| **Row Lock** | 행 단위 | 높음 | 일반적인 UPDATE, DELETE |
| **Gap Lock** | 레코드 사이 간격 | 중간 | Phantom Read 방지 |
| **Next-Key Lock** | Row + Gap | 중간 | REPEATABLE READ 범위 검색 |
| **Table Lock** | 테이블 전체 | 낮음 | DDL, 대량 데이터 변경 |
| **Intention Lock** | 계층적 락 | - | Table Lock과 Row Lock 조정 |

```sql
-- Row Lock
SELECT * FROM product WHERE id = 1 FOR UPDATE;  -- 1번 행만 잠금

-- Gap Lock (10과 20 사이)
SELECT * FROM product WHERE id BETWEEN 10 AND 20 FOR UPDATE;

-- Table Lock
LOCK TABLES product WRITE;  -- 전체 테이블 잠금
```

## 분산 환경의 트랜잭션

단일 DB를 넘어서는 분산 시스템에서의 트랜잭션 관리입니다.

### 1단계: Two-Phase Commit (2PC)

**특징:**
- 분산 트랜잭션의 ACID 보장
- Coordinator가 참여자들의 Prepare → Commit 조정
- 동기 방식, 강한 일관성

```java
// 2PC 개념 (Java Transaction API)
@Transactional
public void distributeOrder(Order order) {
    // Phase 1: Prepare
    boolean db1Ready = orderDb.prepare(order);
    boolean db2Ready = inventoryDb.prepare(order);
    boolean db3Ready = paymentDb.prepare(order);

    // Phase 2: Commit or Rollback
    if (db1Ready && db2Ready && db3Ready) {
        orderDb.commit();
        inventoryDb.commit();
        paymentDb.commit();
    } else {
        orderDb.rollback();
        inventoryDb.rollback();
        paymentDb.rollback();
    }
}
```

**동작 흐름:**
```
Coordinator               DB1         DB2         DB3
    |                       |           |           |
    |------ Prepare ------->|           |           |
    |                       |           |           |
    |------ Prepare ---------------------->         |
    |                       |           |           |
    |------ Prepare ----------------------------------->
    |                       |           |           |
    |<----- Vote Yes -------|           |           |
    |<----- Vote Yes ----------------------          |
    |<----- Vote Yes -----------------------------------|
    |                       |           |           |
    |------ Commit -------->|           |           |
    |------ Commit ---------------------->           |
    |------ Commit ----------------------------------->
```

**트레이드오프:**
- **장점**: 강한 일관성, ACID 보장
- **단점**:
  - Coordinator 단일 장애점
  - 블로킹 프로토콜 (참여자 대기)
  - 네트워크 지연 시 성능 저하
  - 확장성 제한

### 2단계: Saga Pattern

**특징:**
- 각 단계마다 로컬 트랜잭션 실행
- 실패 시 보상 트랜잭션(Compensation)으로 롤백
- 비동기 방식, 최종 일관성

```java
// Orchestration 방식
@Service
public class OrderSagaOrchestrator {
    public void createOrder(Order order) {
        try {
            // Step 1: 주문 생성
            orderService.createOrder(order);

            // Step 2: 재고 차감
            inventoryService.decreaseStock(order);

            // Step 3: 결제 처리
            paymentService.processPayment(order);

        } catch (InventoryException e) {
            // 보상: 주문 취소
            orderService.cancelOrder(order);

        } catch (PaymentException e) {
            // 보상: 재고 복구 → 주문 취소
            inventoryService.increaseStock(order);
            orderService.cancelOrder(order);
        }
    }
}
```

```java
// Choreography 방식 (이벤트 기반)
@Service
public class OrderService {
    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);
        eventPublisher.publish(new OrderCreatedEvent(order));
    }

    @EventListener
    public void onPaymentFailed(PaymentFailedEvent event) {
        // 보상 트랜잭션
        Order order = orderRepository.findById(event.getOrderId());
        order.cancel();
        orderRepository.save(order);
        eventPublisher.publish(new OrderCancelledEvent(order));
    }
}
```

**Saga vs 2PC 비교:**

| 구분 | Saga | 2PC |
|------|------|-----|
| **일관성** | 최종 일관성 | 강한 일관성 |
| **성능** | 높음 (비동기) | 낮음 (동기) |
| **복잡도** | 보상 로직 필요 | 상대적으로 단순 |
| **확장성** | 높음 | 낮음 |
| **실패 처리** | 보상 트랜잭션 | 자동 롤백 |

**트레이드오프:**
- **장점**: 높은 확장성, 서비스 독립성, 비동기 처리
- **단점**:
  - 보상 로직 구현 복잡
  - 일시적 불일치 상태 허용
  - 모니터링 어려움
  - 보상 실패 시 수동 개입 필요

### 3단계: Event Sourcing

**특징:**
- 상태 변경을 이벤트로 저장
- 이벤트 재생으로 현재 상태 복원
- 완벽한 감사 로그

```java
// 상태 저장 방식 (기존)
@Entity
public class Account {
    private Long id;
    private BigDecimal balance;  // 현재 잔액만 저장
}

// Event Sourcing 방식
@Entity
public class AccountEvent {
    private Long id;
    private Long accountId;
    private String eventType;  // CREATED, DEPOSITED, WITHDRAWN
    private BigDecimal amount;
    private LocalDateTime occurredAt;
}

@Service
public class AccountService {
    // 이벤트 추가만 (UPDATE 없음)
    public void deposit(Long accountId, BigDecimal amount) {
        AccountEvent event = new AccountEvent(
            accountId,
            "DEPOSITED",
            amount,
            LocalDateTime.now()
        );
        eventRepository.save(event);
    }

    // 이벤트 재생으로 현재 상태 계산
    public BigDecimal getBalance(Long accountId) {
        List<AccountEvent> events = eventRepository.findByAccountId(accountId);
        return events.stream()
            .map(this::applyEvent)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal applyEvent(AccountEvent event) {
        return switch (event.getEventType()) {
            case "DEPOSITED" -> event.getAmount();
            case "WITHDRAWN" -> event.getAmount().negate();
            default -> BigDecimal.ZERO;
        };
    }
}
```

**트레이드오프:**
- **장점**:
  - 완벽한 감사 로그
  - 시간 여행 가능 (특정 시점 상태 복원)
  - 이벤트 재생으로 버그 재현
  - 삭제 없음 (이벤트만 추가)
- **단점**:
  - 조회 성능 저하 (이벤트 재생 비용)
  - 저장 공간 증가
  - 스키마 변경 어려움
  - 스냅샷 관리 필요

### 4단계: CQRS (Command Query Responsibility Segregation)

**특징:**
- 명령(쓰기) 모델과 조회(읽기) 모델 분리
- 각 모델을 독립적으로 최적화
- Event Sourcing과 자주 함께 사용

```java
// Command Model (쓰기)
@Service
public class OrderCommandService {
    @Transactional
    public void createOrder(CreateOrderCommand cmd) {
        Order order = new Order(cmd);
        orderRepository.save(order);

        // 이벤트 발행
        eventPublisher.publish(new OrderCreatedEvent(order));
    }
}

// Query Model (읽기)
@Service
public class OrderQueryService {
    private final OrderReadRepository readRepo;  // 비정규화된 읽기 전용 DB

    public OrderSummary getOrderSummary(Long orderId) {
        // 조회 최적화된 모델
        return readRepo.findSummaryById(orderId);
    }

    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // 읽기 모델 업데이트 (비동기)
        OrderSummary summary = createSummary(event);
        readRepo.save(summary);
    }
}
```

**구조:**
```
사용자 요청
    │
    ├─ 명령 (쓰기) ─→ Command Model ─→ Write DB ─→ Event
    │                                                 ↓
    └─ 조회 (읽기) ─→ Query Model ←───────────── Event Handler
                           ↓
                      Read DB (비정규화, 캐시)
```

**트레이드오프:**
- **장점**:
  - 읽기/쓰기 독립 확장
  - 복잡한 조회 쿼리 최적화
  - 읽기 모델 다중화 (MySQL + Elasticsearch)
- **단점**:
  - 아키텍처 복잡도 증가
  - 읽기 모델 동기화 지연
  - 데이터 일관성 복잡
  - 운영 비용 증가

### 분산 트랜잭션 선택 가이드

| 요구사항 | 권장 패턴 | 이유 |
|----------|----------|------|
| **강한 일관성 필수** | 2PC | ACID 보장 |
| **높은 처리량** | Saga | 비동기, 서비스 독립성 |
| **감사 로그 중요** | Event Sourcing | 모든 변경 이력 보존 |
| **복잡한 조회** | CQRS | 읽기 모델 최적화 |
| **마이크로서비스** | Saga + CQRS | 확장성, 독립성 |

### 진화 경로

```
1단계: 단일 DB + ACID
   ↓ (서비스 분리)
2단계: 2PC (분산 트랜잭션)
   ↓ (성능 이슈)
3단계: Saga Pattern
   ↓ (복잡한 조회 필요)
4단계: CQRS 추가
   ↓ (감사 로그 필요)
5단계: Event Sourcing
```

## 정리

**단일 DB 트랜잭션:**
- 트랜잭션은 여러 작업을 하나로 묶어 원자성을 보장합니다
- ACID는 원자성, 일관성, 격리성, 지속성을 의미합니다
- InnoDB는 Undo Log(롤백), Redo Log(복구), MVCC(격리)로 구현합니다
- 격리 수준은 동시성과 정합성 사이의 트레이드오프입니다
- MySQL 기본값인 REPEATABLE READ면 대부분 상황에서 충분합니다
- 재고 같은 동시성이 중요한 데이터는 비관적 락이나 낙관적 락을 사용합니다
- 트랜잭션은 가능한 짧게 유지하고, 외부 API 호출은 트랜잭션 밖에서 합니다
- 데드락 발생 시 락 순서를 일관되게 유지하세요

**분산 트랜잭션:**
- 강한 일관성이 필요하면 2PC, 높은 확장성이 필요하면 Saga
- Event Sourcing은 감사 로그와 시간 여행이 필요할 때
- CQRS는 복잡한 조회와 높은 읽기 처리량이 필요할 때
- 분산 환경에서는 최종 일관성을 허용하는 것이 일반적
