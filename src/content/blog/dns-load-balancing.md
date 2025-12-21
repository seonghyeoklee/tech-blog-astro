---
title: 'DNS와 로드밸런싱 - 요청이 서버에 도달하는 과정'
description: 'DNS 동작 원리와 L4/L7 로드밸런서의 차이를 정리했습니다'
pubDate: 'Dec 14 2024'
tags: ['CS', 'Network']
series: 'network-fundamentals'
seriesOrder: 3
quiz:
  - question: "DNS에서 도메인 이름을 IP 주소로 변환하는 실제 레코드를 관리하는 서버는?"
    options:
      - "Root DNS 서버"
      - "TLD DNS 서버"
      - "Authoritative DNS 서버"
      - "로컬 DNS 서버"
    correctAnswer: 2
    explanation: "Authoritative(권한) DNS 서버가 해당 도메인의 실제 레코드를 관리합니다. Root와 TLD 서버는 다음 단계 DNS 서버 위치를 안내하는 역할입니다."
  - question: "L4 로드밸런서와 L7 로드밸런서의 차이는?"
    options:
      - "L4는 HTTP 헤더 기반, L7은 IP 기반"
      - "L4는 IP/Port 기반, L7은 HTTP 내용 기반"
      - "둘 다 같은 레이어에서 동작"
      - "L7이 더 빠름"
    correctAnswer: 1
    explanation: "L4는 TCP/UDP 레벨(IP, Port)에서 라우팅하고, L7은 HTTP 레벨(URL, Header, Cookie)에서 라우팅합니다. L7이 더 정교하지만 처리 오버헤드가 있습니다."
  - question: "DNS TTL(Time To Live)이 짧으면 어떤 현상이 발생하는가?"
    options:
      - "DNS 변경이 느리게 반영됨"
      - "DNS 조회가 자주 발생함"
      - "캐시 효율이 높아짐"
      - "보안이 강화됨"
    correctAnswer: 1
    explanation: "TTL이 짧으면 캐시가 빨리 만료되어 DNS 조회가 자주 발생합니다. 대신 레코드 변경이 빨리 반영됩니다. TTL이 길면 반대입니다."
  - question: "로드밸런서의 Health Check가 실패하면?"
    options:
      - "모든 서버로 트래픽 중단"
      - "해당 서버를 트래픽 분배에서 제외"
      - "서버가 자동으로 재시작됨"
      - "관리자에게 알림만 발송"
    correctAnswer: 1
    explanation: "Health Check에 실패한 서버는 로드밸런서의 트래픽 분배 대상에서 자동으로 제외됩니다. 서버가 복구되면 다시 트래픽을 받습니다."
---

브라우저에 `api.example.com`을 입력하면 어떤 일이 일어날까요? 도메인 이름이 어떻게 서버 IP가 되고, 여러 서버 중 어떤 서버가 요청을 처리하는지 알면 인프라 문제를 쉽게 진단할 수 있습니다.

## DNS 동작 원리

DNS(Domain Name System)는 도메인 이름을 IP 주소로 변환합니다.

### DNS 조회 과정

```
사용자                                             DNS 서버들
  │
  │  api.example.com 의 IP는?
  │ ─────────────────────────────────────────→ 로컬 DNS (ISP)
  │                                                  │
  │                                                  │ 캐시에 없음
  │                                                  ▼
  │                                            루트 DNS 서버
  │                                            "com은 여기로"
  │                                                  │
  │                                                  ▼
  │                                            .com TLD 서버
  │                                            "example.com은 여기로"
  │                                                  │
  │                                                  ▼
  │                                            권한 DNS 서버
  │                                            (example.com 관리)
  │                                            "api.example.com = 43.201.52.89"
  │                                                  │
  │ ←─────────────────────────────────────────────────
  │  43.201.52.89
  │
  ▼
서버 접속
```

### DNS 서버 계층

```
┌─────────────────────────────────────────────────────────┐
│  Root DNS Servers (13개 클러스터)                        │
│  전 세계에 분산되어 있음                                  │
│  .com, .org, .kr 등 TLD 서버 위치를 알려줌               │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  TLD (Top-Level Domain) DNS Servers                     │
│  .com → Verisign이 관리                                  │
│  .kr → KISA가 관리                                       │
│  해당 도메인의 권한 DNS 서버 위치를 알려줌                │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Authoritative DNS Servers (권한 DNS)                   │
│  example.com 도메인의 실제 레코드를 관리                  │
│  Route 53, Cloudflare DNS 등                            │
└─────────────────────────────────────────────────────────┘
```

### DNS 캐싱과 TTL

매번 DNS 서버를 조회하면 느리기 때문에 캐시를 사용합니다.

