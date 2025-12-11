---
title: 'DB 트랜잭션 기본 - ACID와 격리 수준'
description: '트랜잭션의 본질과 격리 수준별 동작 차이를 정리했습니다'
pubDate: 'Jan 01 2025'
tags: ['Database', 'MySQL']
series: 'database-fundamentals'
seriesOrder: 1
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

## 정리

- 트랜잭션은 여러 작업을 하나로 묶어 원자성을 보장합니다
- ACID는 원자성, 일관성, 격리성, 지속성을 의미합니다
- InnoDB는 Undo Log(롤백), Redo Log(복구), MVCC(격리)로 구현합니다
- 격리 수준은 동시성과 정합성 사이의 트레이드오프입니다
- MySQL 기본값인 REPEATABLE READ면 대부분 상황에서 충분합니다
- 재고 같은 동시성이 중요한 데이터는 비관적 락이나 낙관적 락을 사용합니다
- 트랜잭션은 가능한 짧게 유지하고, 외부 API 호출은 트랜잭션 밖에서 합니다
- 데드락 발생 시 락 순서를 일관되게 유지하세요
