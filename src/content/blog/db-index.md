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

실무에서는 **자주 조회되는 쿼리를 분석**하고, **병목 지점에 선택적으로 인덱스를 추가**하는 것이 중요합니다.
