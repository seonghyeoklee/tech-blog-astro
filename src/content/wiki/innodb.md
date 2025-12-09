---
term: 'InnoDB'
aliases: ['MySQL InnoDB']
category: 'database'
summary: 'MySQL의 기본 스토리지 엔진으로 트랜잭션과 MVCC를 지원'
---

InnoDB는 MySQL의 기본 스토리지 엔진입니다. 트랜잭션, 외래 키, MVCC를 지원하며 ACID를 완벽히 보장합니다.

## 주요 특징

- **트랜잭션 지원**: ACID 속성 보장
- **MVCC**: 락 없이 읽기 일관성 제공
- **Row-level Locking**: 행 단위 잠금으로 높은 동시성
- **Foreign Key**: 외래 키 제약조건 지원
- **Crash Recovery**: Redo Log를 통한 장애 복구

## 로그 시스템

- **Undo Log**: 롤백과 MVCC 읽기용
- **Redo Log**: 장애 복구용 (WAL 방식)

## 기본 격리 수준

REPEATABLE READ가 기본값이며, Gap Lock으로 Phantom Read까지 방지합니다.
