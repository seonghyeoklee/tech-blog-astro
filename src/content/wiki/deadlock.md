---
term: 'Deadlock'
aliases: ['데드락', '교착 상태']
category: 'database'
summary: '두 개 이상의 트랜잭션이 서로의 락을 기다리며 영원히 진행되지 않는 상태'
related: ['transaction', 'gap-lock', 'pessimistic-lock', 'race-condition']
---

데드락은 두 트랜잭션이 서로 상대방이 가진 락을 기다리면서 무한 대기하는 상태입니다.

## 발생 예시

```
트랜잭션 A: row 1 락 → row 2 락 대기
트랜잭션 B: row 2 락 → row 1 락 대기
→ 서로 무한 대기
```

## MySQL 감지

InnoDB는 자동으로 감지하고 한 트랜잭션을 롤백시킵니다.

```sql
SHOW ENGINE INNODB STATUS;  -- 데드락 로그 확인
```

## 예방 방법

1. 락 순서 통일 (항상 ID 오름차순으로 락)
2. 트랜잭션 범위 최소화
3. 락 타임아웃 설정

## 관련 글

- [데이터베이스 락과 동시성 제어](/blog/db-lock-concurrency)
