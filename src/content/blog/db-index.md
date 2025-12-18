---
title: '인덱스 - 데이터베이스 검색 성능의 핵심'
description: '인덱스의 동작 원리, B-Tree 구조, 그리고 실무에서 인덱스를 효과적으로 활용하는 방법을 정리했습니다'
pubDate: 'Jan 13 2025'
series: 'database-fundamentals'
seriesOrder: 2
tags: ['Database', 'MySQL', 'CS']
quiz:
  - question: "인덱스가 없는 테이블에서 특정 레코드를 찾을 때 사용하는 방식은?"
    options:
      - "Binary Search"
      - "Full Table Scan"
      - "Hash Lookup"
      - "Sequential Search"
    correctAnswer: 1
    explanation: "인덱스가 없으면 데이터베이스는 테이블의 모든 레코드를 처음부터 끝까지 읽어야 합니다. 이를 Full Table Scan이라고 합니다."

  - question: "B-Tree 인덱스에서 리프 노드에 저장되는 것은?"
    options:
      - "실제 데이터 값"
      - "데이터가 저장된 주소(포인터)"
      - "인덱스 키만"
      - "테이블 전체 데이터"
    correctAnswer: 1
    explanation: "B-Tree 인덱스의 리프 노드에는 인덱스 키와 함께 실제 데이터가 저장된 주소(포인터)가 함께 저장됩니다."

  - question: "다음 중 인덱스를 사용할 수 없는 쿼리는?"
    options:
      - "WHERE name = 'John'"
      - "WHERE age > 30"
      - "WHERE UPPER(name) = 'JOHN'"
      - "WHERE name LIKE 'John%'"
    correctAnswer: 2
    explanation: "인덱스 컬럼에 함수를 적용하면 인덱스를 사용할 수 없습니다. UPPER(name)처럼 함수를 사용하면 Full Table Scan이 발생합니다."

  - question: "복합 인덱스 INDEX(a, b, c)가 있을 때, 인덱스를 활용할 수 있는 쿼리는?"
    options:
      - "WHERE b = 1 AND c = 2"
      - "WHERE c = 2"
      - "WHERE a = 1 AND c = 2"
      - "WHERE b = 1"
    correctAnswer: 2
    explanation: "복합 인덱스는 왼쪽부터 순서대로 사용됩니다. (a, b, c) 인덱스에서 a는 사용하고 b를 건너뛰어도 인덱스의 일부를 활용할 수 있습니다."

  - question: "인덱스를 추가했을 때 느려지는 작업은?"
    options:
      - "SELECT"
      - "WHERE 조건 검색"
      - "INSERT, UPDATE, DELETE"
      - "JOIN"
    correctAnswer: 2
    explanation: "인덱스를 추가하면 데이터 변경(INSERT, UPDATE, DELETE) 시 인덱스도 함께 업데이트해야 하므로 쓰기 작업이 느려집니다."

  - question: "Clustered Index(클러스터드 인덱스)의 특징은?"
    options:
      - "테이블당 여러 개 생성 가능"
      - "실제 데이터의 물리적 순서를 결정"
      - "별도의 저장 공간 필요"
      - "Primary Key와 무관"
    correctAnswer: 1
    explanation: "Clustered Index는 테이블당 하나만 존재하며, 실제 데이터의 물리적 순서를 인덱스 키 순서에 맞춰 정렬합니다."

  - question: "카디널리티(Cardinality)가 높다는 의미는?"
    options:
      - "중복 값이 많음"
      - "중복 값이 적음 (유니크한 값이 많음)"
      - "데이터 크기가 큼"
      - "인덱스 깊이가 깊음"
    correctAnswer: 1
    explanation: "카디널리티가 높다는 것은 유니크한 값이 많다는 의미입니다. 카디널리티가 높을수록 인덱스의 효율이 좋습니다."

  - question: "WHERE age BETWEEN 20 AND 30에서 인덱스 사용 여부는?"
    options:
      - "인덱스를 사용할 수 없음"
      - "age에 인덱스가 있으면 사용 가능"
      - "항상 Full Table Scan"
      - "복합 인덱스에서만 가능"
    correctAnswer: 1
    explanation: "BETWEEN은 범위 검색이므로 age 컬럼에 인덱스가 있으면 효율적으로 사용할 수 있습니다."

  - question: "인덱스 생성 시 고려해야 할 가장 중요한 요소는?"
    options:
      - "인덱스 이름"
      - "WHERE 절에 자주 사용되는 컬럼"
      - "테이블 크기"
      - "데이터 타입"
    correctAnswer: 1
    explanation: "인덱스는 WHERE, JOIN, ORDER BY 등에서 자주 사용되는 컬럼에 생성해야 효과적입니다."

  - question: "Covering Index(커버링 인덱스)란?"
    options:
      - "모든 컬럼을 포함하는 인덱스"
      - "쿼리에 필요한 모든 데이터를 인덱스만으로 조회 가능한 경우"
      - "Primary Key 인덱스"
      - "복합 인덱스의 다른 이름"
    correctAnswer: 1
    explanation: "Covering Index는 쿼리에서 필요한 모든 컬럼이 인덱스에 포함되어 있어, 테이블에 접근하지 않고 인덱스만으로 결과를 반환할 수 있는 경우를 말합니다."
