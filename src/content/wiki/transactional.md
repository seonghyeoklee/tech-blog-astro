---
term: '@Transactional'
aliases: ['Transactional', '트랜잭셔널']
category: 'spring'
summary: 'Spring에서 선언적 트랜잭션 관리를 위한 어노테이션'
---

@Transactional은 Spring에서 메서드나 클래스에 트랜잭션 경계를 선언하는 어노테이션입니다. AOP를 통해 트랜잭션 시작, 커밋, 롤백을 자동으로 처리합니다.

## 기본 사용법

```java
@Transactional
public void transfer(Long fromId, Long toId, int amount) {
    accountRepository.withdraw(fromId, amount);
    accountRepository.deposit(toId, amount);
}
```

## 주요 속성

| 속성 | 설명 | 기본값 |
|------|------|--------|
| propagation | 트랜잭션 전파 방식 | REQUIRED |
| isolation | 격리 수준 | DEFAULT (DB 기본값) |
| readOnly | 읽기 전용 여부 | false |
| timeout | 타임아웃 (초) | -1 (무제한) |
| rollbackFor | 롤백할 예외 | RuntimeException |

## 동작 원리

1. 프록시 객체가 원본 객체를 감쌈
2. 메서드 호출 시 프록시가 트랜잭션 시작
3. 메서드 정상 완료 시 커밋
4. 예외 발생 시 롤백

## 주의사항

- **같은 클래스 내부 호출**: 프록시를 거치지 않아 트랜잭션이 적용되지 않음
- **private 메서드**: 프록시가 오버라이드할 수 없어 적용 불가
- **Checked Exception**: 기본적으로 롤백되지 않음
