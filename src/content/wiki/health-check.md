---
term: 'Health Check'
aliases: ['헬스체크', '상태 검사']
category: 'infra'
summary: '서버나 서비스가 정상 동작하는지 주기적으로 확인하는 메커니즘'
---

Health Check는 로드밸런서나 오케스트레이터가 서버 상태를 확인하는 방법입니다.

## 동작 방식

```
Load Balancer → GET /health → Server
                    ↓
                200 OK → 정상
                5xx/Timeout → 장애
```

## Spring Boot

```java
@GetMapping("/health")
public ResponseEntity<String> health() {
    if (isHealthy()) {
        return ResponseEntity.ok("OK");
    }
    return ResponseEntity.status(503).body("Unhealthy");
}
```

## Spring Actuator

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health
```

`/actuator/health` 엔드포인트 자동 제공

## 관련 글

- [DNS와 로드밸런싱 - 요청이 서버에 도달하는 과정](/blog/dns-load-balancing)