---

데이터베이스에서 가장 중요한 성능 최적화 도구는 인덱스입니다. 100만 건의 데이터에서 특정 사용자를 찾는데 0.001초가 걸리는 이유, 같은 쿼리인데 어떤 경우는 빠르고 어떤 경우는 느린 이유를 이해하려면 인덱스를 제대로 알아야 합니다.

## 인덱스란?

책의 색인처럼, 데이터베이스에서 **특정 데이터를 빠르게 찾기 위한 자료구조**입니다.

**인덱스가 없으면:**
```sql
SELECT * FROM users WHERE email = 'john@example.com';
```
- 1,000,000개 레코드를 **처음부터 끝까지 모두 읽어야 함** (Full Table Scan)
- 시간 복잡도: O(n)

**인덱스가 있으면:**
- 인덱스를 통해 **직접 해당 데이터 위치로 이동**
- 시간 복잡도: O(log n)

## 인덱스가 필요한 이유

### 실제 사례로 비교

**테스트 환경:**
- 테이블: `users` (1,000,000개 레코드)
- 쿼리: 이메일로 사용자 검색

```sql
-- 인덱스 없을 때
SELECT * FROM users WHERE email = 'user123@example.com';
-- 실행 시간: 1.2초 (Full Table Scan)

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);

-- 인덱스 있을 때
SELECT * FROM users WHERE email = 'user123@example.com';
-- 실행 시간: 0.002초 (Index Scan)
```

**결과: 600배 빠름**

## B-Tree 인덱스 구조

대부분의 데이터베이스(MySQL, PostgreSQL 등)는 **B-Tree**(Balanced Tree) 구조를 사용합니다.

### B-Tree 특징

1. **균형 잡힌 트리**: 모든 리프 노드의 깊이가 같음
2. **정렬된 상태 유지**: 데이터가 항상 정렬되어 있음
3. **효율적인 범위 검색**: BETWEEN, >, < 등에 유리

### B-Tree 구조 예시

```
              [50]
           /        \
      [20, 40]      [70, 90]
     /   |   \      /   |   \
  [10] [30] [45] [60] [80] [95]
```

- **루트 노드**: 50
- **브랜치 노드**: 20, 40, 70, 90
- **리프 노드**: 실제 데이터 포인터 저장

**검색 과정 (60 찾기):**
1. 루트 노드: 60 > 50 → 오른쪽 이동
2. 브랜치 노드: 60 < 70 → 왼쪽 이동
3. 리프 노드: 60 찾음

**깊이가 3이면 최대 3번 비교로 데이터 찾기 가능**

## B-Tree vs B+Tree

실제 데이터베이스에서는 **B-Tree**보다 **B+Tree**를 더 많이 사용합니다. MySQL의 InnoDB, PostgreSQL 모두 B+Tree를 사용합니다.

### 주요 차이점

| 구분 | B-Tree | B+Tree |
|------|--------|--------|
| **데이터 저장 위치** | 모든 노드에 데이터 저장 | 리프 노드에만 데이터 저장 |
| **리프 노드 연결** | 연결 없음 | 연결 리스트로 연결됨 |
| **범위 검색** | 트리 탐색 필요 | 리프 노드만 순회 |
| **캐시 효율** | 낮음 | 높음 (한 노드에 더 많은 키) |

