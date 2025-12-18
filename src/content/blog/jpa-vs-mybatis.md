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

**2. 복잡한 쿼리 작성의 트레이드오프**

```java
// 순수 JPQL로는 이런 복잡한 쿼리 작성이 번거로울 수 있음
SELECT u.name, COUNT(o.id), SUM(o.amount)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id
HAVING SUM(o.amount) > 100000
ORDER BY SUM(o.amount) DESC
```

조인이 많고 집계 함수를 사용하는 쿼리는 JPQL로 작성 시 가독성이 떨어질 수 있습니다. 하지만 JPA에는 이를 해결할 수 있는 여러 방법이 있습니다.

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

## JPA로 복잡한 쿼리 해결하기

순수 JPQL이 복잡하다고 해서 JPA가 복잡한 쿼리를 처리할 수 없는 것은 아닙니다. 여러 해결책이 있습니다.

### 1. QueryDSL

타입 안전한 쿼리 빌더입니다. 컴파일 시점에 오류를 잡을 수 있습니다.

```java
// QueryDSL로 복잡한 쿼리 작성
QUser user = QUser.user;
QOrder order = QOrder.order;

List<UserOrderSummary> result = queryFactory
    .select(Projections.constructor(
        UserOrderSummary.class,
        user.name,
        order.count(),
        order.amount.sum()
    ))
    .from(user)
    .leftJoin(order).on(order.user.eq(user))
    .where(order.createdAt.after(LocalDateTime.now().minusDays(30)))
    .groupBy(user.id)
    .having(order.amount.sum().gt(100000))
    .orderBy(order.amount.sum().desc())
    .fetch();
```

**장점**:
- 컴파일 시점 타입 체크
- IDE 자동완성 지원
- 동적 쿼리 작성이 직관적
- 리팩토링 안전성

**트레이드오프**:
- 초기 설정 필요 (Q클래스 생성)
- 학습 곡선 존재

### 2. Native Query

SQL을 직접 작성할 수 있습니다. DB 특화 기능도 사용 가능합니다.

```java
@Query(value = """
    SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_amount
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY u.id
    HAVING SUM(o.amount) > 100000
    ORDER BY SUM(o.amount) DESC
    """, nativeQuery = true)
List<OrderSummaryDto> getMonthlyTopUsers();
```

**장점**:
- SQL을 그대로 사용 가능
- DB 특화 기능 활용 (힌트, 윈도우 함수 등)
- 성능 최적화 용이

**트레이드오프**:
- DB 종속성 발생
- 타입 안정성 낮음
- 영속성 컨텍스트 관리 주의 필요

### 3. Specification API

동적 쿼리를 객체 지향적으로 작성할 수 있습니다.

```java
public class OrderSpecifications {
    public static Specification<Order> createdAfter(LocalDateTime date) {
        return (root, query, cb) -> cb.greaterThan(root.get("createdAt"), date);
    }

    public static Specification<Order> amountGreaterThan(int amount) {
        return (root, query, cb) -> cb.greaterThan(root.get("amount"), amount);
    }
}

// 사용
List<Order> orders = orderRepository.findAll(
    Specification.where(OrderSpecifications.createdAfter(startDate))
        .and(OrderSpecifications.amountGreaterThan(100000))
);
```

**장점**:
- 조건을 재사용 가능
- 동적 쿼리 조합이 명확
- 타입 안전성 유지

**트레이드오프**:
- 복잡한 쿼리는 코드가 길어짐
- 학습 필요

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

## JDBC/JdbcTemplate란

가장 낮은 수준의 데이터베이스 접근 방식입니다. Spring의 JdbcTemplate은 순수 JDBC의 번거로움을 줄여줍니다.

### 직접적인 SQL 실행

```java
@Repository
public class UserJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public User findById(Long id) {
        String sql = "SELECT id, name, email FROM users WHERE id = ?";
        return jdbcTemplate.queryForObject(sql,
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("email")
            ),
            id
        );
    }

    public void save(User user) {
        String sql = "INSERT INTO users (name, email) VALUES (?, ?)";
        jdbcTemplate.update(sql, user.getName(), user.getEmail());
    }
}
```

### JDBC/JdbcTemplate의 장점

**1. 완벽한 제어**

```java
// 배치 처리
jdbcTemplate.batchUpdate(
    "INSERT INTO logs (user_id, action) VALUES (?, ?)",
    logList,
    100,  // 배치 크기
    (ps, log) -> {
        ps.setLong(1, log.getUserId());
        ps.setString(2, log.getAction());
    }
);
```

리소스 관리, 커넥션 제어를 직접 할 수 있습니다.

**2. 최소한의 오버헤드**

```java
// 순수 SQL 실행, 추가 레이어 없음
List<Map<String, Object>> results =
    jdbcTemplate.queryForList("SELECT * FROM products WHERE price < ?", 10000);
```

프레임워크 오버헤드가 거의 없어 성능이 중요한 경우 유리합니다.

**3. 간단한 학습 곡선**

SQL과 Java만 알면 됩니다. 추가 개념이 거의 없습니다.

### JDBC/JdbcTemplate의 단점

