---
term: '스레드 풀'
aliases: ['Thread Pool', 'ThreadPool']
category: 'general'
summary: '미리 생성해둔 스레드들을 재사용하여 스레드 생성 비용을 줄이는 기법'
---

스레드 풀(Thread Pool)은 스레드를 미리 일정 개수 만들어두고, 작업이 들어오면 유휴 스레드에 할당하는 방식입니다.

## 동작 방식

1. 애플리케이션 시작 시 일정 개수의 스레드 생성
2. 작업이 들어오면 유휴 스레드에 할당
3. 작업 완료 후 스레드는 풀로 반환
4. 모든 스레드가 사용 중이면 작업은 큐에서 대기

## 장점

- 스레드 생성/삭제 비용 절감
- 스레드 수 제한으로 시스템 자원 보호
- 작업 큐를 통한 요청 관리

## 크기 설정 가이드

| 작업 유형 | 권장 크기 |
|----------|----------|
| CPU 바운드 | CPU 코어 수 + 1 |
| I/O 바운드 | 코어 수보다 많이 |

## Java 예시

```java
ExecutorService executor = Executors.newFixedThreadPool(10);
executor.submit(() -> doWork());
```
