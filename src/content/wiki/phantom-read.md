---
term: 'Phantom Read'
aliases: ['팬텀 리드', '유령 읽기']
category: 'database'
summary: '같은 조건으로 조회했을 때 이전에 없던 새로운 행이 나타나는 현상'
related: [non-repeatable-read, isolation-level, gap-lock, mvcc]
---

Phantom Read는 한 트랜잭션 내에서 같은 조건으로 데이터를 조회했을 때, 다른 트랜잭션이 새로운 행을 INSERT하여 이전에 없던 행이 나타나는 현상입니다.

## 예시

```sql
-- 트랜잭션 A
BEGIN;
SELECT COUNT(*) FROM product WHERE category = 'food';  -- 10개

-- 트랜잭션 B
BEGIN;
INSERT INTO product (name, category) VALUES ('새상품', 'food');
COMMIT;

-- 트랜잭션 A (계속)
SELECT COUNT(*) FROM product WHERE category = 'food';  -- 11개 (유령 행 출현!)
COMMIT;
```

## Non-Repeatable Read와의 차이

- **Non-Repeatable Read**: 기존 행의 값이 변경됨
- **Phantom Read**: 새로운 행이 추가되거나 삭제됨

## MySQL InnoDB의 특징

MySQL InnoDB는 REPEATABLE READ 격리 수준에서도 Next-Key Lock(레코드 락 + Gap Lock)을 사용하여 Phantom Read를 방지합니다. 이는 MySQL만의 특징입니다.
