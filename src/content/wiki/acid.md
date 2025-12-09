---
term: 'ACID'
aliases: ['ACID 속성', 'ACID 원칙']
category: 'database'
summary: '트랜잭션이 보장해야 하는 4가지 속성 - 원자성, 일관성, 격리성, 지속성'
---

ACID는 데이터베이스 트랜잭션이 안전하게 수행되기 위해 보장해야 하는 4가지 속성입니다.

## 구성 요소

- **Atomicity (원자성)**: 트랜잭션의 모든 연산이 전부 성공하거나 전부 실패
- **Consistency (일관성)**: 트랜잭션 전후로 데이터 무결성 유지
- **Isolation (격리성)**: 동시 실행되는 트랜잭션이 서로 영향을 주지 않음
- **Durability (지속성)**: 커밋된 데이터는 시스템 장애에도 유지

## 관련 글

- [DB 트랜잭션 기본 - ACID와 격리 수준](/blog/db-transaction-acid-isolation)
