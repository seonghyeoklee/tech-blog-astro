---
term: 'Self-Invocation'
aliases: ['내부 호출', '자기 호출']
category: 'spring'
summary: '같은 클래스 내에서 메서드를 호출하여 AOP 프록시를 거치지 않는 현상'
related: [aop, proxy-pattern, transactional]
---

Self-Invocation은 같은 클래스 내에서 this로 메서드를 호출하는 것을 말합니다. 이 경우 프록시를 거치지 않아 AOP가 적용되지 않습니다.

## 문제 상황

```java
@Service
public class OrderService {
    public void createOrder() {
        validate();  // AOP 미적용!
    }

    @Transactional
    public void validate() {
        // 트랜잭션 적용 안 됨
    }
}
```

## 해결 방법

1. **별도 클래스로 분리** (권장)
2. 자기 자신을 주입받아 호출
3. ApplicationContext에서 Bean 조회

## 관련 글

- [Spring AOP - 관점 지향 프로그래밍](/blog/spring-aop)
- [Spring @Transactional 동작 원리](/blog/spring-transactional)
