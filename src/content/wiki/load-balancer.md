---
term: 'Load Balancer'
aliases: ['로드밸런서', 'LB', '부하분산기']
category: 'infra'
summary: '여러 서버로 트래픽을 분산시키는 네트워크 장비 또는 소프트웨어'
related: ['health-check', 'dns', 'round-robin']
---

로드밸런서는 들어오는 트래픽을 여러 서버에 분산하여 부하를 나누고 가용성을 높입니다.

## L4 vs L7

| L4 | L7 |
|-----|-----|
| TCP/UDP 레벨 | HTTP 레벨 |
| IP/Port 기반 | URL/Header 기반 |
| 빠름 | 정교한 라우팅 |
| AWS NLB | AWS ALB, Nginx |

## 분산 알고리즘

- **Round Robin**: 순서대로
- **Least Connections**: 연결 적은 서버로
- **IP Hash**: 같은 IP는 같은 서버로

## Health Check

주기적으로 서버 상태 확인, 장애 서버는 자동 제외

## 관련 글

- [DNS와 로드밸런싱 - 요청이 서버에 도달하는 과정](/blog/dns-load-balancing)
