---
term: 'CAP 정리'
aliases: ['CAP Theorem', 'CAP 이론', 'Brewer의 정리']
category: 'database'
summary: '분산 시스템에서 일관성(C), 가용성(A), 분할 내성(P) 중 2가지만 동시에 만족할 수 있다는 이론'
related: ['base', 'nosql', 'msa', 'sharding']
---

## 정의

CAP 정리는 분산 시스템에서 **Consistency**, **Availability**, **Partition Tolerance** 세 가지를 동시에 완벽히 만족할 수 없다는 이론입니다.

## CAP 구성요소

| 속성 | 의미 | 설명 |
|------|------|------|
| **C** (Consistency) | 일관성 | 모든 노드가 같은 데이터를 봄 |
| **A** (Availability) | 가용성 | 모든 요청에 응답 |
| **P** (Partition Tolerance) | 분할 내성 | 네트워크 단절에도 동작 |

## 선택 조합

```
       Consistency
           △
          / \
         /   \
        / CA  \
       /  RDB  \
      /─────────\
     / CP    AP  \
    / MongoDB  Cassandra
   ▽───────────────▽
Partition      Availability
Tolerance
```

| 조합 | 특징 | 예시 |
|------|------|------|
| **CA** | 네트워크 분할 시 멈춤 | 단일 노드 RDB |
| **CP** | 일관성 우선, 일부 요청 거부 | MongoDB, Redis |
| **AP** | 가용성 우선, 일시적 불일치 허용 | Cassandra, DynamoDB |

## 실무에서의 의미

현실에서 네트워크 분할은 발생할 수 있으므로 P는 필수입니다. 따라서 실질적 선택은 **CP vs AP**입니다.

```
네트워크 단절 시:
CP: 일관성 유지, 일부 요청 실패
AP: 모든 요청 응답, 데이터 불일치 가능
```

## 데이터 특성에 따른 선택

- **금융, 재고**: CP (일관성 필수)
- **소셜 피드, 캐시**: AP (가용성 우선)
