---
term: 'Race Condition'
aliases: ['레이스 컨디션', '경쟁 상태', '경쟁 조건']
category: 'general'
summary: '여러 스레드가 공유 자원에 동시 접근할 때 실행 순서에 따라 결과가 달라지는 현상'
---

Race Condition은 두 개 이상의 스레드가 공유 자원에 동시에 접근하고, 그 접근 순서에 따라 결과가 달라지는 상황입니다.

## 예시

```java
public class Counter {
    private int count = 0;

    public void increment() {
        count++;  // 원자적이지 않음
    }
}
```

count++는 내부적으로 3단계로 실행됩니다.
1. count 값 읽기
2. 값 증가
3. count에 저장

두 스레드가 동시에 실행하면 값이 꼬일 수 있습니다.

## 해결 방법

- **synchronized**: 한 번에 하나의 스레드만 접근
- **Lock**: 명시적 락 사용
- **Atomic 변수**: AtomicInteger 등 원자적 연산 제공
- **불변 객체**: 상태 변경 자체를 막음

## 관련 개념

- 임계 영역(Critical Section)
- 상호 배제(Mutual Exclusion)
- 데드락(Deadlock)