### B-Tree 구조

```
              [50: data50]
           /                \
    [20: data20]          [70: data70]
     /         \           /         \
[10: data10] [30: data30] [60: data60] [80: data80]
```

- 모든 노드에 데이터 저장
- 검색 시 중간 노드에서 끝날 수 있음

### B+Tree 구조

```
              [50]
           /        \
       [20]          [70]
      /    \        /    \
   [10, 20] ↔ [30, 50] ↔ [60, 70] ↔ [80, 90]
   (data)     (data)     (data)     (data)
```

- 내부 노드는 키만 저장 (데이터 없음)
- 리프 노드에만 실제 데이터(포인터) 저장
- 리프 노드가 연결 리스트로 연결됨

### B+Tree의 장점

**1. 범위 검색에 유리**

```sql
-- 20 <= age <= 50 범위 검색
SELECT * FROM users WHERE age BETWEEN 20 AND 50;
```

- B-Tree: 트리를 여러 번 탐색해야 함
- B+Tree: 시작점만 찾으면 리프 노드를 순회하며 범위 데이터를 빠르게 조회

**2. 더 많은 키를 저장 가능**

- 내부 노드에 데이터가 없어서 더 많은 키를 저장할 수 있음
- 같은 크기의 노드에 더 많은 키 → 트리 높이 감소 → 디스크 I/O 감소

**3. 안정적인 검색 성능**

- B-Tree: 검색 시 O(1) ~ O(log n) (중간 노드에서 찾을 수도 있음)
- B+Tree: 항상 O(log n) (모든 검색이 리프 노드까지 진행)

**4. 순차 접근 최적화**

```sql
-- 전체 데이터 스캔
SELECT * FROM users ORDER BY id;
```

- B+Tree는 리프 노드만 순회하면 되므로 순차 스캔이 매우 빠름

### 실무 예시

```sql
-- 범위 검색 (B+Tree가 유리)
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';

-- 정렬과 범위 검색 (B+Tree가 유리)
SELECT * FROM products
WHERE price >= 10000 AND price <= 50000
ORDER BY price;
```

**B+Tree가 더 효율적인 이유:**
1. 시작점(10000) 찾기: O(log n)
2. 리프 노드 순회: O(k) (k = 결과 개수)
3. 이미 정렬된 상태라 ORDER BY 추가 비용 없음

## 인덱스 생성 및 사용

### 단일 컬럼 인덱스

```sql
-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);

-- 인덱스 사용되는 쿼리
SELECT * FROM users WHERE email = 'john@example.com';
SELECT * FROM users WHERE email LIKE 'john%';
SELECT * FROM users WHERE email > 'a@example.com';
```

### 복합 인덱스 (Multi-Column Index)

```sql
-- 복합 인덱스 생성
CREATE INDEX idx_users_name_age ON users(name, age);
```

**복합 인덱스 활용 규칙:**

```sql
-- ✅ 인덱스 활용 O
WHERE name = 'John'                    -- name만 사용
WHERE name = 'John' AND age = 30       -- name, age 모두 사용
WHERE name = 'John' AND age > 30       -- name, age 모두 사용

-- ❌ 인덱스 활용 X (name을 건너뜀)
WHERE age = 30                         -- 첫 번째 컬럼 누락
WHERE age > 30 AND name = 'John'       -- 순서는 상관없지만 name이 먼저 평가됨
```

**핵심: 왼쪽부터 순서대로 사용해야 함**

### 유니크 인덱스

```sql
-- 유니크 인덱스 (중복 값 허용 안 함)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
```

## 인덱스를 사용할 수 없는 경우

### 1. 함수 사용

```sql
-- ❌ 인덱스 사용 불가
SELECT * FROM users WHERE UPPER(email) = 'JOHN@EXAMPLE.COM';

-- ✅ 인덱스 사용 가능
SELECT * FROM users WHERE email = 'john@example.com';
```

### 2. 부정 조건

```sql
-- ❌ 인덱스 사용 어려움
SELECT * FROM users WHERE name != 'John';
SELECT * FROM users WHERE name NOT IN ('John', 'Jane');

-- ✅ 긍정 조건으로 변경
SELECT * FROM users WHERE name IN ('Alice', 'Bob', 'Charlie');
```

