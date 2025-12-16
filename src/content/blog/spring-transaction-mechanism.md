---
title: 'Spring이 트랜잭션을 다루는 방식 - 프록시와 커넥션'
description: '@Transactional 이면에서 Spring과 DB가 어떻게 협력하는지 정리했습니다'
pubDate: 'Dec 22 2024'
tags: ['Spring', 'Database']
series: 'database-fundamentals'
seriesOrder: 2
quiz:
  - question: "@Transactional 어노테이션이 동작하기 위해 Spring이 사용하는 기술은?"
    options:
      - "Reflection API"
      - "Proxy 패턴"
      - "Static 메서드"
      - "Annotation Processor"
    correctAnswer: 1
    explanation: "Spring은 프록시 패턴을 사용하여 @Transactional을 구현합니다. 프록시 객체가 실제 객체를 감싸서 메서드 호출 전후에 트랜잭션 시작/커밋/롤백 로직을 추가합니다."
  - question: "Spring의 PlatformTransactionManager가 하는 역할은?"
    options:
      - "트랜잭션의 ACID 속성을 보장한다"
      - "트랜잭션의 시작과 종료를 관리한다"
      - "격리 수준을 설정한다"
      - "데이터베이스에 직접 연결한다"
    correctAnswer: 1
    explanation: "PlatformTransactionManager는 트랜잭션의 시작(BEGIN), 커밋(COMMIT), 롤백(ROLLBACK)을 관리합니다. 실제 ACID 보장과 격리 수준 처리는 데이터베이스가 담당합니다."
  - question: "다음 코드에서 validateOrder() 메서드에 트랜잭션이 적용되는가?<br><br>@Transactional<br>public void createOrder() {<br>&nbsp;&nbsp;this.validateOrder();<br>}<br><br>@Transactional<br>public void validateOrder() { }"
    options:
      - "적용된다"
      - "적용되지 않는다"
      - "경우에 따라 다르다"
      - "컴파일 에러가 발생한다"
    correctAnswer: 1
    explanation: "적용되지 않습니다. 같은 클래스 내부에서 메서드를 호출할 때는 프록시를 거치지 않고 직접 호출되기 때문에 @Transactional이 동작하지 않습니다. 이를 내부 호출 문제라고 합니다."
  - question: "트랜잭션이 시작될 때 Spring이 커넥션 풀에서 커넥션을 획득하는 시점은?"
    options:
      - "애플리케이션 시작 시"
      - "@Transactional 메서드 진입 시"
      - "첫 번째 쿼리 실행 시"
      - "커밋 직전"
    correctAnswer: 1
    explanation: "@Transactional 메서드에 진입할 때 PlatformTransactionManager가 커넥션 풀에서 커넥션을 획득하고 트랜잭션을 시작합니다. 메서드가 끝나면 커밋 또는 롤백 후 커넥션을 풀에 반납합니다."
  - question: "Spring Boot에서 spring-boot-starter-data-jpa를 사용할 때 자동 설정되는 TransactionManager는?"
    options:
      - "DataSourceTransactionManager"
      - "JpaTransactionManager"
      - "HibernateTransactionManager"
      - "JtaTransactionManager"
    correctAnswer: 1
    explanation: "Spring Boot는 의존성에 따라 적절한 TransactionManager를 자동으로 등록합니다. spring-boot-starter-data-jpa를 사용하면 JpaTransactionManager가 자동 설정됩니다."
---

@Transactional을 붙이면 트랜잭션이 자동으로 처리된다는 건 알고 있습니다. 하지만 Spring이 정확히 무엇을 하는지, DB와 역할을 어떻게 나누는지 명확하지 않았습니다.

이 글에서는 @Transactional 이면에서 일어나는 일을 정리했습니다.

## @Transactional은 무엇을 하는가

먼저 역할을 명확히 구분해야 합니다.

**Spring의 역할**
- 트랜잭션 시작 (BEGIN)
- 트랜잭션 종료 (COMMIT 또는 ROLLBACK)
- 커넥션 획득과 반납 관리

**Database의 역할**
- ACID 속성 보장
- 격리 수준 처리
- 실제 데이터 변경과 복구

Spring은 트랜잭션의 **시작과 끝을 관리**하는 역할만 합니다. 트랜잭션의 본질적인 기능은 데이터베이스가 처리합니다.

```java
@Transactional
public void transfer(Long fromId, Long toId, int amount) {
    accountRepository.withdraw(fromId, amount);  // 출금
    accountRepository.deposit(toId, amount);     // 입금
}
```

이 코드를 실행하면 다음과 같은 일이 일어납니다.

```sql
-- Spring이 실행
BEGIN;

-- 애플리케이션 로직
UPDATE account SET balance = balance - 10000 WHERE id = 1;
UPDATE account SET balance = balance + 10000 WHERE id = 2;

-- Spring이 실행 (정상 완료 시)
COMMIT;
```

