---
term: 'Clustered Index'
aliases: ['클러스터형 인덱스', '클러스터드 인덱스']
category: 'database'
summary: '테이블 데이터가 인덱스 키 순서대로 물리적으로 정렬된 인덱스'
related: [index, b-plus-tree, covering-index, innodb]
---

클러스터형 인덱스는 테이블당 하나만 존재할 수 있으며, InnoDB에서는 Primary Key가 클러스터형 인덱스가 됩니다.

## 특징

- 리프 노드에 실제 데이터 행이 저장됨
- 테이블당 1개만 가능
- PK 조회가 가장 빠름

## 보조 인덱스와 차이

```
클러스터형: 리프 노드 = 실제 데이터
보조 인덱스: 리프 노드 = PK 값 → 클러스터형 인덱스 재조회 필요
```

## 관련 글

- [인덱스 기초 - 왜 빠르고 언제 느린가](/blog/db-index-fundamentals)
