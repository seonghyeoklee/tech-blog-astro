---
term: 'Non-Repeatable Read'
aliases: ['반복 불가능한 읽기', 'Fuzzy Read']
category: 'database'
summary: '같은 트랜잭션 내에서 같은 데이터를 두 번 읽었을 때 결과가 다른 현상'
---

Non-Repeatable Read는 한 트랜잭션 내에서 같은 데이터를 두 번 읽었을 때, 그 사이에 다른 트랜잭션이 해당 데이터를 수정하여 결과가 달라지는 현상입니다.

## 예시

```sql
-- 트랜잭션 A
BEGIN;
SELECT price FROM product WHERE id = 1;  -- 1000

-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;
COMMIT;

-- 트랜잭션 A (계속)
SELECT price FROM product WHERE id = 1;  -- 2000 (값이 바뀜!)
COMMIT;
```

## 발생 조건

READ COMMITTED 격리 수준에서 발생합니다. 커밋된 데이터는 읽을 수 있기 때문입니다.

## 방지 방법

REPEATABLE READ 이상의 격리 수준을 사용하면 방지됩니다. 트랜잭션 시작 시점의 스냅샷을 계속 읽기 때문입니다.
