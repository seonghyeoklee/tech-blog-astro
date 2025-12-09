---
term: 'PlatformTransactionManager'
aliases: ['TransactionManager', '트랜잭션 매니저']
category: 'spring'
summary: 'Spring의 트랜잭션 추상화 인터페이스'
---

PlatformTransactionManager는 Spring에서 트랜잭션을 관리하는 핵심 인터페이스입니다. 다양한 트랜잭션 기술을 동일한 방식으로 사용할 수 있게 추상화합니다.

## 주요 메서드

```java
public interface PlatformTransactionManager {
    TransactionStatus getTransaction(TransactionDefinition definition);
    void commit(TransactionStatus status);
    void rollback(TransactionStatus status);
}
```

## 구현체

| 구현체 | 사용 기술 |
|--------|----------|
| DataSourceTransactionManager | JDBC, MyBatis |
| JpaTransactionManager | JPA (Hibernate) |
| HibernateTransactionManager | Hibernate 직접 사용 |
| JtaTransactionManager | 분산 트랜잭션 (XA) |

## Spring Boot 자동 설정

Spring Boot는 의존성에 따라 적절한 TransactionManager를 자동 등록합니다.

- `spring-boot-starter-jdbc` → DataSourceTransactionManager
- `spring-boot-starter-data-jpa` → JpaTransactionManager

## @Transactional과의 관계

@Transactional 어노테이션은 내부적으로 PlatformTransactionManager를 사용하여 트랜잭션을 시작하고 커밋/롤백합니다.
