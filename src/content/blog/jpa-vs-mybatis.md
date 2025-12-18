---
title: 'JPA vs MyBatis - 생산성과 제어력의 선택'
description: 'JPA와 MyBatis의 차이, 각각의 장단점, 실무 선택 기준을 정리했습니다'
pubDate: 'Dec 17 2024'
tags: ['Java', 'Spring', 'Database']
series: 'tech-tradeoffs'
seriesOrder: 2
quiz:
  - question: "JPA의 핵심 개념인 영속성 컨텍스트의 역할은?"
    options:
      - "SQL을 자동으로 생성한다"
      - "엔티티를 캐싱하고 변경을 감지한다"
      - "데이터베이스 연결을 관리한다"
      - "트랜잭션을 제어한다"
    correctAnswer: 1
    explanation: "영속성 컨텍스트는 엔티티를 관리하는 1차 캐시입니다. 엔티티의 변경 사항을 추적하여 트랜잭션 커밋 시점에 변경된 내용만 UPDATE 쿼리로 실행합니다(Dirty Checking)."
  - question: "다음 중 MyBatis의 장점은?"
    options:
      - "객체 지향적 쿼리 작성"
      - "복잡한 SQL을 완벽하게 제어"
      - "변경 감지 자동화"
      - "1차 캐시 제공"
    correctAnswer: 1
    explanation: "MyBatis는 SQL을 XML이나 어노테이션으로 직접 작성하므로 복잡한 조인, 서브쿼리, 집계 함수 등을 자유롭게 사용할 수 있습니다. SQL 튜닝도 쉽습니다."
  - question: "JPA의 N+1 문제를 해결하는 방법은?"
    options:
      - "Lazy Loading 사용"
      - "Fetch Join 또는 EntityGraph 사용"
      - "Eager Loading 사용"
      - "캐시 사용"
    correctAnswer: 1
    explanation: "N+1 문제는 연관 엔티티를 조회할 때 추가 쿼리가 N번 발생하는 현상입니다. Fetch Join이나 @EntityGraph를 사용하면 한 번의 쿼리로 연관 엔티티를 함께 조회할 수 있습니다."
  - question: "MyBatis의 단점은?"
    options:
      - "복잡한 쿼리 작성 불가"
      - "반복적인 CRUD 코드"
      - "성능이 느림"
      - "학습 곡선이 높음"
    correctAnswer: 1
    explanation: "MyBatis는 간단한 CRUD도 매번 SQL과 매핑 코드를 작성해야 합니다. JPA는 기본 CRUD를 자동으로 제공하지만 MyBatis는 모든 쿼리를 직접 작성해야 합니다."
  - question: "JPA와 MyBatis를 함께 사용할 때 주의사항은?"
    options:
      - "같은 엔티티에 동시에 사용하면 안 됨"
      - "영속성 컨텍스트를 우회하므로 캐시 무효화 필요"
      - "성능이 크게 저하됨"
      - "트랜잭션 충돌 발생"
    correctAnswer: 1
    explanation: "MyBatis는 영속성 컨텍스트를 거치지 않고 직접 DB에 쿼리합니다. JPA로 조회한 엔티티를 MyBatis로 수정하면 영속성 컨텍스트는 이를 감지하지 못합니다. 혼용 시 용도를 명확히 분리해야 합니다."
---

새로운 프로젝트를 시작할 때 데이터 접근 기술을 선택해야 합니다. JPA를 쓸까요, MyBatis를 쓸까요? 팀에서 논쟁이 벌어지는 경우가 많습니다.

"JPA는 쿼리를 몰라도 되니까 생산성이 좋다" vs "복잡한 쿼리는 MyBatis가 낫다". 둘 다 맞는 말입니다. 하지만 프로젝트 특성에 따라 더 적합한 선택이 있습니다.

## JPA란

JPA(Java Persistence API)는 자바 ORM(Object-Relational Mapping) 표준입니다. 객체와 테이블을 매핑해주는 기술입니다.

### 객체 중심 개발

```java
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;
    private String name;
    private String email;

    @OneToMany(mappedBy = "user")
    private List<Order> orders = new ArrayList<>();
}
```

테이블이 아닌 객체를 중심으로 설계합니다. SQL을 직접 작성하지 않아도 됩니다.

```java
// 저장
User user = new User("kim", "kim@example.com");
userRepository.save(user);

// 조회
User found = userRepository.findById(1L);

// 수정 - SQL 없이 변경만 하면 됨
found.setEmail("new@example.com");
// 트랜잭션 커밋 시 자동으로 UPDATE 실행
```

