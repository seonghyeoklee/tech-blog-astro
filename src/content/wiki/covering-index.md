---
term: 'Covering Index'
aliases: ['커버링 인덱스']
category: 'database'
summary: '쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근이 불필요한 인덱스'
---

커버링 인덱스는 SELECT 절의 모든 컬럼이 인덱스에 포함되어 있어, 테이블을 읽지 않고 인덱스만으로 쿼리를 처리하는 경우입니다.

## 예시

```sql
-- 인덱스: (user_id, created_at, amount)
SELECT user_id, created_at, amount  -- 커버링 인덱스 O
FROM orders WHERE user_id = 1;

SELECT user_id, status  -- 커버링 인덱스 X (status 없음)
FROM orders WHERE user_id = 1;
```

## EXPLAIN 확인

Extra 컬럼에 `Using index`가 표시되면 커버링 인덱스입니다.

## 관련 글

- [인덱스 기초 - 왜 빠르고 언제 느린가](/blog/db-index-fundamentals)