**1. 반복적인 매핑 코드**

```java
// 매번 RowMapper 작성
jdbcTemplate.query(sql, (rs, rowNum) -> {
    User user = new User();
    user.setId(rs.getLong("id"));
    user.setName(rs.getString("name"));
    user.setEmail(rs.getString("email"));
    // 컬럼이 많으면 매핑 코드도 길어짐
    return user;
});
```

모든 쿼리에 대해 ResultSet 매핑을 직접 작성해야 합니다.

**2. SQL 문자열 관리**

```java
// SQL이 문자열로 흩어져 있음
String sql1 = "SELECT * FROM users WHERE id = ?";
String sql2 = "INSERT INTO users (name, email) VALUES (?, ?)";
String sql3 = "UPDATE users SET name = ?, email = ? WHERE id = ?";
```

타입 안정성이 없고 오타 발견이 어렵습니다.

**3. 동적 쿼리 작성의 어려움**

```java
// 조건에 따라 SQL 문자열을 조합해야 함
StringBuilder sql = new StringBuilder("SELECT * FROM users WHERE 1=1");
List<Object> params = new ArrayList<>();

if (name != null) {
    sql.append(" AND name = ?");
    params.add(name);
}
if (email != null) {
    sql.append(" AND email = ?");
    params.add(email);
}
```

MyBatis의 동적 SQL보다 번거롭습니다.

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

| 기준 | JPA | MyBatis | JDBC/JdbcTemplate |
|-----|-----|---------|-------------------|
| **생산성** | 높음 (기본 CRUD 자동) | 중간 (SQL 작성 필요) | 낮음 (모든 코드 수동) |
| **학습 난이도** | 높음 (개념 많음) | 낮음 (SQL만 알면 됨) | 매우 낮음 (SQL + Java) |
| **복잡한 쿼리** | QueryDSL/Native로 가능 | 쉬움 (동적 SQL 지원) | 가능하지만 번거로움 |
| **SQL 제어** | Native Query로 완벽 제어 가능 | 완벽 | 완벽 |
| **유지보수** | 엔티티 수정 시 자동 반영 | SQL 일일이 수정 | SQL + 매핑 모두 수정 |
| **타입 안정성** | 높음 (QueryDSL 사용 시) | 낮음 (XML) | 낮음 (문자열 SQL) |
| **성능 튜닝** | Native/힌트로 가능 | 쉬움 | 매우 쉬움 |
| **객체 지향** | 강함 | 약함 | 없음 |
| **프레임워크 오버헤드** | 있음 (영속성 컨텍스트) | 적음 | 거의 없음 |

## 혼용 전략

실무에서는 세 가지 기술을 상황에 맞게 조합하여 사용하는 경우가 많습니다.

### 1. JPA + QueryDSL 조합

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;  // JPA
    private final JPAQueryFactory queryFactory;  // QueryDSL

    // 단순 CRUD → JPA Repository
    public Order createOrder(OrderRequest request) {
        Order order = new Order(request);
        return orderRepository.save(order);
    }

    // 복잡한 조회 → QueryDSL
    public List<OrderSummary> getMonthlyReport(int year, int month) {
        QOrder order = QOrder.order;
        QUser user = QUser.user;

        return queryFactory
            .select(Projections.constructor(
                OrderSummary.class,
                user.name,
                order.count(),
                order.amount.sum()
            ))
            .from(order)
            .join(order.user, user)
            .where(order.createdAt.year().eq(year)
                .and(order.createdAt.month().eq(month)))
            .groupBy(user.id)
            .fetch();
    }
}
```

**선택 이유**: JPA 생태계 내에서 복잡한 쿼리 해결, 타입 안정성 유지

### 2. JPA + MyBatis 조합

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;  // JPA
    private final OrderStatisticsMapper statisticsMapper;  // MyBatis

    // 도메인 로직과 CRUD → JPA
    public Order createOrder(OrderRequest request) {
        Order order = new Order(request);
        order.calculateTotalAmount();  // 도메인 로직
        return orderRepository.save(order);
    }

    // 리포팅/통계 → MyBatis
    public List<MonthlyStatistics> getYearlyStatistics(int year) {
        // CTE, 윈도우 함수 등 DB 특화 기능 활용
        return statisticsMapper.getYearlyStatistics(year);
    }
}
```

**선택 이유**:
- 도메인 중심 개발은 JPA
- 복잡한 리포팅/분석은 MyBatis로 SQL 직접 제어

### 3. JPA + JDBC 조합

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;  // JPA
    private final JdbcTemplate jdbcTemplate;  // JDBC

    // 도메인 로직 → JPA
    public void processOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.process();  // 도메인 로직 실행
    }

    // 대량 배치 처리 → JDBC
    public void bulkUpdateOrderStatus(List<Long> orderIds, OrderStatus status) {
        String sql = "UPDATE orders SET status = ? WHERE id = ?";

        jdbcTemplate.batchUpdate(sql, orderIds, 1000, (ps, orderId) -> {
            ps.setString(1, status.name());
            ps.setLong(2, orderId);
        });
    }
}
```

**선택 이유**:
- 비즈니스 로직은 JPA로 객체 지향적으로
- 성능이 중요한 대량 처리는 JDBC로 최소 오버헤드

### 4. 레이어별 분리 전략

```java
// 도메인 계층: JPA
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @OneToMany(cascade = CascadeType.ALL)
    private List<OrderItem> items;

    public void addItem(Product product, int quantity) {
        items.add(new OrderItem(this, product, quantity));
    }
}