### 영속성 컨텍스트

JPA의 핵심 개념입니다. 엔티티를 관리하는 1차 캐시입니다.

```java
@Transactional
public void updateUser(Long userId) {
    User user = userRepository.findById(userId).get();  // SELECT
    user.setEmail("new@example.com");
    user.setName("new name");
    // 트랜잭션 커밋 시 변경 감지 → UPDATE 실행
}
```

**장점**:
- 변경 감지(Dirty Checking): setter만 호출하면 자동으로 UPDATE
- 1차 캐시: 같은 엔티티를 여러 번 조회해도 쿼리는 1번만
- 지연 로딩(Lazy Loading): 연관 엔티티를 필요할 때 조회

### JPA의 장점

**1. 생산성**

```java
// 기본 CRUD 자동 제공
public interface UserRepository extends JpaRepository<User, Long> {
    // 메서드 이름으로 쿼리 생성
    List<User> findByName(String name);
    List<User> findByEmailContaining(String email);
}
```

SQL 없이 메서드만 정의하면 됩니다.

**2. 유지보수성**

```java
// 컬럼 추가 시
@Entity
public class User {
    private Long id;
    private String name;
    private String email;
    private String phone;  // 새 컬럼 추가
}
```

엔티티만 수정하면 됩니다. 수십 개의 SQL을 일일이 수정할 필요가 없습니다.

**3. 데이터베이스 독립성**

```yaml
# MySQL
spring.jpa.database-platform: org.hibernate.dialect.MySQL8Dialect

# PostgreSQL
spring.jpa.database-platform: org.hibernate.dialect.PostgreSQLDialect
```

Dialect만 바꾸면 다른 DB로 전환 가능합니다.

### JPA의 단점

**1. 학습 곡선**

영속성 컨텍스트, 즉시/지연 로딩, N+1 문제 등 개념이 많습니다. 제대로 이해하지 못하면 성능 문제가 발생합니다.

**2. 복잡한 쿼리**

```java
// 이런 복잡한 쿼리는 JPQL로 작성하기 어려움
SELECT u.name, COUNT(o.id), SUM(o.amount)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id
HAVING SUM(o.amount) > 100000
ORDER BY SUM(o.amount) DESC
```

조인이 많고 집계 함수를 사용하는 쿼리는 작성이 복잡합니다.

**3. N+1 문제**

```java
// Order 100개 조회
List<Order> orders = orderRepository.findAll();  // 1번 쿼리

// 각 Order의 User 조회 → 100번 쿼리 발생!
for (Order order : orders) {
    String userName = order.getUser().getName();  // N번 쿼리
}
```

연관 엔티티를 조회할 때 추가 쿼리가 발생합니다. Fetch Join으로 해결할 수 있지만 주의가 필요합니다.

## MyBatis란

MyBatis는 SQL 매핑 프레임워크입니다. SQL과 Java 객체를 매핑해줍니다.

### SQL 중심 개발

```xml
<!-- UserMapper.xml -->
<mapper namespace="com.example.UserMapper">
    <select id="findById" resultType="User">
        SELECT id, name, email
        FROM users
        WHERE id = #{id}
    </select>

    <insert id="save">
        INSERT INTO users (name, email)
        VALUES (#{name}, #{email})
    </insert>

    <update id="update">
        UPDATE users
        SET name = #{name}, email = #{email}
        WHERE id = #{id}
    </update>
</mapper>
```

SQL을 직접 작성합니다. 데이터베이스를 완벽하게 제어할 수 있습니다.

```java
@Mapper
public interface UserMapper {
    User findById(Long id);
    void save(User user);
    void update(User user);
}
```

### 동적 쿼리

```xml
<select id="searchUsers" resultType="User">
    SELECT * FROM users
    WHERE 1=1
    <if test="name != null">
        AND name LIKE CONCAT('%', #{name}, '%')
    </if>
    <if test="email != null">
        AND email = #{email}
    </if>
    ORDER BY created_at DESC
</select>
```

조건에 따라 SQL을 동적으로 생성할 수 있습니다.

### MyBatis의 장점

**1. SQL 제어**

```xml
<select id="getOrderSummary" resultType="OrderSummary">
    SELECT
        u.name,
        COUNT(o.id) as order_count,
        SUM(o.amount) as total_amount
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
        AND o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY u.id
    HAVING SUM(o.amount) > 100000
    ORDER BY SUM(o.amount) DESC
</select>
```

복잡한 쿼리를 자유롭게 작성할 수 있습니다. 성능 튜닝도 쉽습니다.

**2. 학습 난이도**

