---
term: 'Circuit Breaker'
aliases: ['서킷 브레이커', '회로 차단기']
category: 'architecture'
summary: '장애가 발생한 서비스로의 호출을 차단하여 장애 전파를 방지하는 패턴. 일정 시간 후 복구 여부를 확인한다.'
---

# Circuit Breaker 패턴

전기 회로의 차단기처럼 장애가 발생한 서비스로의 호출을 차단하는 패턴입니다.

## 상태

- **Closed**: 정상 상태, 호출 허용
- **Open**: 장애 감지, 호출 차단 (빠른 실패 반환)
- **Half-Open**: 복구 확인 중, 일부 호출 허용

## 동작 흐름

```
Closed → (실패 임계치 도달) → Open
Open → (타임아웃 후) → Half-Open
Half-Open → (성공) → Closed
Half-Open → (실패) → Open
```

## 구현 예시 (Resilience4j)

```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "fallback")
public Payment processPayment(Order order) {
    return paymentClient.process(order);
}
```
