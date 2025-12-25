---
term: 'Pessimistic Lock'
aliases: ['비관적 락', '비관적 잠금']
category: 'database'
summary: '충돌을 예상하고 데이터 조회 시점에 미리 락을 거는 동시성 제어 방식'
related: [optimistic-lock, transaction, deadlock, lost-update]
---

비관적 락은 "충돌이 발생할 것"이라고 가정하고, 데이터를 읽는 시점에 락을 거는 방식입니다.

## SQL

```sql
SELECT * FROM products WHERE id = 1 FOR UPDATE;
```

## JPA

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<Product> findByIdWithLock(Long id);
```

## 특징

- 충돌이 잦은 환경에 적합
- 락 대기 시간 발생
- 데드락 주의 필요

## 관련 글

- [데이터베이스 락과 동시성 제어](/blog/db-lock-concurrency)
