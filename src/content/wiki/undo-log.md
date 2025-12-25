---
term: 'Undo Log'
aliases: ['언두 로그']
category: 'database'
summary: '롤백과 MVCC 읽기를 위해 변경 전 데이터를 저장하는 로그'
related: [redo-log, transaction, mvcc, acid]
---

Undo Log는 트랜잭션이 데이터를 변경하기 전의 원본 값을 저장하는 로그입니다.

## 역할

1. **롤백 지원**: 트랜잭션이 ROLLBACK되면 Undo Log를 읽어 원래 상태로 복구
2. **MVCC 구현**: 다른 트랜잭션이 변경 전 데이터를 읽을 수 있도록 제공

## Redo Log와의 차이

- **Undo Log**: 롤백용 (원자성 보장)
- **Redo Log**: 복구용 (지속성 보장)

## 관련 글

- [DB 트랜잭션 기본 - ACID와 격리 수준](/blog/db-transaction-acid-isolation)
