---
term: 'Round Robin'
aliases: ['라운드 로빈', 'RR 스케줄링']
category: 'general'
summary: '각 프로세스에 동일한 시간(타임 슬라이스)을 할당하는 공평한 스케줄링 방식'
related: [dns, health-check]
---

Round Robin은 가장 널리 사용되는 CPU 스케줄링 알고리즘입니다.

## 동작 원리

1. 각 프로세스에 동일한 시간(타임 슬라이스) 할당
2. 시간이 끝나면 다음 프로세스로 전환
3. 대기열의 끝으로 이동

## 특징

- 공평성: 모든 프로세스가 동등한 기회
- 응답성: 긴 작업도 정기적으로 실행
- 오버헤드: 컨텍스트 스위칭 비용 존재

## 관련 글

- [프로세스 스케줄링](/blog/process-scheduling)
