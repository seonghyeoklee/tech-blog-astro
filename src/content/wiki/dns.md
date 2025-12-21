---
term: 'DNS'
aliases: ['Domain Name System', '도메인 네임 시스템']
category: 'infra'
summary: '도메인 이름을 IP 주소로 변환하는 분산 데이터베이스 시스템'
---

DNS는 사람이 읽기 쉬운 도메인 이름(example.com)을 컴퓨터가 이해하는 IP 주소(43.201.52.89)로 변환합니다.

## DNS 서버 계층

1. **Root DNS**: TLD 서버 위치 안내
2. **TLD DNS**: .com, .kr 등 관리
3. **Authoritative DNS**: 실제 레코드 관리

## 주요 레코드

| 타입 | 용도 |
|------|------|
| A | 도메인 → IPv4 |
| AAAA | 도메인 → IPv6 |
| CNAME | 도메인 → 도메인 (별칭) |
| MX | 메일 서버 |

## TTL

캐시 유지 시간. 짧으면 변경이 빨리 반영되지만 DNS 조회가 많아집니다.

## 관련 글

- [DNS와 로드밸런싱 - 요청이 서버에 도달하는 과정](/blog/dns-load-balancing)
