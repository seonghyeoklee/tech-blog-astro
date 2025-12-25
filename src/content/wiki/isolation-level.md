---
term: '격리 수준'
aliases: ['Isolation Level', '트랜잭션 격리 수준']
category: 'database'
summary: '동시 실행 트랜잭션 간 데이터 가시성을 결정하는 설정'
related: ['acid', 'transaction', 'dirty-read', 'non-repeatable-read', 'phantom-read', 'mvcc']
---

격리 수준(Isolation Level)은 동시에 실행되는 트랜잭션들이 서로의 변경 사항을 어느 정도까지 볼 수 있는지 정의합니다.

## 격리 수준 종류

낮은 순서대로:

1. **READ UNCOMMITTED**: 커밋 안 된 데이터도 읽음 (Dirty Read 발생)
2. **READ COMMITTED**: 커밋된 데이터만 읽음 (Non-Repeatable Read 발생)
3. **REPEATABLE READ**: 트랜잭션 시작 시점 스냅샷 유지 (MySQL 기본값)
4. **SERIALIZABLE**: 완전한 격리, 순차 실행처럼 동작

## 격리 수준과 문제

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read |
|----------|------------|---------------------|--------------|
| READ UNCOMMITTED | O | O | O |
| READ COMMITTED | X | O | O |
| REPEATABLE READ | X | X | O (InnoDB는 X) |
| SERIALIZABLE | X | X | X |

## 관련 글

- [DB 트랜잭션 기본 - ACID와 격리 수준](/blog/db-transaction-acid-isolation)
