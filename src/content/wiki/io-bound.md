---
term: 'I/O 바운드'
aliases: ['IO Bound', 'I/O-bound', 'IO-bound']
category: 'general'
summary: '디스크 읽기, 네트워크 요청 등 I/O 대기가 많아서 I/O 성능에 의해 실행 속도가 결정되는 작업'
related: [cpu-bound, thread-pool]
---

I/O 바운드 작업은 I/O 대기가 대부분인 작업입니다.

## 특징

- CPU 사용 시간이 짧음
- I/O 대기 시간이 긺
- I/O 성능이 실행 속도 결정

## 예시

- 웹 서버 (HTTP 요청/응답)
- 데이터베이스 조회
- 파일 읽기/쓰기
- 네트워크 통신
- API 호출

## 최적화

- 스레드 수를 많이 설정
- 비동기 I/O 사용
- 캐싱 적용

## 스레드 풀 크기

```java
// I/O 바운드는 코어 수보다 훨씬 많게
int size = Runtime.getRuntime().availableProcessors() * 2;
// 또는 50~200
```

Tomcat 기본값 200 (웹 요청은 I/O 바운드)

## 관련 글

- [프로세스 스케줄링](/blog/process-scheduling)
- [프로세스와 스레드](/blog/process-and-thread)