### 3. 와일드카드 시작

```sql
-- ❌ 인덱스 사용 불가
SELECT * FROM users WHERE email LIKE '%@example.com';

-- ✅ 인덱스 사용 가능
SELECT * FROM users WHERE email LIKE 'john%';
```

### 4. 타입 불일치

```sql
-- ❌ 인덱스 사용 불가 (id는 INT인데 문자열로 비교)
SELECT * FROM users WHERE id = '123';

-- ✅ 타입 맞춤
SELECT * FROM users WHERE id = 123;
```

## 인덱스의 장단점

### 장점

1. **검색 속도 향상**: O(n) → O(log n)
2. **정렬 속도 향상**: ORDER BY에서 별도 정렬 불필요
3. **중복 제거**: UNIQUE 인덱스로 데이터 무결성 보장

### 단점

1. **쓰기 작업 느려짐**: INSERT, UPDATE, DELETE 시 인덱스도 업데이트
2. **추가 저장 공간**: 인덱스 자체가 디스크 공간 차지 (테이블 크기의 10-20%)
3. **유지보수 비용**: 인덱스가 많을수록 관리 복잡도 증가

## 실무에서 고려할 점

### 1. 카디널리티 고려

**카디널리티(Cardinality)**: 중복 값이 적을수록 높음

```sql
-- ✅ 카디널리티 높음 (인덱스 효과 좋음)
CREATE INDEX idx_users_email ON users(email);  -- 이메일은 유니크

-- ❌ 카디널리티 낮음 (인덱스 효과 별로)
CREATE INDEX idx_users_gender ON users(gender);  -- 성별은 2-3개 값만
```

**원칙: 카디널리티가 높은 컬럼에 인덱스 생성**

### 2. 인덱스 개수 제한

```sql
-- ❌ 인덱스 과다
CREATE INDEX idx1 ON users(name);
CREATE INDEX idx2 ON users(email);
CREATE INDEX idx3 ON users(age);
CREATE INDEX idx4 ON users(address);
CREATE INDEX idx5 ON users(phone);

-- ✅ 필요한 것만 선택
CREATE INDEX idx_users_email ON users(email);  -- WHERE에 자주 사용
CREATE INDEX idx_users_name_age ON users(name, age);  -- 복합 검색 빈번
```

**권장: 테이블당 3-5개 이내**

### 3. 복합 인덱스 순서

```sql
-- 카디널리티 높은 컬럼을 앞에
CREATE INDEX idx_users_email_name ON users(email, name);  -- email이 더 유니크

-- 자주 단독으로 사용되는 컬럼을 앞에
CREATE INDEX idx_users_name_age ON users(name, age);  -- name으로 검색이 더 빈번
```

### 4. Covering Index 활용

```sql
-- 인덱스에 필요한 모든 컬럼 포함
CREATE INDEX idx_users_email_name_age ON users(email, name, age);

-- 테이블 접근 없이 인덱스만으로 결과 반환
SELECT name, age FROM users WHERE email = 'john@example.com';
```

**효과: 테이블 접근 생략으로 성능 향상**

## 실무 예시

### 사례 1: 로그인 기능 최적화

```sql
-- BEFORE: 인덱스 없음 (1.2초)
SELECT * FROM users WHERE email = 'john@example.com' AND password = 'hash123';

-- AFTER: 복합 인덱스 생성
CREATE INDEX idx_users_email_password ON users(email, password);

-- 결과: 0.002초 (600배 개선)
```

### 사례 2: 페이징 쿼리 최적화

```sql
-- BEFORE: ORDER BY에서 정렬 발생 (2.5초)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 1000;

-- AFTER: created_at 인덱스 생성
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- 결과: 0.05초 (50배 개선)
```

### 사례 3: 범위 검색 최적화

```sql
-- BEFORE: Full Table Scan (0.8초)
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';

-- AFTER: 날짜 인덱스 생성
CREATE INDEX idx_orders_date ON orders(order_date);

-- 결과: 0.01초 (80배 개선)
```

## 인덱스 모니터링

### 인덱스 사용 확인