// 조회 계층: MyBatis 또는 QueryDSL
@Mapper
public interface OrderQueryMapper {
    List<OrderSummary> findOrderSummaries(OrderSearchCondition condition);
}

// 배치 계층: JDBC
@Component
public class OrderBatchProcessor {
    private final JdbcTemplate jdbcTemplate;

    public void bulkInsertLogs(List<OrderLog> logs) {
        // 대량 데이터 빠른 처리
    }
}
```

**원칙**:
- **쓰기(CUD) 중심**: JPA (영속성 컨텍스트, 변경 감지)
- **복잡한 읽기**: QueryDSL (타입 안전) 또는 MyBatis (SQL 제어)
- **대량 처리**: JDBC (최소 오버헤드)
- **리포팅/분석**: MyBatis (복잡한 SQL, DB 특화 기능)

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

    // 또는 명시적으로 영속성 컨텍스트 플러시
    entityManager.flush();  // 변경사항을 DB에 즉시 반영
    entityManager.clear();  // 영속성 컨텍스트 초기화

    // 이후 MyBatis 사용
    orderMapper.updateOrderAmount(orderId, newAmount);
}
```

영속성 컨텍스트를 이해하고 적절히 관리하면 혼용도 가능합니다.

## 실무 선택 기준

선택은 프로젝트 특성, 팀 역량, 요구사항의 트레이드오프입니다.

### 프로젝트 특성별 고려사항

**신규 프로젝트 + 도메인 중심 설계**
- **JPA + QueryDSL**: 객체 지향적 설계와 타입 안전성
- 도메인 로직이 복잡한 서비스
- CRUD가 주된 기능
- 스키마 변경이 잦은 초기 단계

**레거시 시스템 통합**
- **MyBatis 또는 JDBC**: 기존 스키마에 유연하게 대응
- 이미 설계된 복잡한 스키마
- 변경이 어려운 레거시 DB 구조

**리포팅/분석 시스템**
- **MyBatis**: 복잡한 집계 쿼리, CTE, 윈도우 함수 활용
- SQL 튜닝이 중요한 대용량 조회

**고성능 배치 처리**
- **JDBC**: 최소 오버헤드로 대량 데이터 처리
- 수백만 건 이상의 데이터 Insert/Update

### 팀 역량별 고려사항

**객체 지향 설계 경험이 풍부한 팀**
- JPA의 장점을 극대화할 수 있음
- 영속성 컨텍스트, N+1 문제 이해도가 높음
- DDD(Domain-Driven Design) 적용 시 JPA가 적합

**SQL 최적화 경험이 풍부한 팀**
- MyBatis로 쿼리를 직접 제어하여 성능 최적화
- DBA와 긴밀한 협업
- 데이터베이스 중심 설계

**빠른 개발이 필요한 스타트업**
- JPA로 초기 생산성 확보
- 복잡한 쿼리는 나중에 최적화 (QueryDSL, Native Query)

### 현실적인 하이브리드 전략

```
계층별 분리:
- 도메인 코어: JPA + QueryDSL (User, Order, Product)
- 복잡한 조회: MyBatis (월간 통계, 대시보드)
- 대량 배치: JDBC (정산, 로그 처리)

성능 최적화 전략:
- 80% CRUD: JPA로 빠른 개발
- 15% 복잡한 조회: QueryDSL 또는 MyBatis
- 5% 성능 크리티컬: Native Query 또는 JDBC
```

## 정리

데이터 접근 기술의 선택은 트레이드오프입니다.

**핵심 포인트**:
- JPA는 생산성과 객체 지향 설계에 강점이 있지만, 복잡한 쿼리는 QueryDSL이나 Native Query로 해결할 수 있습니다
- MyBatis는 SQL 제어력이 뛰어나지만, 반복 코드가 많아 생산성 측면에서 트레이드오프가 있습니다
- JDBC는 최소 오버헤드와 완벽한 제어가 가능하지만, 모든 매핑을 수동으로 작성해야 합니다
- 실무에서는 JPA+QueryDSL, JPA+MyBatis, JPA+JDBC 등 혼용 전략을 많이 사용합니다

**선택의 기준**:
- 프로젝트 특성 (도메인 복잡도, 쿼리 복잡도, 성능 요구사항)
- 팀 역량 (객체 지향 vs SQL 최적화 경험)
- 레거시 시스템 연동 여부
- 유지보수성과 생산성의 우선순위

어떤 기술도 모든 상황에서 완벽한 해답은 아닙니다. 각 기술의 강점과 약점을 이해하고, 프로젝트 상황에 맞는 조합을 선택하는 것이 중요합니다. 필요하다면 한 프로젝트 내에서도 여러 기술을 함께 사용할 수 있습니다.
