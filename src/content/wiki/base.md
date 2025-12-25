---
term: 'BASE'
aliases: ['BASE 모델', 'Basically Available']
category: 'database'
summary: 'NoSQL의 일관성 모델. ACID 대신 가용성과 확장성을 우선시하며 최종 일관성을 보장'
related: [acid, cap, eventual-consistency]
---

## 정의

BASE는 NoSQL 시스템의 설계 철학으로, ACID의 강한 일관성 대신 가용성과 확장성을 우선시합니다.

## BASE 구성

| 약자 | 의미 | 설명 |
|------|------|------|
| **BA** | Basically Available | 기본적으로 가용성 보장 |
| **S** | Soft state | 상태가 시간에 따라 변할 수 있음 |
| **E** | Eventual consistency | 최종적으로 일관성 도달 |

## ACID vs BASE

```
ACID: 트랜잭션 완료 즉시 모든 노드에서 같은 데이터
BASE: 일시적 불일치 허용, 결국에는 동기화됨
```

| ACID | BASE |
|------|------|
| 강한 일관성 | 최종 일관성 |
| 가용성 희생 가능 | 가용성 우선 |
| 수직 확장 | 수평 확장 |
| RDB | NoSQL |

## 최종 일관성 예시

```
1. 사용자가 게시글 작성
2. Primary 노드에 저장됨
3. Secondary 노드에 복제 중... (수 ms ~ 수 초)
4. 다른 사용자가 조회 → 아직 안 보일 수 있음
5. 복제 완료 → 모든 노드에서 동일하게 보임
```

## 적합한 사례

- 소셜 미디어 피드
- 상품 리뷰, 좋아요
- 로그, 분석 데이터
- 캐시 데이터

## 부적합한 사례

- 은행 잔액
- 재고 수량
- 결제 처리