```sql
-- MySQL
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- 출력 예시
+----+-------------+-------+------+------------------+
| id | select_type | table | type | key              |
+----+-------------+-------+------+------------------+
|  1 | SIMPLE      | users | ref  | idx_users_email  |
+----+-------------+-------+------+------------------+
```

**type 컬럼:**
- `const`: Primary Key나 Unique Index로 단일 레코드 접근 (가장 빠름)
- `ref`: Non-Unique Index 사용
- `range`: 범위 검색
- `index`: 인덱스 풀 스캔
- `ALL`: Full Table Scan (가장 느림)

### 사용되지 않는 인덱스 찾기

```sql
-- MySQL 8.0 이상
SELECT * FROM sys.schema_unused_indexes;
```

## 다양한 인덱스 타입

B+Tree 외에도 특정 상황에 최적화된 인덱스 타입들이 있습니다.

### Hash Index

**특징:**
- 해시 함수를 사용해 O(1) 검색 가능
- 동등 비교(`=`)에 최적화
- 범위 검색, 정렬 불가능

```sql
-- MySQL (Memory 엔진에서만 지원)
CREATE TABLE cache (
  key VARCHAR(50),
  value TEXT,
  INDEX USING HASH (key)
) ENGINE=MEMORY;

-- PostgreSQL
CREATE INDEX idx_users_email_hash ON users USING HASH (email);
```

**사용 사례:**
```sql
-- ✅ Hash Index 효율적
SELECT * FROM users WHERE email = 'john@example.com';

-- ❌ Hash Index 사용 불가
SELECT * FROM users WHERE email > 'a@example.com';  -- 범위 검색
SELECT * FROM users ORDER BY email;  -- 정렬
```

**트레이드오프:**
- **장점**: 동등 비교 시 B+Tree보다 빠름
- **단점**: 범위 검색 불가, 정렬 불가, 메모리 테이블에서만 효과적

### Full-Text Index

**특징:**
- 텍스트 검색에 최적화
- 단어 단위 검색, 자연어 검색 지원
- LIKE 검색보다 훨씬 빠름

```sql
-- MySQL
CREATE FULLTEXT INDEX idx_posts_content ON posts(title, content);

-- 자연어 검색
SELECT * FROM posts
WHERE MATCH(title, content) AGAINST('database performance' IN NATURAL LANGUAGE MODE);

-- Boolean 모드
SELECT * FROM posts
WHERE MATCH(title, content) AGAINST('+database -mysql' IN BOOLEAN MODE);
```

**트레이드오프:**
- **장점**: 텍스트 검색 성능 향상, 자연어 처리
- **단점**: 저장 공간 많이 사용, 업데이트 비용 높음

### Bitmap Index

**특징:**
- 카디널리티가 낮은 컬럼에 효율적
- 비트 연산으로 빠른 AND/OR 연산
- 주로 데이터 웨어하우스에서 사용

```sql
-- Oracle
CREATE BITMAP INDEX idx_orders_status ON orders(status);

-- 여러 조건 결합에 효율적
SELECT * FROM orders
WHERE status = 'PENDING' AND priority = 'HIGH' AND region = 'ASIA';
```

**트레이드오프:**
- **장점**: 낮은 카디널리티 컬럼에 효율적, 복합 조건 검색 빠름
- **단점**: 쓰기 성능 저하, OLTP에 부적합

### Partial Index (Filtered Index)

**특징:**
- 조건을 만족하는 레코드만 인덱싱
- 인덱스 크기 감소, 성능 향상

```sql
-- PostgreSQL
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'ACTIVE';

-- 쿼리에서 같은 조건 사용 시 인덱스 활용
SELECT * FROM users
WHERE email = 'john@example.com' AND status = 'ACTIVE';
```

```sql
-- MySQL (생성된 컬럼 + 인덱스로 유사하게 구현)
ALTER TABLE users ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (status = 'ACTIVE');
CREATE INDEX idx_active_users ON users(email, is_active);
```

**트레이드오프:**
- **장점**: 인덱스 크기 감소, 특정 조건 검색 빠름
- **단점**: 조건에 맞지 않으면 인덱스 사용 불가

### 인덱스 타입 선택 가이드

