---
term: 'HTTP'
aliases: ['HyperText Transfer Protocol']
category: 'infra'
summary: '웹에서 클라이언트와 서버 간 데이터를 주고받기 위한 프로토콜'
---

HTTP(HyperText Transfer Protocol)는 웹의 기본 통신 프로토콜입니다.

## 특징

- 요청-응답 구조
- 무상태(Stateless)
- 텍스트 기반 (HTTP/1.1)

## HTTP 메서드

| 메서드 | 용도 |
|--------|------|
| GET | 조회 |
| POST | 생성 |
| PUT | 전체 수정 |
| PATCH | 부분 수정 |
| DELETE | 삭제 |

## 버전

- HTTP/1.1: Keep-Alive, Pipelining
- HTTP/2: 멀티플렉싱, 헤더 압축
- HTTP/3: QUIC (UDP 기반)

## 관련 글

- [HTTP 프로토콜 - 웹의 기본 통신 규약](/blog/http-protocol)
