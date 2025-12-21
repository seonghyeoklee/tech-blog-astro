---
term: 'Lost Update'
aliases: ['갱신 손실', '업데이트 손실']
category: 'database'
summary: '두 트랜잭션이 동시에 같은 데이터를 수정하여 하나의 변경이 사라지는 현상'
---

Lost Update는 두 트랜잭션이 동시에 같은 데이터를 읽고 수정할 때, 먼저 커밋한 변경이 덮어씌워지는 문제입니다.

## 예시

```
T1: stock = 10 읽음
T2: stock = 10 읽음
T1: stock = 10 - 1 = 9 저장
T2: stock = 10 - 1 = 9 저장  ← T1 변경 사라짐

결과: 2개 팔았는데 stock = 9
```

## 해결 방법

- 비관적 락 (SELECT FOR UPDATE)
- 낙관적 락 (@Version)
- 원자적 UPDATE (SET stock = stock - 1)

## 관련 글

- [데이터베이스 락과 동시성 제어](/blog/db-lock-concurrency)
