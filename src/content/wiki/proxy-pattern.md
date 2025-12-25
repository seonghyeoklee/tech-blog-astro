---
term: 'Proxy Pattern'
aliases: ['프록시 패턴', '프록시']
category: 'spring'
summary: '실제 객체를 대신하여 접근을 제어하거나 부가 기능을 추가하는 디자인 패턴'
related: [aop, jpa, self-invocation]
---

프록시 패턴은 실제 객체(Target) 대신 대리 객체(Proxy)를 통해 접근을 제어하는 구조적 디자인 패턴입니다.

## Spring에서의 프록시

Spring AOP와 @Transactional은 프록시 기반으로 동작합니다.

```
Client → Proxy → Target
         ↓
    부가 기능 실행
```

## 프록시 생성 방식

- **JDK Dynamic Proxy**: 인터페이스 기반
- **CGLIB Proxy**: 클래스 상속 기반 (Spring Boot 기본값)

## 주의사항

- private 메서드에는 프록시 적용 불가
- 같은 클래스 내부 호출(self-invocation)에는 프록시 미적용

## 관련 글

- [Spring AOP - 관점 지향 프로그래밍](/blog/spring-aop)
- [Spring @Transactional 동작 원리](/blog/spring-transactional)
