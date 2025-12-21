---
term: 'MongoDB'
aliases: ['몽고DB', 'Mongo']
category: 'database'
summary: 'Document 기반 NoSQL 데이터베이스. JSON 형태로 데이터를 저장하며 유연한 스키마와 수평 확장을 지원'
---

## 정의

MongoDB는 Document 기반 NoSQL 데이터베이스로, 데이터를 BSON(Binary JSON) 형태로 저장합니다. 스키마가 유연하고 수평 확장이 쉽습니다.

## 핵심 개념

| 개념 | RDB 대응 | 설명 |
|------|----------|------|
| Database | Database | 컬렉션들의 그룹 |
| Collection | Table | 도큐먼트들의 집합 |
| Document | Row | JSON 형태의 데이터 단위 |
| Field | Column | 도큐먼트 내 키-값 쌍 |

## Document 구조

```javascript
{
  "_id": ObjectId("..."),
  "name": "상품A",
  "price": 10000,
  "specs": { "cpu": "M3", "ram": "16GB" },  // 중첩 객체
  "tags": ["new", "sale"]                   // 배열
}
```

## 특징

- **유연한 스키마**: 같은 컬렉션에서 다른 구조 가능
- **임베딩**: 관련 데이터를 한 문서에 저장
- **샤딩**: 자동 수평 분산
- **Replica Set**: 복제를 통한 고가용성

## Spring Data MongoDB

```java
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private Map<String, Object> specs;
}
```

## 사용 사례

- 상품 카탈로그 (다양한 속성)
- 사용자 프로필, 로그, 이벤트
- 실시간 분석, 콘텐츠 관리
