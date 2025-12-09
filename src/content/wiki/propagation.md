---
term: 'Propagation'
aliases: ['트랜잭션 전파', 'Transaction Propagation']
category: 'spring'
summary: '트랜잭션이 이미 존재할 때 새 트랜잭션을 어떻게 처리할지 결정하는 정책'
---

Propagation은 트랜잭션이 진행 중일 때 새로운 트랜잭션 요청이 들어오면 어떻게 처리할지 결정하는 정책입니다.

## 전파 옵션

| 옵션 | 설명 |
|------|------|
| REQUIRED | 기존 트랜잭션 있으면 참여, 없으면 새로 생성 (기본값) |
| REQUIRES_NEW | 항상 새 트랜잭션 생성, 기존 트랜잭션은 보류 |
| SUPPORTS | 기존 트랜잭션 있으면 참여, 없으면 트랜잭션 없이 실행 |
| NOT_SUPPORTED | 트랜잭션 없이 실행, 기존 트랜잭션은 보류 |
| MANDATORY | 기존 트랜잭션 필수, 없으면 예외 발생 |
| NEVER | 트랜잭션 없이 실행, 기존 트랜잭션 있으면 예외 발생 |
| NESTED | 기존 트랜잭션 내에 중첩 트랜잭션 생성 (Savepoint 사용) |

## 자주 쓰는 조합

```java
@Transactional
public void order() {
    paymentService.pay();      // REQUIRED - 같은 트랜잭션
    logService.saveLog();      // REQUIRES_NEW - 별도 트랜잭션
}
```

로그 저장이 실패해도 주문은 롤백되지 않도록 분리할 때 REQUIRES_NEW를 사용합니다.
