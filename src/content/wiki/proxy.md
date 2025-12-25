---
term: 'Proxy'
aliases: ['프록시', '프록시 패턴']
category: 'architecture'
summary: '실제 객체를 대신하여 접근을 제어하거나 부가 기능을 제공하는 대리 객체'
related: ['aop', 'proxy-pattern', 'transactional']
---

Proxy는 실제 객체를 감싸서 접근을 제어하거나 부가 기능을 추가하는 디자인 패턴입니다. 클라이언트는 프록시를 통해 실제 객체에 접근합니다.

## 프록시의 역할

- **접근 제어**: 권한 검사, 지연 로딩
- **부가 기능**: 로깅, 트랜잭션, 캐싱
- **원격 접근**: RPC, 원격 객체 호출

## Spring의 프록시 방식

| 방식 | 설명 |
|------|------|
| JDK Dynamic Proxy | 인터페이스 기반, 리플렉션 사용 |
| CGLIB Proxy | 클래스 상속 기반, 바이트코드 조작 |

Spring Boot 2.0부터는 CGLIB가 기본값입니다.

## 프록시와 @Transactional

```java
// 프록시 동작 흐름
Client → Proxy → 트랜잭션 시작 → 실제 객체 메서드 호출 → 커밋/롤백
```

## 프록시의 한계

- **내부 호출 문제**: 같은 클래스 내 메서드 호출은 프록시를 거치지 않음
- **final 클래스/메서드**: CGLIB 프록시 생성 불가

```java
public class OrderService {
    @Transactional
    public void order() {
        this.validate();  // 프록시 거치지 않음! 트랜잭션 미적용
    }

    @Transactional
    public void validate() { }
}
```
