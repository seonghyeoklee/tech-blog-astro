---
term: 'NoSQL'
aliases: ['NoSQL DB', '비관계형 데이터베이스']
category: 'database'
summary: 'Not Only SQL. RDB의 고정 스키마와 JOIN을 벗어나 유연한 데이터 모델과 수평 확장을 지원하는 데이터베이스 유형'
---

## 정의

NoSQL은 관계형 데이터베이스(RDB)의 테이블 기반 구조를 따르지 않는 데이터베이스의 총칭입니다. 스키마 유연성과 수평 확장성을 중시합니다.

## NoSQL 유형

| 유형 | 예시 | 특징 |
|------|------|------|
| Document | MongoDB, CouchDB | JSON 형태, 유연한 스키마 |
| Key-Value | Redis, DynamoDB | 단순 조회, 캐시 |
| Column-Family | Cassandra, HBase | 대용량 쓰기, 시계열 |
| Graph | Neo4j, Neptune | 관계 탐색, 추천 |

## 특징

- **스키마 유연성**: 필드 추가/변경이 자유로움
- **수평 확장**: 샤딩으로 서버 추가 확장
- **최종 일관성**: 강한 일관성 대신 가용성 우선 (BASE)
- **No JOIN**: 비정규화, 데이터 임베딩

## RDB vs NoSQL

```
RDB:    정규화 → JOIN → 일관성 강함 → 수직 확장
NoSQL:  비정규화 → 임베딩 → 확장 쉬움 → 수평 확장
```

## 사용 사례

- 캐시, 세션 저장 (Redis)
- 로그, 이벤트 수집 (MongoDB, Elasticsearch)
- 대용량 시계열 데이터 (Cassandra)
- 소셜 네트워크 관계 (Neo4j)