SQL을 알면 바로 사용할 수 있습니다. JPA처럼 복잡한 개념이 적습니다.

**3. 레거시 데이터베이스**

```xml
<!-- 기존 복잡한 스키마에도 유연하게 대응 -->
<select id="getLegacyData" resultType="map">
    SELECT * FROM legacy_table_with_weird_structure
    WHERE some_column = #{value}
</select>
```

이미 설계된 데이터베이스에 맞추기 쉽습니다.

### MyBatis의 단점

**1. 반복 코드**

```xml
<!-- 모든 CRUD를 직접 작성 -->
<insert id="save">INSERT ...</insert>
<select id="findById">SELECT ...</select>
<update id="update">UPDATE ...</update>
<delete id="delete">DELETE ...</delete>
```

간단한 CRUD도 매번 작성해야 합니다.

**2. 타입 안정성**

```xml
<!-- 오타가 있어도 컴파일 시점에 발견 불가 -->
<select id="findById" resultType="User">
    SELECT id, naem, email  <!-- naem 오타 → 런타임 에러 -->
    FROM users
    WHERE id = #{id}
</select>
```

XML에서 SQL을 작성하므로 오타를 컴파일 시점에 잡을 수 없습니다.

**3. 객체 그래프 탐색 불가**

```java
// JPA는 가능
String userName = order.getUser().getName();

// MyBatis는 조인해서 직접 조회해야 함
OrderWithUser order = orderMapper.findByIdWithUser(orderId);
String userName = order.getUserName();
```

연관 객체를 자동으로 가져올 수 없습니다.

## 언제 JPA를 선택하는가

### 1. 도메인 중심 설계

```java
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(Product product, int quantity) {
        OrderItem item = new OrderItem(this, product, quantity);
        items.add(item);
    }

    public int getTotalAmount() {
        return items.stream()
            .mapToInt(OrderItem::getAmount)
            .sum();
    }
}
```

비즈니스 로직을 객체에 담고 싶을 때 적합합니다.

### 2. CRUD 중심 애플리케이션

```java
@RestController
public class UserController {
    private final UserRepository userRepository;

    @PostMapping("/users")
    public User create(@RequestBody User user) {
        return userRepository.save(user);
    }

    @GetMapping("/users/{id}")
    public User get(@PathVariable Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    @PutMapping("/users/{id}")
    public User update(@PathVariable Long id, @RequestBody User user) {
        User existing = userRepository.findById(id).orElseThrow();
        existing.setName(user.getName());
        existing.setEmail(user.getEmail());
        return existing;  // 변경 감지로 자동 UPDATE
    }
}
```

단순한 CRUD API는 JPA가 압도적으로 빠릅니다.

### 3. 멀티 데이터베이스 지원

```java
// MySQL, PostgreSQL, Oracle 모두 지원
// Dialect만 바꾸면 됨
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // MySQL
    // @GeneratedValue(strategy = GenerationType.SEQUENCE)  // Oracle
    private Long id;
}
```

### 4. 변경이 잦은 스키마

```java
// 컬럼 추가 시 엔티티만 수정
@Entity
public class User {
    private Long id;
    private String name;
    private String email;
    private LocalDate birthDate;  // 새 컬럼 추가
    private String phoneNumber;   // 새 컬럼 추가
}
```

수십 개의 SQL을 수정할 필요가 없습니다.

## 언제 MyBatis를 선택하는가

### 1. 복잡한 조회 쿼리

```xml
<select id="getMonthlyReport" resultType="MonthlyReport">
    WITH monthly_summary AS (
        SELECT
            DATE_FORMAT(created_at, '%Y-%m') as month,
            user_id,
            COUNT(*) as order_count,
            SUM(amount) as total_amount
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
        GROUP BY month, user_id
    )
    SELECT
        u.name,
        ms.month,
        ms.order_count,
        ms.total_amount,
        RANK() OVER (PARTITION BY ms.month ORDER BY ms.total_amount DESC) as ranking
    FROM monthly_summary ms
    JOIN users u ON ms.user_id = u.id
    ORDER BY ms.month DESC, ranking
</select>
```

CTE, 윈도우 함수, 복잡한 집계는 MyBatis가 더 편합니다.

### 2. 레거시 데이터베이스

```xml
<!-- 기존 설계를 바꿀 수 없을 때 -->
<select id="getLegacyUserData">
    SELECT
        usr_no,
        usr_nm,
        usr_eml,
        reg_dt
    FROM tb_usr_mst
    WHERE del_yn = 'N'
</select>
```

