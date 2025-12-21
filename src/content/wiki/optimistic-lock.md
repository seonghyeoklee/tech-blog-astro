---
term: 'Optimistic Lock'
aliases: ['낙관적 락', '낙관적 잠금']
category: 'database'
summary: '충돌이 적다고 가정하고 수정 시점에 버전을 체크하는 동시성 제어 방식'
---

낙관적 락은 "충돌이 거의 없을 것"이라고 가정하고, 수정 시점에 버전 충돌을 감지하는 방식입니다.

## JPA @Version

```java
@Entity
public class Product {
    @Version
    private Long version;
}
```

## 동작 원리

```sql
UPDATE products SET stock = 9, version = 2
WHERE id = 1 AND version = 1;
-- 영향받은 행이 0이면 충돌 발생
```

## 특징

- 충돌이 적은 환경에 적합
- 락 대기 없이 빠름
- 충돌 시 재시도 로직 필요

## 관련 글

- [데이터베이스 락과 동시성 제어](/blog/db-lock-concurrency)
