---
term: 'Gap Lock'
aliases: ['갭 락', 'Next-Key Lock']
category: 'database'
summary: '인덱스 레코드 사이의 간격을 잠그는 InnoDB의 락 메커니즘'
---

Gap Lock은 MySQL InnoDB에서 인덱스 레코드 사이의 "간격"을 잠그는 락입니다. 다른 트랜잭션이 해당 간격에 새로운 행을 INSERT하는 것을 방지합니다.

## Next-Key Lock

Next-Key Lock = Record Lock + Gap Lock

레코드 자체와 그 앞의 간격을 함께 잠급니다.

## 용도

- **Phantom Read 방지**: REPEATABLE READ에서 범위 검색 시 새 행 삽입 차단
- **유니크 제약 보장**: 중복 값 삽입 방지

## 예시

```sql
-- id가 10, 20, 30인 레코드가 있을 때
SELECT * FROM table WHERE id BETWEEN 15 AND 25 FOR UPDATE;
```

이 쿼리는 10~20, 20~30 간격에 Gap Lock을 걸어 새로운 행(예: id=17) 삽입을 막습니다.

## 주의점

Gap Lock은 동시성을 떨어뜨리고 데드락을 유발할 수 있습니다. 범위 쿼리보다 정확한 조건을 사용하면 락 범위를 줄일 수 있습니다.
