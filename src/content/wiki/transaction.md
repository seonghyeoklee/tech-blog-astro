---
term: '트랜잭션'
aliases: ['Transaction', 'DB 트랜잭션']
category: 'database'
summary: '여러 작업을 하나의 논리적 단위로 묶어 원자성을 보장하는 작업 단위'
---

트랜잭션(Transaction)은 데이터베이스에서 하나의 논리적 작업 단위를 의미합니다. 여러 개의 SQL 문을 하나로 묶어서 전부 성공하거나 전부 실패하도록 보장합니다.

## 기본 사용법

```sql
BEGIN;
-- 여러 SQL 문
COMMIT;  -- 또는 ROLLBACK;
```

## 특징

- **BEGIN**: 트랜잭션 시작
- **COMMIT**: 변경사항 확정
- **ROLLBACK**: 변경사항 취소, 트랜잭션 시작 전 상태로 복구

## ACID 속성

트랜잭션은 ACID 속성을 보장합니다.
- Atomicity (원자성)
- Consistency (일관성)
- Isolation (격리성)
- Durability (지속성)