```
┌─────────────────────────────────────────────────────────┐
│  캐싱 레이어                                            │
│                                                         │
│  브라우저 캐시        → 가장 먼저 확인 (짧은 TTL)        │
│       ↓                                                 │
│  OS 캐시              → /etc/hosts, DNS 캐시            │
│       ↓                                                 │
│  로컬 DNS (ISP)       → 여러 사용자가 공유              │
│       ↓                                                 │
│  상위 DNS 서버        → 재귀적 조회                     │
└─────────────────────────────────────────────────────────┘
```

TTL(Time To Live)은 캐시 유지 시간입니다.

```bash
# DNS 레코드 확인
$ dig api.example.com

;; ANSWER SECTION:
api.example.com.   300   IN   A   43.201.52.89
#                  ^^^
#                  TTL: 300초 (5분)
```

TTL이 짧으면 변경이 빨리 반영되지만 DNS 조회가 많아집니다.

## DNS 레코드 종류

### A 레코드

도메인을 IPv4 주소로 매핑합니다.

```
api.example.com    A    43.201.52.89
```

### AAAA 레코드

도메인을 IPv6 주소로 매핑합니다.

```
api.example.com    AAAA    2001:0db8:85a3::8a2e:0370:7334
```

### CNAME 레코드

도메인을 다른 도메인으로 매핑합니다. 별칭(Alias)입니다.

```
www.example.com    CNAME    example.com
api.example.com    CNAME    api-lb-123.elb.amazonaws.com
```

CNAME은 다시 조회가 필요해서 약간의 지연이 있습니다.

### MX 레코드

메일 서버를 지정합니다.

```
example.com    MX    10    mail1.example.com
example.com    MX    20    mail2.example.com
#                   ^^^
#                   우선순위 (낮을수록 먼저)
```

### TXT 레코드

텍스트 정보를 저장합니다. SPF, DKIM 등 이메일 인증에 사용됩니다.

```
example.com    TXT    "v=spf1 include:_spf.google.com ~all"
```

### 실무 설정 예시

```
# Route 53 등에서 설정

# 루트 도메인
example.com         A      43.201.52.89

# www는 루트로 리다이렉트
www.example.com     CNAME  example.com

# API는 로드밸런서로
api.example.com     CNAME  api-lb-123.elb.amazonaws.com

# 개발 서버
dev.example.com     A      10.0.1.100
```

## 로드밸런서의 역할

여러 서버로 트래픽을 분산합니다.

### 왜 필요한가

```
로드밸런서 없음                    로드밸런서 있음
     │                                  │
     ▼                                  ▼
┌─────────┐                      ┌─────────────┐
│ Server  │ ← 모든 요청          │ Load        │
└─────────┘                      │ Balancer    │
     │                           └──────┬──────┘
     ▼                           ┌──────┼──────┐
   과부하                        ▼      ▼      ▼
   장애 발생                  Server  Server  Server
                              (분산 처리)
```

장점:
- 트래픽 분산
- 장애 서버 자동 제외 (Health Check)
- 스케일 아웃 용이

### L4 vs L7 로드밸런서

```
┌─────────────────────────────────────────────────────────┐
│  L4 로드밸런서 (Transport Layer)                        │
│                                                         │
│  - TCP/UDP 레벨에서 동작                                │
│  - IP, Port 기반 라우팅                                 │
│  - 빠름 (패킷만 보고 결정)                               │
│  - HTTP 내용을 모름                                     │
│                                                         │
│  AWS: NLB (Network Load Balancer)                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  L7 로드밸런서 (Application Layer)                      │
│                                                         │
│  - HTTP/HTTPS 레벨에서 동작                             │
│  - URL, Header, Cookie 기반 라우팅                      │
│  - L4보다 느림 (HTTP 파싱 필요)                          │
│  - 더 정교한 라우팅 가능                                 │
│                                                         │
│  AWS: ALB (Application Load Balancer)                  │
│  Nginx, HAProxy                                         │
└─────────────────────────────────────────────────────────┘
```

L7 라우팅 예시:

```
/api/*      → API 서버 그룹
/static/*   → 정적 파일 서버
/admin/*    → 관리자 서버
```

### 로드밸런싱 알고리즘

**Round Robin**

순서대로 돌아가며 분배합니다.

```
요청1 → Server1
요청2 → Server2
요청3 → Server3
요청4 → Server1
...
```

**Least Connections**

연결이 가장 적은 서버로 보냅니다.

```
Server1: 10 connections
Server2: 5 connections  ← 여기로
Server3: 8 connections
```

**IP Hash**

클라이언트 IP를 해시해서 항상 같은 서버로 보냅니다.

```
Client A (1.2.3.4)  → 항상 Server1
Client B (5.6.7.8)  → 항상 Server2
```

