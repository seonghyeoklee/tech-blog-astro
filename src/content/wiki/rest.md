---
term: 'REST'
aliases: ['RESTful', 'REST API', 'Representational State Transfer']
category: 'architecture'
summary: 'HTTP를 기반으로 리소스를 표현하고 조작하는 아키텍처 스타일'
related: [tls, base]
---

REST는 HTTP 프로토콜을 활용하여 리소스를 CRUD하는 아키텍처 스타일입니다.

## 원칙

1. **리소스 중심 URI**: `/users`, `/orders/123`
2. **HTTP 메서드로 행위 표현**: GET, POST, PUT, DELETE
3. **무상태(Stateless)**: 각 요청은 독립적
4. **표현을 통한 리소스 조작**: JSON, XML

## RESTful API 예시

```
GET    /users          # 목록 조회
GET    /users/123      # 단건 조회
POST   /users          # 생성
PUT    /users/123      # 수정
DELETE /users/123      # 삭제
```

## 나쁜 예

```
GET  /getUsers         ❌
POST /createUser       ❌
POST /deleteUser?id=1  ❌
```

## 관련 글

- [HTTP 프로토콜 - 웹의 기본 통신 규약](/blog/http-protocol)