Spring은 메서드 실행 전에 `BEGIN`을, 완료 후에 `COMMIT`을 실행합니다. 예외가 발생하면 `ROLLBACK`을 실행합니다.

## 프록시 메커니즘

@Transactional이 동작하려면 프록시가 필요합니다.

### 프록시란

프록시는 실제 객체를 감싸는 대리 객체입니다. 클라이언트는 프록시를 통해 실제 객체에 접근합니다.

```
Client → Proxy → 실제 객체
```

프록시는 실제 객체의 메서드 호출 전후에 부가 기능을 추가할 수 있습니다.

### Spring의 프록시 생성

Spring은 @Transactional이 붙은 클래스를 감지하면 프록시 객체를 생성합니다.

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);
    }
}
```

Spring Boot 2.0부터는 CGLIB를 사용하여 프록시를 생성합니다. CGLIB는 클래스를 상속받아 프록시를 만듭니다.

```
OrderService (원본)
    ↑
OrderService$$EnhancerBySpringCGLIB (프록시)
```

실제로 주입되는 객체는 프록시입니다.

### 프록시의 동작 흐름

```java
// 1. 클라이언트가 프록시의 메서드를 호출
orderService.createOrder(order);

// 2. 프록시가 트랜잭션을 시작
transactionManager.getTransaction();  // BEGIN

try {
    // 3. 실제 객체의 메서드 실행
    실제_OrderService.createOrder(order);

    // 4. 정상 완료 시 커밋
    transactionManager.commit();  // COMMIT
} catch (Exception e) {
    // 5. 예외 발생 시 롤백
    transactionManager.rollback();  // ROLLBACK
    throw e;
}
```

프록시가 트랜잭션 처리 코드를 삽입합니다. 개발자는 비즈니스 로직만 작성하면 됩니다.

### 내부 호출 문제

프록시는 외부에서 호출될 때만 동작합니다. 같은 클래스 내부에서 메서드를 호출하면 프록시를 거치지 않습니다.

```java
@Service
public class OrderService {

    public void createOrder(Order order) {
        validateOrder(order);  // 내부 호출
        orderRepository.save(order);
    }

    @Transactional
    public void validateOrder(Order order) {
        // 트랜잭션이 적용되지 않음!
        if (order.getAmount() < 0) {
            throw new InvalidOrderException();
        }
    }
}
```

createOrder()에서 validateOrder()를 호출하면 `this.validateOrder()`가 실행됩니다. 이것은 프록시가 아닌 실제 객체의 메서드를 직접 호출하는 것입니다.

**해결 방법**
1. 클래스 분리
2. self-injection (권장하지 않음)
3. createOrder()에도 @Transactional 추가

가장 좋은 방법은 클래스를 분리하는 것입니다.

```java
@Service
public class OrderValidator {
    @Transactional
    public void validate(Order order) {
        // 트랜잭션 적용됨
    }
}

@Service
public class OrderService {
    private final OrderValidator validator;

    public void createOrder(Order order) {
        validator.validate(order);  // 외부 호출
        orderRepository.save(order);
    }
}
```

## PlatformTransactionManager

Spring의 트랜잭션 관리는 PlatformTransactionManager 인터페이스를 중심으로 동작합니다.

```java
public interface PlatformTransactionManager {
    TransactionStatus getTransaction(TransactionDefinition definition);
    void commit(TransactionStatus status);
    void rollback(TransactionStatus status);
}
```

이 인터페이스는 트랜잭션의 시작, 커밋, 롤백을 추상화합니다.

### 구현체

사용하는 데이터 접근 기술에 따라 다른 구현체가 필요합니다.

| 구현체 | 사용 기술 |
|--------|----------|
| DataSourceTransactionManager | JDBC, MyBatis |
| JpaTransactionManager | JPA (Hibernate) |
| HibernateTransactionManager | Hibernate 직접 사용 |
| JtaTransactionManager | 분산 트랜잭션 |

Spring Boot는 의존성을 보고 자동으로 적절한 TransactionManager를 등록합니다.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

이 의존성이 있으면 JpaTransactionManager가 자동 등록됩니다.

### @Transactional과의 관계

@Transactional 어노테이션은 내부적으로 PlatformTransactionManager를 사용합니다.

```java
@Transactional
public void createOrder(Order order) {
    // 비즈니스 로직
}
```

이 코드는 다음과 같이 동작합니다.

```java
TransactionStatus status = transactionManager.getTransaction(정의);

