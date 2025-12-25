---
term: '타임 슬라이스'
aliases: ['Time Slice', 'Quantum', '퀀텀', '시간 할당량']
category: 'general'
summary: 'Round Robin 스케줄링에서 각 프로세스에 할당되는 CPU 사용 시간'
related: [starvation, cpu-bound]
---

타임 슬라이스는 운영체제가 각 프로세스에 할당하는 CPU 시간입니다.

## 값 설정

- 너무 짧으면: 컨텍스트 스위칭 오버헤드 증가
- 너무 길면: 응답성 저하
- 일반적: 10~100ms (리눅스 기준)

## 예시

타임 슬라이스 20ms일 때:
- 프로세스 A: 20ms 실행 → 대기
- 프로세스 B: 20ms 실행 → 대기
- 프로세스 C: 20ms 실행 → 대기
- 다시 A로...

## 관련 글

- [프로세스 스케줄링](/blog/process-scheduling)
- [컨텍스트 스위칭](/blog/context-switching)
