---
title: 'DB 트랜잭션 기본 - ACID와 격리 수준'
description: '트랜잭션의 본질과 격리 수준별 동작 차이를 정리했습니다'
pubDate: 'Dec 15 2024'
tags: ['Database', 'MySQL']
---

@Transactional을 매일 쓰면서도, 정작 DB 트랜잭션이 어떻게 동작하는지 제대로 정리한 적이 없었습니다. Spring은 트랜잭션을 "관리"할 뿐이고, 실제 동작은 DB가 처리합니다. isolation 옵션을 바꿔본 적은 있는데, 왜 그래야 하는지 명확히 설명하지 못했습니다. 그래서 MySQL InnoDB 기준으로 트랜잭션의 기본 개념을 정리했습니다.

## 트랜잭션이 필요한 이유

계좌 이체를 생각해봅니다. A 계좌에서 10만원을 빼고, B 계좌에 10만원을 넣는 작업입니다.

```sql
UPDATE account SET balance = balance - 100000 WHERE id = 'A';
UPDATE account SET balance = balance + 100000 WHERE id = 'B';
```

두 쿼리 사이에 서버가 죽으면 어떻게 될까요? A 계좌에서 10만원이 빠졌는데, B 계좌에는 안 들어간 상태가 됩니다. 돈이 공중에서 사라진 겁니다. 실제로 이런 상황이 발생하면 큰일납니다. 트랜잭션은 이 두 작업을 하나로 묶어서, 둘 다 성공하거나 둘 다 실패하게 만듭니다. 중간 상태는 존재하지 않습니다.

```sql
BEGIN;
UPDATE account SET balance = balance - 100000 WHERE id = 'A';
UPDATE account SET balance = balance + 100000 WHERE id = 'B';
COMMIT;
```

BEGIN과 COMMIT 사이의 모든 작업이 하나의 트랜잭션입니다. 중간에 문제가 생기면 ROLLBACK으로 처음 상태로 돌아갑니다.

## ACID 속성

트랜잭션이 보장하는 4가지 속성입니다. 면접에서 자주 나오는 질문인데, 암기보다 각 속성이 왜 필요한지를 이해하는 게 중요합니다.

### Atomicity (원자성)

트랜잭션은 전부 성공하거나 전부 실패합니다. 부분 성공은 없습니다. 위의 계좌 이체에서 A에서 돈이 빠졌으면 B에도 반드시 들어가야 합니다.

DB는 이걸 어떻게 보장할까요? InnoDB는 **Undo Log**를 사용합니다. 데이터를 변경하기 전에 원래 값을 Undo Log에 기록해둡니다. 트랜잭션 중간에 문제가 생기거나 ROLLBACK을 호출하면, Undo Log를 읽어서 원래 상태로 되돌립니다.

```
1. Undo Log에 "A 계좌 잔액 = 1000000" 기록
2. A 계좌 잔액을 900000으로 변경
3. Undo Log에 "B 계좌 잔액 = 500000" 기록
4. B 계좌 잔액을 600000으로 변경
5. COMMIT → 완료 / ROLLBACK → Undo Log로 복구
```

### Consistency (일관성)

트랜잭션 전후로 데이터 무결성이 유지됩니다. DB에 정의된 제약조건을 위반하는 상태로는 커밋되지 않습니다.

```sql
BEGIN;
UPDATE account SET balance = balance - 2000000 WHERE id = 'A';  -- 잔액이 100만원인데 200만원 출금
COMMIT;
```

"잔액 >= 0" 제약이 있다면 이 트랜잭션은 실패합니다. 일관성은 DB 제약조건(FK, CHECK, UNIQUE 등)과 애플리케이션 로직이 함께 보장합니다. DB 혼자서 모든 비즈니스 규칙을 검증하진 못하기 때문에, 애플리케이션에서도 유효성 검사가 필요합니다.

### Isolation (격리성)

동시에 실행되는 트랜잭션들이 서로 영향을 주지 않습니다. A 트랜잭션이 데이터를 수정하는 중에 B 트랜잭션이 같은 데이터를 읽으면 어떤 값을 보여줘야 할까요? 수정 전 값? 수정 중인 값?

완벽한 격리는 성능을 심하게 떨어뜨립니다. 한 트랜잭션이 끝날 때까지 다른 트랜잭션이 기다려야 하기 때문입니다. 그래서 DB는 격리 수준이라는 옵션을 제공합니다. 상황에 따라 격리 정도를 조절할 수 있게 해뒀습니다.

### Durability (지속성)

커밋된 데이터는 시스템이 죽어도 살아있습니다. "커밋 완료"라고 응답했는데 데이터가 사라지면 안 됩니다.

InnoDB는 **Redo Log**로 이를 보장합니다. 변경 사항을 먼저 Redo Log에 기록하고(Write-Ahead Logging), 그 다음 실제 데이터 파일에 씁니다. 데이터 파일에 쓰기 전에 서버가 죽어도, 재시작 시 Redo Log를 읽어서 커밋된 내용을 복구합니다.

정리하면
- **Undo Log** - 롤백용 (원자성)
- **Redo Log** - 복구용 (지속성)

## 격리 수준

동시에 여러 트랜잭션이 같은 데이터에 접근하면 문제가 생깁니다.