try {
    createOrder(order);
    transactionManager.commit(status);
} catch (RuntimeException e) {
    transactionManager.rollback(status);
    throw e;
}
```

프록시가 자동으로 이 코드를 실행합니다.

## 커넥션은 언제 획득하는가

트랜잭션과 커넥션은 밀접한 관계가 있습니다. 트랜잭션은 하나의 커넥션 안에서 동작합니다.

### 커넥션 획득 시점

트랜잭션이 시작될 때 커넥션을 획득합니다.

```java
@Transactional
public void createOrder(Order order) {
    // 메서드 진입 시점에 커넥션 획득
    orderRepository.save(order);
    // 메서드 종료 시점에 커넥션 반납
}
```

**흐름**
1. @Transactional 메서드 진입
2. TransactionManager가 커넥션 풀에서 커넥션 획득
3. `BEGIN` 실행
4. 비즈니스 로직 실행
5. `COMMIT` 또는 `ROLLBACK` 실행
6. 커넥션을 풀에 반납

### 커넥션 풀

커넥션 풀은 미리 생성된 커넥션을 보관하는 저장소입니다.

```
[HikariCP 커넥션 풀]
┌─────────────────┐
│ Connection 1    │ ← 사용 중
│ Connection 2    │ ← 유휴
│ Connection 3    │ ← 유휴
│ ...             │
│ Connection 10   │ ← 사용 중
└─────────────────┘
```

트랜잭션마다 하나의 커넥션을 사용합니다. 메서드가 끝나면 커넥션을 반납해야 다른 요청이 사용할 수 있습니다.

### 커넥션 누수

커넥션을 반납하지 않으면 풀이 고갈됩니다.

```java
// 안티 패턴
public void processOrders() {
    for (Order order : orders) {
        createOrder(order);  // 각각 새로운 트랜잭션/커넥션
    }
}
```

이 코드는 각 주문마다 트랜잭션을 시작하고 커넥션을 획득합니다. 처리 속도가 느리면 커넥션이 부족해질 수 있습니다.

```java
// 개선
@Transactional
public void processOrders() {
    for (Order order : orders) {
        orderRepository.save(order);  // 하나의 트랜잭션/커넥션
    }
}
```

외부 메서드에 @Transactional을 붙여 하나의 트랜잭션으로 묶습니다.

### ThreadLocal과 커넥션

Spring은 ThreadLocal을 사용하여 트랜잭션과 커넥션을 관리합니다.

```java
@Transactional
public void createOrder(Order order) {
    orderRepository.save(order);        // 같은 커넥션
    notificationService.send(order);    // 같은 커넥션
}
```

같은 스레드에서 실행되는 모든 데이터베이스 작업은 같은 커넥션을 사용합니다. ThreadLocal에 저장된 커넥션을 꺼내 씁니다.

## 주의할 점

### private 메서드

프록시는 메서드를 오버라이드해야 합니다. private 메서드는 오버라이드할 수 없습니다.

```java
@Transactional
private void validateOrder(Order order) {
    // 트랜잭션이 적용되지 않음
}
```

@Transactional은 public 메서드에만 사용해야 합니다.

### Checked Exception

기본적으로 RuntimeException만 롤백합니다.

```java
@Transactional
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException();  // 롤백되지 않음!
}
```

Checked Exception에서도 롤백하려면 명시해야 합니다.

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(Order order) throws IOException {
    orderRepository.save(order);
    throw new IOException();  // 롤백됨
}
```

### 트랜잭션 범위

트랜잭션은 가능한 짧게 유지해야 합니다.

```java
// 안티 패턴
@Transactional
public void processOrder(Order order) {
    validateOrder(order);
    sendEmail(order);        // 외부 API 호출 (느림)
    saveOrder(order);
}
```

외부 API 호출이나 무거운 작업은 트랜잭션 밖으로 빼야 합니다.

```java
// 개선
public void processOrder(Order order) {
    validateOrder(order);
    saveOrderWithTransaction(order);
    sendEmail(order);  // 트랜잭션 밖
}

@Transactional
public void saveOrderWithTransaction(Order order) {
    saveOrder(order);
}
```

트랜잭션이 길어지면 커넥션을 오래 점유하고, 다른 트랜잭션이 대기하게 됩니다.

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- Spring은 트랜잭션의 시작과 종료를 관리하고, DB는 실제 트랜잭션을 처리합니다
- @Transactional은 프록시를 통해 동작하며, 메서드 호출 전후에 트랜잭션 코드를 삽입합니다
- 같은 클래스 내부 호출은 프록시를 거치지 않아 트랜잭션이 적용되지 않습니다
- PlatformTransactionManager가 커넥션 획득과 트랜잭션 관리를 담당합니다
- 트랜잭션은 하나의 커넥션을 사용하며, 종료 시 커넥션을 풀에 반납합니다

다음 글에서는 트랜잭션 전파 옵션에 대해 다루겠습니다.