세션 유지가 필요할 때 사용합니다.

### Health Check

서버 상태를 주기적으로 확인합니다.

```
Load Balancer
     │
     │ ─── GET /health (매 10초) ───→ Server1: 200 OK ✓
     │ ─── GET /health (매 10초) ───→ Server2: 200 OK ✓
     │ ─── GET /health (매 10초) ───→ Server3: 503 ✗
     │
     ▼
Server3 제외, 요청을 Server1, Server2로만 분배
```

Spring Boot Health Check:

```java
@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        // DB 연결 체크 등
        if (isHealthy()) {
            return ResponseEntity.ok("OK");
        }
        return ResponseEntity.status(503).body("Unhealthy");
    }
}
```

## 실무 구성 예시

### AWS ALB + EC2

```
┌─────────────────────────────────────────────────────────┐
│                        Route 53                         │
│          api.example.com → ALB DNS                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Application LB                        │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Target Group: api-servers                       │  │
│   │  Health Check: /health, 30초 간격                │  │
│   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   EC2    │    │   EC2    │    │   EC2    │
    │ (API 1)  │    │ (API 2)  │    │ (API 3)  │
    └──────────┘    └──────────┘    └──────────┘
```

### Nginx 리버스 프록시

Nginx를 로드밸런서로 사용할 수 있습니다.

```nginx
upstream api_servers {
    least_conn;  # Least Connections 알고리즘

    server 10.0.1.1:8080;
    server 10.0.1.2:8080;
    server 10.0.1.3:8080;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        return 200 'OK';
    }
}
```

### Session Sticky

로그인 세션을 서버에 저장하면, 같은 사용자는 같은 서버로 가야 합니다.

```
┌─────────────────────────────────────────────────────────┐
│  Sticky Session (Session Affinity)                      │
│                                                         │
│  User A → (쿠키: SERVERID=server1) → 항상 Server1       │
│  User B → (쿠키: SERVERID=server2) → 항상 Server2       │
└─────────────────────────────────────────────────────────┘
```

하지만 이 방식은 문제가 있습니다.

- 특정 서버에 부하 집중 가능
- 서버 장애 시 세션 유실

해결책: **Stateless 설계**

```
┌─────────────────────────────────────────────────────────┐
│  Stateless Architecture                                 │
│                                                         │
│  - 세션을 서버에 저장하지 않음                           │
│  - JWT 토큰 사용                                        │
│  - 또는 Redis에 세션 저장 (공유)                         │
│                                                         │
│  모든 서버가 같은 상태 → 어디로 가도 OK                  │
└─────────────────────────────────────────────────────────┘
```

```java
@Configuration
@EnableRedisHttpSession
public class SessionConfig {
    // 세션을 Redis에 저장
    // 모든 서버가 같은 Redis를 바라봄
}
```

## 장애 상황별 체크포인트

### DNS 전파 지연

DNS 레코드를 변경했는데 적용이 안 된다면:

```bash
# 현재 DNS 확인
$ dig api.example.com

# 특정 DNS 서버로 조회
$ dig @8.8.8.8 api.example.com

# TTL 확인 - 이 시간이 지나야 갱신됨
```

해결:
- TTL이 지날 때까지 기다림
- 긴급하면 /etc/hosts로 임시 우회

### 로드밸런서 Health Check 실패

서버는 정상인데 트래픽이 안 온다면:

```
1. Health Check 엔드포인트 확인
   $ curl http://server:8080/health

2. 보안 그룹/방화벽 확인
   - LB → Server 포트가 열려 있는가?

3. Health Check 설정 확인
   - 경로, 포트, 타임아웃, 성공 기준
```

### SSL 인증서 만료

HTTPS 접속이 안 되거나 경고가 뜬다면:

```bash
# 인증서 만료일 확인
$ echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Apr  1 00:00:00 2024 GMT  # 만료일
```

해결:
- 인증서 갱신
- Let's Encrypt 자동 갱신 설정 확인

### 502 Bad Gateway

로드밸런서가 백엔드 서버에서 응답을 못 받았습니다.

```
원인:
1. 백엔드 서버 다운
2. 백엔드 서버 포트 닫힘
3. 백엔드 응답 시간 초과
4. 백엔드가 잘못된 응답 반환

확인:
$ curl http://backend-server:8080/health
$ telnet backend-server 8080
```

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- DNS는 도메인을 IP로 변환하며, 캐싱으로 성능을 높입니다
- 로드밸런서는 트래픽을 분산하고 장애 서버를 자동 제외합니다
- L4는 TCP 레벨, L7은 HTTP 레벨에서 동작합니다
- Stateless 설계로 어떤 서버로 가도 동작하게 만드세요
