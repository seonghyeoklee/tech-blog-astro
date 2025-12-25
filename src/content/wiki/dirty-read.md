---
term: 'Dirty Read'
aliases: ['더티 리드']
category: 'database'
summary: '커밋되지 않은 다른 트랜잭션의 데이터를 읽는 현상'
related: ['isolation-level', 'non-repeatable-read', 'phantom-read']
---

Dirty Read는 한 트랜잭션이 아직 커밋되지 않은 다른 트랜잭션의 변경 데이터를 읽는 현상입니다.

## 문제점

```sql
-- 트랜잭션 B
BEGIN;
UPDATE product SET price = 2000 WHERE id = 1;
-- 아직 커밋 안 함

-- 트랜잭션 A (READ UNCOMMITTED)
SELECT price FROM product WHERE id = 1;  -- 2000 읽음

-- 트랜잭션 B
ROLLBACK;  -- 취소!
```

트랜잭션 A가 읽은 2000은 실제로 존재한 적 없는 값이 됩니다. 이 값으로 비즈니스 로직을 수행했다면 데이터 정합성 문제가 발생합니다.

## 방지 방법

READ COMMITTED 이상의 격리 수준을 사용하면 Dirty Read를 방지할 수 있습니다.
