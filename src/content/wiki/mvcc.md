---
term: 'MVCC'
aliases: ['Multi-Version Concurrency Control', '다중 버전 동시성 제어']
category: 'database'
summary: '락 없이 읽기 일관성을 제공하는 동시성 제어 기법'
---

MVCC(Multi-Version Concurrency Control)는 데이터를 여러 버전으로 관리하여 읽기 작업과 쓰기 작업이 서로 차단하지 않도록 하는 기법입니다.

## 동작 방식

데이터를 변경할 때 기존 버전을 Undo Log에 보관합니다. 각 트랜잭션은 자신의 시작 시점에 맞는 버전을 읽어서 일관된 스냅샷을 유지합니다.

## 장점

- 읽기 작업이 쓰기 작업을 차단하지 않음
- 높은 동시성 처리 가능

## 사용하는 DBMS

- MySQL InnoDB
- PostgreSQL
- Oracle

## 관련 글

- [DB 트랜잭션 기본 - ACID와 격리 수준](/blog/db-transaction-acid-isolation)
