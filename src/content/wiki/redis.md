---
term: 'Redis'
aliases: ['레디스', 'Remote Dictionary Server']
category: 'database'
summary: '인메모리 Key-Value 저장소. 캐시, 세션, 메시지 브로커로 활용되며 밀리초 단위의 빠른 응답 제공'
---

## 정의

Redis는 인메모리 기반 Key-Value 저장소입니다. 모든 데이터를 메모리에 저장해 매우 빠른 읽기/쓰기가 가능합니다.

## 주요 자료구조

| 타입 | 설명 | 사용 예시 |
|------|------|----------|
| String | 기본 키-값 | 캐시, 세션 |
| Hash | 필드-값 쌍 | 사용자 정보 |
| List | 순서 있는 목록 | 최근 활동 |
| Set | 중복 없는 집합 | 태그, 좋아요 |
| Sorted Set | 점수 기반 정렬 | 랭킹, 리더보드 |

## 기본 명령어

```bash
SET user:1:name "kim"     # 문자열 저장
GET user:1:name           # 조회
EXPIRE user:1:name 3600   # TTL 설정 (1시간)
INCR counter              # 원자적 증가
```

## Spring에서 사용

```java
@Cacheable(value = "products", key = "#id")
public Product getProduct(Long id) {
    return productRepository.findById(id);
}

// RedisTemplate 직접 사용
redisTemplate.opsForValue().set("key", value, Duration.ofHours(1));
```

## 주요 용도

- **캐시**: DB 부하 감소, 응답 속도 향상
- **세션 저장**: 분산 환경에서 세션 공유
- **Rate Limiting**: API 호출 제한
- **Pub/Sub**: 실시간 메시지 전달
- **분산 락**: 동시성 제어

## 주의사항

- 메모리 한계 → maxmemory 정책 설정
- 영속성 필요 시 RDB/AOF 설정
- 단일 스레드 → 긴 명령어 피하기
