---
term: 'Redo Log'
aliases: ['리두 로그', 'WAL']
category: 'database'
summary: '커밋된 데이터의 지속성을 보장하기 위해 변경 사항을 기록하는 로그'
---

Redo Log는 트랜잭션이 커밋될 때 변경 사항을 기록하는 로그입니다. 시스템 장애 시 데이터를 복구하는 데 사용됩니다.

## 동작 방식

InnoDB는 Write-Ahead Logging(WAL) 방식을 사용합니다.

1. 변경 사항을 먼저 Redo Log에 기록
2. 그 다음 실제 데이터 파일에 반영
3. 장애 발생 시 Redo Log를 읽어 복구

## Undo Log와의 차이

| 구분 | Redo Log | Undo Log |
|------|----------|----------|
| 목적 | 복구 (지속성) | 롤백 (원자성) |
| 내용 | 변경 후 데이터 | 변경 전 데이터 |
| 사용 시점 | 시스템 재시작 시 | ROLLBACK 또는 MVCC 읽기 시 |