JPA는 엔티티 설계가 어색해질 수 있습니다.

### 3. 성능 최적화가 중요한 경우

```xml
<select id="searchProducts">
    SELECT /*+ INDEX(p idx_product_category) */
        p.id,
        p.name,
        p.price
    FROM products p
    WHERE category_id = #{categoryId}
        AND price BETWEEN #{minPrice} AND #{maxPrice}
    LIMIT #{offset}, #{limit}
</select>
```

힌트, 인덱스 전략을 직접 제어할 수 있습니다.

### 4. 대량 데이터 처리

```xml
<insert id="bulkInsert">
    INSERT INTO logs (user_id, action, created_at)
    VALUES
    <foreach collection="logs" item="log" separator=",">
        (#{log.userId}, #{log.action}, #{log.createdAt})
    </foreach>
</insert>
```

배치 작업은 MyBatis가 더 직관적입니다.

## 트레이드오프 정리

| 기준 | JPA | MyBatis |
|-----|-----|---------|
| **생산성** | 높음 (기본 CRUD 자동) | 낮음 (모든 SQL 작성) |
| **학습 난이도** | 높음 (개념 많음) | 낮음 (SQL만 알면 됨) |
| **복잡한 쿼리** | 어려움 | 쉬움 |
| **SQL 제어** | 제한적 | 완벽 |
| **유지보수** | 엔티티만 수정 | SQL 일일이 수정 |
| **타입 안정성** | 높음 | 낮음 (XML) |
| **성능 튜닝** | 어려움 | 쉬움 |
| **객체 지향** | 강함 | 약함 |

## 혼용 전략

실무에서는 두 기술을 함께 사용하는 경우가 많습니다.

### 용도 분리

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;  // JPA
    private final OrderQueryMapper orderQueryMapper;  // MyBatis

    // 단순 CRUD → JPA
    public Order createOrder(OrderRequest request) {
        Order order = new Order(request);
        return orderRepository.save(order);
    }

    // 복잡한 조회 → MyBatis
    public List<OrderSummary> getMonthlyReport(int year, int month) {
        return orderQueryMapper.getMonthlyReport(year, month);
    }
}
```

**원칙**:
- 쓰기(CUD)는 JPA
- 복잡한 읽기는 MyBatis

### 주의사항

```java
// 안티 패턴
@Transactional
public void updateOrder(Long orderId) {
    Order order = orderRepository.findById(orderId).get();  // JPA
    order.setStatus(OrderStatus.COMPLETED);

    orderMapper.updateOrderAmount(orderId, newAmount);  // MyBatis
    // 영속성 컨텍스트는 이 변경을 모름!
}
```

같은 엔티티를 JPA와 MyBatis로 동시에 조작하면 안 됩니다.

**해결**:
```java
@Transactional
public void updateOrder(Long orderId) {
    Order order = orderRepository.findById(orderId).get();
    order.setStatus(OrderStatus.COMPLETED);
    order.setAmount(newAmount);  // JPA로 통일
}
```

## 실무 선택 기준

### 프로젝트 초기

**신규 프로젝트 + 도메인 중심 설계 → JPA**
- 도메인 로직이 복잡한 서비스
- CRUD가 주된 기능
- 스키마 변경이 잦은 초기 단계

**레거시 DB + 복잡한 쿼리 → MyBatis**
- 이미 설계된 복잡한 스키마
- 리포팅, 통계 위주 시스템
- SQL 튜닝이 중요한 대용량 서비스

### 팀 역량

**JPA 경험이 있는 팀 → JPA**
- 영속성 컨텍스트, N+1 문제 해결 경험
- 객체 지향 설계에 익숙

**SQL 중심 팀 → MyBatis**
- DBA와 협업이 중요
- SQL 튜닝 노하우가 많음

### 하이브리드 전략

```
- 도메인 코어: JPA (User, Order, Product)
- 조회 전용: MyBatis (통계, 리포트, 대시보드)
- 배치: MyBatis (대량 데이터 처리)
```

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- JPA는 생산성이 높지만 학습 곡선이 있고, MyBatis는 간단하지만 반복 코드가 많습니다
- 도메인 중심 설계와 CRUD 위주면 JPA, 복잡한 조회와 성능 튜닝이 중요하면 MyBatis입니다
- 실무에서는 두 기술을 혼용하되, 용도를 명확히 분리해야 합니다
- 프로젝트 특성과 팀 역량을 고려하여 선택해야 합니다

무조건 어느 하나가 좋다는 것은 없습니다. 트레이드오프를 이해하고 상황에 맞게 선택하는 것이 중요합니다.
