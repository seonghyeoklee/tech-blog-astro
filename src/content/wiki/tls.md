---
term: 'TLS'
aliases: ['Transport Layer Security', 'SSL']
category: 'infra'
summary: '네트워크 통신을 암호화하는 보안 프로토콜'
related: [rest, base]
---

TLS(Transport Layer Security)는 네트워크 통신을 암호화하여 도청과 변조를 방지하는 프로토콜입니다. SSL의 후속 버전입니다.

## TLS Handshake

1. Client Hello: 지원하는 암호화 방식 전송
2. Server Hello: 선택한 암호화 방식 + 인증서 전송
3. Key Exchange: 대칭키 교환
4. 암호화 통신 시작

## 암호화 방식

- **비대칭키**: 키 교환에 사용 (RSA, ECDHE)
- **대칭키**: 실제 데이터 암호화 (AES)

## 버전

- TLS 1.2: 현재 가장 많이 사용
- TLS 1.3: 더 빠른 Handshake, 보안 강화

## 관련 글

- [HTTP 프로토콜 - 웹의 기본 통신 규약](/blog/http-protocol)
