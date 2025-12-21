---
term: 'MSA'
aliases: ['마이크로서비스', 'Microservices', '마이크로서비스 아키텍처']
category: 'architecture'
summary: '애플리케이션을 작은 독립 서비스들로 분리하는 아키텍처. 서비스별 독립 배포와 확장이 가능하지만 운영 복잡도가 높다.'
---

# MSA (Microservices Architecture)

애플리케이션을 비즈니스 도메인별로 작은 서비스들로 분리하여 개발/배포하는 아키텍처입니다.

## 특징

- 서비스별 독립적인 배포 단위
- 서비스 간 네트워크 통신 (REST, gRPC, 메시지 큐)
- 서비스별 독립 데이터베이스 (Database per Service)

## 장점

- 서비스별 독립 배포 및 확장 가능
- 장애 격리 (Circuit Breaker 패턴)
- 서비스별 기술 스택 선택 자유

## 단점

- 분산 시스템의 복잡성 (네트워크 지연, 장애)
- 분산 트랜잭션 문제 (SAGA 패턴 필요)
- 운영 인프라 복잡 (K8s, 서비스 메시 등)