| 상황 | 권장 인덱스 | 이유 |
|------|-----------|------|
| 범위 검색, 정렬 | **B+Tree** | 정렬된 구조, 범위 검색 효율적 |
| 동등 비교만 | **Hash** | O(1) 검색, 메모리 테이블 |
| 텍스트 검색 | **Full-Text** | 자연어 검색, LIKE보다 빠름 |
| 낮은 카디널리티 | **Bitmap** | 비트 연산, 복합 조건 빠름 |
| 특정 조건만 | **Partial** | 인덱스 크기 감소, 타겟 검색 |

## 아키텍처로 풀어내는 검색 성능

인덱스만으로 해결하기 어려운 상황에서는 아키텍처 레벨의 접근이 필요합니다.

### 1단계: Cache Layer

**문제:** 같은 데이터를 반복 조회하는 경우

```java
// Before: 매번 DB 조회
@Service
public class UserService {
    public User getUser(Long id) {
        return userRepository.findById(id).orElseThrow();
    }
}

// After: Redis Cache
@Service
public class UserService {
    private final RedisTemplate<String, User> redis;

    @Cacheable(value = "users", key = "#id")
    public User getUser(Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "users", key = "#user.id")
    public void updateUser(User user) {
        userRepository.save(user);
    }
}
```

**효과:**
- DB 부하 감소 (캐시 히트율 80% 가정 시 DB 조회 80% 감소)
- 응답 시간 개선 (Redis: 1ms vs MySQL: 10ms)

**트레이드오프:**
- **장점**: 극도로 빠른 조회, DB 부하 감소
- **단점**: 캐시 무효화 전략 필요, 데이터 불일치 가능성, 추가 인프라 비용

### 2단계: Read Replica

**문제:** 읽기 작업이 쓰기보다 압도적으로 많은 경우

```yaml
# application.yml
spring:
  datasource:
    master:
      jdbc-url: jdbc:mysql://master-db:3306/myapp
      username: admin
      password: secret

    slave:
      jdbc-url: jdbc:mysql://slave-db:3306/myapp
      username: readonly
      password: secret
```

```java
@Service
public class ProductService {
    @Transactional(readOnly = true)  // Read Replica로 라우팅
    public List<Product> searchProducts(String keyword) {
        return productRepository.findByNameContaining(keyword);
    }

    @Transactional  // Master DB로 라우팅
    public void createProduct(Product product) {
        productRepository.save(product);
    }
}
```

**효과:**
- 읽기/쓰기 분리로 Master DB 부하 감소
- 여러 Replica로 읽기 부하 분산

**트레이드오프:**
- **장점**: 읽기 처리량 증가, 장애 격리
- **단점**: 복제 지연(Replication Lag), 인프라 비용 증가, 데이터 일관성 복잡도

### 3단계: Partitioning (파티셔닝)

**문제:** 테이블이 너무 커서 인덱스 효율이 떨어지는 경우

```sql
-- Range Partitioning (날짜 기준)
CREATE TABLE orders (
    id BIGINT,
    user_id BIGINT,
    order_date DATE,
    amount DECIMAL(10,2)
)
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);

-- 특정 파티션만 검색
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';
-- → p2024 파티션만 스캔
```

```sql
-- Hash Partitioning (user_id 기준)
CREATE TABLE user_activities (
    id BIGINT,
    user_id BIGINT,
    activity_type VARCHAR(50),
    created_at TIMESTAMP
)
PARTITION BY HASH(user_id)
PARTITIONS 10;
```

**효과:**
- 파티션 프루닝으로 스캔 범위 축소
- 파티션별 인덱스로 인덱스 크기 감소

**트레이드오프:**
- **장점**: 대용량 테이블 관리 용이, 파티션 단위 백업/복구
- **단점**: 파티션 키 선택 중요, 파티션 간 조인 성능 저하, 관리 복잡도 증가

### 4단계: Sharding (샤딩)

**문제:** 단일 DB로 처리 불가능한 초대규모 데이터

```java
// Sharding Key: user_id
@Service
public class UserShardingService {
    private final List<DataSource> shards;

    private DataSource getShardForUser(Long userId) {
        int shardIndex = (int) (userId % shards.size());
        return shards.get(shardIndex);
    }

    public User getUser(Long userId) {
        DataSource shard = getShardForUser(userId);
        // shard에서 사용자 조회
        return jdbcTemplate.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{userId},
            userRowMapper
        );
    }
}
```

