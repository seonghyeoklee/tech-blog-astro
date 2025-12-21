---
term: 'HTTPS'
aliases: ['HTTP Secure', 'HTTP over TLS']
category: 'infra'
summary: 'TLS로 암호화된 보안 HTTP 통신'
---

HTTPS는 HTTP에 TLS(Transport Layer Security) 암호화를 추가한 프로토콜입니다.

## 동작 원리

1. TLS Handshake로 암호화 키 교환
2. 대칭키로 데이터 암호화 통신
3. 인증서로 서버 신원 검증

## 포트

- HTTP: 80
- HTTPS: 443

## 필요성

- 데이터 암호화 (도청 방지)
- 데이터 무결성 (변조 방지)
- 서버 인증 (피싱 방지)

## 관련 글

- [HTTP 프로토콜 - 웹의 기본 통신 규약](/blog/http-protocol)
