---
term: 'AOP'
aliases: ['Aspect Oriented Programming', '관점 지향 프로그래밍']
category: 'spring'
summary: '횡단 관심사를 모듈화하여 핵심 로직과 분리하는 프로그래밍 패러다임'
related: ['proxy', 'proxy-pattern', 'transactional']
---

AOP(Aspect Oriented Programming)는 로깅, 트랜잭션, 보안 같은 횡단 관심사(Cross-cutting Concerns)를 핵심 비즈니스 로직에서 분리하는 프로그래밍 기법입니다.

## 주요 용어

| 용어 | 설명 |
|------|------|
| Aspect | 횡단 관심사를 모듈화한 것 |
| Join Point | Aspect를 적용할 수 있는 지점 (메서드 실행 등) |
| Pointcut | Join Point를 선별하는 표현식 |
| Advice | 실제 수행할 로직 (Before, After, Around 등) |
| Weaving | Aspect를 타겟에 적용하는 과정 |

## Spring AOP

Spring은 프록시 기반 AOP를 제공합니다.

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("execution(* com.example.service.*.*(..))")
    public Object logging(ProceedingJoinPoint joinPoint) throws Throwable {
        log.info("메서드 시작: {}", joinPoint.getSignature());
        Object result = joinPoint.proceed();
        log.info("메서드 종료: {}", joinPoint.getSignature());
        return result;
    }
}
```

## @Transactional과 AOP

@Transactional은 AOP로 구현됩니다. 프록시가 메서드 호출을 가로채서 트랜잭션을 시작하고, 완료 후 커밋 또는 롤백합니다.