**Sharding 전략:**

| 전략 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **Range** | 범위 기준 분할 | 파티셔닝 용이 | 핫스팟 가능 |
| **Hash** | 해시 기준 분할 | 균등 분산 | 범위 검색 어려움 |
| **Geography** | 지역 기준 분할 | 지연 시간 최소화 | 불균등 분산 가능 |

**트레이드오프:**
- **장점**: 무한 확장 가능, 단일 장애점 제거
- **단점**: 샤드 간 JOIN 불가, 트랜잭션 복잡, 리샤딩 비용 높음, 애플리케이션 복잡도 증가

### 5단계: Search Engine (Elasticsearch)

**문제:** 복잡한 텍스트 검색, 다국어 검색, 실시간 검색어 자동완성

```java
// Elasticsearch + DB 하이브리드
@Service
public class ProductSearchService {
    private final ElasticsearchTemplate elastic;
    private final ProductRepository repository;

    // 검색은 Elasticsearch
    public List<ProductSummary> search(String keyword) {
        SearchHits<ProductDocument> hits = elastic.search(
            Query.multiMatchQuery(keyword, "name", "description"),
            ProductDocument.class
        );
        return hits.stream()
            .map(hit -> new ProductSummary(hit.getId(), hit.getName()))
            .collect(Collectors.toList());
    }

    // 상세 조회는 DB
    public Product getProductDetail(Long id) {
        return repository.findById(id).orElseThrow();
    }

    // 데이터 변경 시 동기화
    @Transactional
    public void updateProduct(Product product) {
        repository.save(product);
        elastic.save(ProductDocument.from(product));  // ES 동기화
    }
}
```

**Elasticsearch 강점:**
- 역색인(Inverted Index)으로 빠른 텍스트 검색
- 형태소 분석, 동의어 처리
- 실시간 집계(Aggregation)

**트레이드오프:**
- **장점**: 복잡한 텍스트 검색 성능, 다국어 지원, 실시간 분석
- **단점**: 추가 인프라, DB-ES 동기화 필요, 트랜잭션 미지원, 운영 복잡도

### 아키텍처 선택 가이드

| 규모/상황 | 권장 아키텍처 | 이유 |
|----------|-------------|------|
| **~10만 건** | 인덱스 최적화 | 단일 DB로 충분 |
| **10만~100만 건** | 인덱스 + Cache | 반복 조회 최적화 |
| **100만~1000만 건** | Cache + Read Replica | 읽기 부하 분산 |
| **1000만~1억 건** | Partitioning + Cache | 파티션 단위 관리 |
| **1억 건 이상** | Sharding | 수평 확장 |
| **텍스트 검색 중심** | Elasticsearch | 전문 검색 엔진 |

### 진화 경로 예시

```
1단계: 인덱스 추가
   ↓ (데이터 증가, 반복 조회 증가)
2단계: Redis Cache 도입
   ↓ (읽기 부하 증가)
3단계: Read Replica 추가
   ↓ (테이블 크기 증가)
4단계: Partitioning 적용
   ↓ (단일 DB 한계)
5단계: Sharding 도입
   ↓ (복잡한 검색 요구사항)
6단계: Elasticsearch 추가
```

## 정리

**인덱스는 검색 성능을 극적으로 향상시키는 핵심 기술**입니다.

**핵심 원칙:**
1. WHERE, JOIN에 자주 사용되는 컬럼에 인덱스 생성
2. 카디널리티가 높은 컬럼 선택
3. 복합 인덱스는 왼쪽부터 순서대로 사용
4. 함수 사용, 부정 조건, 와일드카드 시작은 인덱스 사용 불가
5. 쓰기 작업이 많으면 인덱스 개수 최소화
6. EXPLAIN으로 실행 계획 확인

**트레이드오프:**
- 읽기 성능 ⬆️ vs 쓰기 성능 ⬇️
- 검색 속도 ⬆️ vs 저장 공간 ⬆️

실무에서는 **자주 조회되는 쿼리를 분석**하고, **병목 지점에 선택적으로 인덱스를 추가**하는 것이 중요합니다. 인덱스만으로 부족하다면 아키텍처 레벨의 해결책을 고려해야 합니다.
