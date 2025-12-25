---
term: '기아'
aliases: ['Starvation', '기아 문제', '프로세스 기아']
category: 'general'
summary: '우선순위가 낮은 프로세스가 CPU를 할당받지 못해 무한정 대기하는 현상'
related: [deadlock, race-condition, time-slice]
---

기아(Starvation)는 특정 프로세스가 계속 CPU를 할당받지 못하는 문제입니다.

## 발생 원인

- SJF 스케줄링에서 긴 작업 뒤에 짧은 작업이 계속 들어올 때
- 우선순위 스케줄링에서 높은 우선순위 프로세스가 계속 실행될 때

## 예시

```
대기열: [A(10분), B(1분), C(1분), D(1분)...]
스케줄링: SJF

→ B, C, D... 1분짜리가 계속 들어오면
→ A는 영원히 실행 안됨
```

## 해결 방법

- **에이징(Aging)**: 대기 시간이 길어지면 우선순위 증가
- **Round Robin**: 모든 프로세스에 공평하게 기회 부여
- **우선순위 부스트**: 일정 시간 대기 후 우선순위 상승

## 관련 글

- [프로세스 스케줄링](/blog/process-scheduling)
