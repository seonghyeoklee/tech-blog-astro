---
term: 'CPU 바운드'
aliases: ['CPU Bound', 'CPU-bound', '연산 집약적']
category: 'general'
summary: 'CPU 계산이 많아서 CPU 성능에 의해 실행 속도가 결정되는 작업'
---

CPU 바운드 작업은 CPU 계산이 대부분인 작업입니다.

## 특징

- CPU를 계속 사용
- I/O 대기가 거의 없음
- CPU 성능이 실행 속도 결정

## 예시

- 동영상 인코딩
- 이미지 처리
- 암호화/복호화
- 과학 계산
- 데이터 압축

## 최적화

- CPU 코어 수만큼 스레드 사용
- 병렬 처리 (멀티코어 활용)
- 알고리즘 최적화

## 스레드 풀 크기

```java
// CPU 바운드는 코어 수 + 1 정도
int size = Runtime.getRuntime().availableProcessors() + 1;
```

## 관련 글

- [프로세스 스케줄링](/blog/process-scheduling)
- [프로세스와 스레드](/blog/process-and-thread)
