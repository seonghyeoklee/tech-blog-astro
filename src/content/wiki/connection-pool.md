---
term: 'Connection Pool'
aliases: ['커넥션 풀', 'DBCP', 'HikariCP']
category: 'database'
summary: '데이터베이스 연결을 미리 생성해두고 재사용하는 기법'
---

Connection Pool은 데이터베이스 연결(Connection)을 미리 생성해두고 필요할 때 빌려쓰고 반납하는 방식입니다. 연결 생성/해제 비용을 줄여 성능을 향상시킵니다.

## 동작 방식

1. 애플리케이션 시작 시 일정 개수의 Connection 생성
2. 요청이 오면 풀에서 Connection 대여
3. 작업 완료 후 풀에 Connection 반납
4. 풀이 비어있으면 대기 또는 새 Connection 생성

## 주요 설정

| 설정 | 설명 |
|------|------|
| maximumPoolSize | 최대 커넥션 수 |
| minimumIdle | 유지할 최소 유휴 커넥션 수 |
| connectionTimeout | 커넥션 획득 대기 시간 |
| maxLifetime | 커넥션 최대 수명 |

## HikariCP

Spring Boot 2.0부터 기본 커넥션 풀입니다. 가볍고 빠른 성능이 특징입니다.

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
```

## 주의사항

- 커넥션 누수: 반납하지 않으면 풀이 고갈됨
- 적절한 크기: 너무 크면 DB 부하, 너무 작으면 대기 시간 증가