```
시간    트랜잭션 A                    트랜잭션 B
────────────────────────────────────────────────────
 1      BEGIN
 2      SELECT price FROM product
        WHERE id = 1  → 1000
 3                                    BEGIN
 4                                    UPDATE product SET price = 2000 WHERE id = 1
 5                                    COMMIT
 6      SELECT price FROM product
        WHERE id = 1  → ???
 7      COMMIT
```

6번에서 A는 어떤 값을 봐야 할까요? B가 변경한 2000? 아니면 처음 읽었던 1000? 이걸 정하는 게 격리 수준입니다.

### READ UNCOMMITTED

가장 낮은 격리 수준입니다. 커밋 안 된 데이터도 읽습니다.

```sql
-- 트랜잭션 A
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT price FROM product WHERE id = 1;  -- 2000 (B가 아직 커밋 안 함)

-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;
-- 여기서 A가 읽음
ROLLBACK;  -- 취소됨
```

B가 ROLLBACK하면 A가 읽은 2000은 존재한 적 없는 값이 됩니다. 이게 **Dirty Read**입니다. 이 값으로 비즈니스 로직을 수행했다면 문제가 됩니다. 실무에서 쓸 일이 거의 없습니다.

### READ COMMITTED

커밋된 데이터만 읽습니다. Oracle, PostgreSQL의 기본값입니다.

```sql
-- 트랜잭션 A
BEGIN;
SELECT price FROM product WHERE id = 1;  -- 1000

-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;
COMMIT;

-- 트랜잭션 A (계속)
SELECT price FROM product WHERE id = 1;  -- 2000 (값이 바뀜)
COMMIT;
```

A 입장에서 같은 SELECT를 두 번 실행했는데 결과가 다릅니다. 이게 **Non-Repeatable Read**입니다. 읽기 일관성이 보장되지 않아서, 같은 데이터를 여러 번 읽는 로직에서 문제가 될 수 있습니다.

### REPEATABLE READ

트랜잭션 시작 시점의 스냅샷을 계속 봅니다. MySQL InnoDB의 기본값입니다.

InnoDB는 **MVCC(Multi-Version Concurrency Control)**로 구현합니다. 데이터를 변경할 때 기존 버전을 Undo Log에 보관하고, 각 트랜잭션은 자신의 시작 시점에 맞는 버전을 읽습니다.

```sql
-- 트랜잭션 A (먼저 시작)
BEGIN;
SELECT price FROM product WHERE id = 1;  -- 1000

-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;
COMMIT;

-- 트랜잭션 A (계속)
SELECT price FROM product WHERE id = 1;  -- 1000 (여전히)
COMMIT;
```

A는 자기가 시작한 시점의 데이터를 계속 봅니다. B가 중간에 값을 바꾸고 커밋해도 A에게는 보이지 않습니다.

그런데 **Phantom Read** 문제가 있습니다. 기존 row의 변경은 안 보이지만, 새로 INSERT된 row는 보일 수 있습니다.

```sql
-- 트랜잭션 A
BEGIN;
SELECT COUNT(*) FROM product WHERE category = 'food';  -- 10개

-- 트랜잭션 B
BEGIN;
INSERT INTO product (name, category) VALUES ('새상품', 'food');
COMMIT;

-- 트랜잭션 A (계속)
SELECT COUNT(*) FROM product WHERE category = 'food';  -- 11개? 10개?
COMMIT;
```

일반적인 REPEATABLE READ에서는 11개가 보일 수 있습니다. 그런데 **MySQL InnoDB는 REPEATABLE READ에서도 Phantom Read를 방지**합니다. Next-Key Lock(레코드 락 + 갭 락)으로 범위 내 새 row의 INSERT 자체를 막기 때문입니다. MySQL만의 특징입니다.

### SERIALIZABLE

가장 높은 격리 수준입니다. 트랜잭션을 순차 실행하는 것처럼 동작합니다.

```sql
-- 트랜잭션 A
BEGIN;
SELECT * FROM product WHERE id = 1;  -- 공유 락 획득

-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;  -- 대기 (A가 커밋할 때까지)
```

모든 SELECT가 `SELECT ... FOR SHARE`처럼 동작합니다. 읽기에도 락이 걸려서 다른 트랜잭션이 수정하려면 기다려야 합니다. 동시성이 크게 떨어지고 데드락 가능성도 높아집니다. 정합성이 극도로 중요한 경우가 아니면 쓸 일이 없습니다.

### 격리 수준별 문제 정리

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read |
|----------|------------|---------------------|--------------|
| READ UNCOMMITTED | O | O | O |
| READ COMMITTED | X | O | O |
| REPEATABLE READ | X | X | O (InnoDB는 X) |
| SERIALIZABLE | X | X | X |

MySQL InnoDB는 REPEATABLE READ에서 Gap Lock으로 Phantom Read까지 방지합니다. 굳이 SERIALIZABLE을 쓸 필요가 적습니다.

## 정리

- 트랜잭션은 여러 작업을 하나로 묶어 원자성을 보장합니다
- ACID는 원자성, 일관성, 격리성, 지속성을 의미합니다
- InnoDB는 Undo Log(롤백), Redo Log(복구), MVCC(격리)로 구현합니다
- 격리 수준은 동시성과 정합성 사이의 트레이드오프입니다
- MySQL 기본값인 REPEATABLE READ면 대부분 상황에서 충분합니다

다음 글에서는 Spring이 DB 트랜잭션을 어떻게 다루는지 정리하겠습니다.
