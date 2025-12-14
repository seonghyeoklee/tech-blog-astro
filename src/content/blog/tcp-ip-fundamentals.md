---
title: 'TCP/IP 기초 - 네트워크 첫걸음'
description: '백엔드 개발자가 알아야 할 TCP/IP 4계층, 3-way handshake, 패킷 흐름을 정리했습니다'
pubDate: 'Dec 12 2024'
tags: ['CS', 'Network']
series: 'network-fundamentals'
seriesOrder: 1
---

API를 개발하다 보면 네트워크 관련 문제를 자주 만납니다. "Connection timed out", "Connection refused", "Connection reset by peer" 같은 에러 메시지를 보고 원인을 파악하려면 TCP/IP에 대한 이해가 필요합니다.

## TCP/IP 4계층

인터넷 통신은 4개의 계층으로 나뉩니다. 각 계층은 독립적인 역할을 수행합니다.

```
┌─────────────────────────────────────────┐
│  Application Layer (응용 계층)          │ ← HTTP, DNS, SSH
├─────────────────────────────────────────┤
│  Transport Layer (전송 계층)            │ ← TCP, UDP
├─────────────────────────────────────────┤
│  Internet Layer (인터넷 계층)           │ ← IP, ICMP
├─────────────────────────────────────────┤
│  Network Access Layer (네트워크 접근)   │ ← Ethernet, Wi-Fi
└─────────────────────────────────────────┘
```

Spring Boot 애플리케이션으로 요청을 보내면 이렇게 동작합니다.

1. **Application Layer**: HTTP 요청 메시지를 생성합니다
2. **Transport Layer**: TCP 세그먼트로 분할하고 포트 번호를 붙입니다
3. **Internet Layer**: IP 패킷으로 감싸고 목적지 IP를 붙입니다
4. **Network Access Layer**: 이더넷 프레임으로 만들어 물리적으로 전송합니다

각 계층에서 헤더가 추가됩니다. 받는 쪽에서는 역순으로 헤더를 벗겨내면서 원본 데이터를 복원합니다.

## IP - 목적지 찾기

IP(Internet Protocol)는 패킷을 목적지까지 전달하는 역할을 합니다.

```
Source IP: 192.168.0.10 (내 컴퓨터)
    ↓
Destination IP: 43.201.52.89 (AWS EC2)
```

IP의 특징은 다음과 같습니다.

- **비연결형**: 연결을 맺지 않고 바로 전송합니다
- **비신뢰성**: 패킷 도착을 보장하지 않습니다
- **Best Effort**: 최선을 다하지만, 실패해도 책임지지 않습니다

패킷이 중간에 유실되거나 순서가 뒤바뀔 수 있습니다. 이 문제는 TCP가 해결합니다.

## TCP - 신뢰성 보장

TCP(Transmission Control Protocol)는 데이터가 순서대로, 빠짐없이 도착하도록 보장합니다.

### 3-way Handshake

TCP 연결은 3단계로 수립됩니다.

```
Client                          Server
   │                               │
   │────── SYN (seq=100) ─────────>│  1. 연결 요청
   │                               │
   │<──── SYN-ACK (seq=200, ───────│  2. 요청 수락 + 연결 요청
   │      ack=101)                 │
   │                               │
   │────── ACK (seq=101, ─────────>│  3. 연결 확립
   │       ack=201)                │
   │                               │
   │      Connection Established   │
```

1. **SYN**: 클라이언트가 연결을 요청합니다 (Synchronize)
2. **SYN-ACK**: 서버가 요청을 수락하고 역으로 연결을 요청합니다
3. **ACK**: 클라이언트가 확인 응답을 보내면 연결이 수립됩니다

백엔드 개발자가 자주 보는 에러와 연결하면:

- `Connection refused`: 서버가 SYN에 RST로 응답한 경우 (포트가 안 열림)
- `Connection timed out`: SYN을 보냈는데 응답이 없는 경우 (방화벽, 서버 다운)

### 데이터 전송과 ACK

연결이 수립되면 데이터를 주고받습니다. TCP는 모든 데이터에 대해 수신 확인(ACK)을 받습니다.

```
Client                          Server
   │                               │
   │──── Data (seq=101, 100B) ────>│
   │                               │
   │<───── ACK (ack=201) ──────────│  100B 받았음
   │                               │
   │──── Data (seq=201, 150B) ────>│
   │                               │
   │<───── ACK (ack=351) ──────────│  150B 더 받았음
```

ACK가 오지 않으면 재전송합니다. 이렇게 TCP는 신뢰성을 보장합니다.

### 4-way Handshake (연결 종료)

연결 종료는 4단계입니다.

```
Client                          Server
   │                               │
   │────── FIN ───────────────────>│  1. 종료 요청
   │                               │
   │<───── ACK ────────────────────│  2. 확인
   │                               │
   │<───── FIN ────────────────────│  3. 서버도 종료 요청
   │                               │
   │────── ACK ───────────────────>│  4. 확인
   │                               │
   │      Connection Closed        │
```

연결 종료 후 클라이언트는 일정 시간(TIME_WAIT) 대기합니다. 지연된 패킷을 처리하기 위해서입니다.

## TCP vs UDP

| 특성 | TCP | UDP |
|------|-----|-----|
| 연결 | 연결 수립 필요 | 연결 없음 |
| 신뢰성 | 보장 | 보장 안 함 |
| 순서 | 보장 | 보장 안 함 |
| 속도 | 상대적으로 느림 | 빠름 |
| 사용처 | HTTP, 데이터베이스 | DNS, 스트리밍 |

백엔드 API는 대부분 TCP를 사용합니다. HTTP가 TCP 위에서 동작하기 때문입니다.

## 포트 번호

IP 주소가 컴퓨터를 식별한다면, 포트 번호는 그 컴퓨터 안의 애플리케이션을 식별합니다.

```
192.168.0.10:8080  →  43.201.52.89:80
[클라이언트 IP:포트]    [서버 IP:포트]
```

잘 알려진 포트 번호:

| 포트 | 서비스 |
|------|--------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

Spring Boot의 기본 포트 8080은 임의로 정한 것입니다. 1024 이상의 포트는 자유롭게 사용할 수 있습니다.

## 실무에서 만나는 상황

### Connection Pool 이해하기

데이터베이스 연결에는 TCP 3-way handshake가 필요합니다. 매 요청마다 연결을 새로 맺으면 오버헤드가 큽니다.

```
요청마다 연결 생성:
  3-way handshake (1.5 RTT) + Query + 4-way handshake

Connection Pool 사용:
  이미 연결된 커넥션으로 Query만 실행
```

HikariCP 같은 Connection Pool이 필요한 이유입니다.

### Keep-Alive

HTTP/1.1의 Keep-Alive도 같은 맥락입니다. TCP 연결을 재사용해서 handshake 오버헤드를 줄입니다.

```
Keep-Alive 없이:
  요청1: 연결 → 요청 → 응답 → 종료
  요청2: 연결 → 요청 → 응답 → 종료

Keep-Alive 사용:
  요청1: 연결 → 요청 → 응답
  요청2:        요청 → 응답
  요청3:        요청 → 응답 → 종료
```

### 타임아웃 설정

TCP 연결 관련 타임아웃 설정을 이해하면 문제 해결이 쉬워집니다.

```yaml
# Spring Boot 예시
server:
  tomcat:
    connection-timeout: 20000  # 연결 타임아웃 (ms)
    keep-alive-timeout: 60000  # Keep-Alive 유지 시간
```

- **Connection Timeout**: 3-way handshake가 완료될 때까지 대기하는 시간
- **Read Timeout**: 데이터를 읽을 때까지 대기하는 시간
- **Keep-Alive Timeout**: 유휴 연결을 유지하는 시간

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

- TCP/IP는 4개 계층으로 구성됩니다
- IP는 목적지를 찾고, TCP는 신뢰성을 보장합니다
- TCP는 3-way handshake로 연결을 수립합니다
- Connection Pool과 Keep-Alive는 TCP 연결 비용을 줄이는 방법입니다

다음 글에서는 HTTP 프로토콜에 대해 다루겠습니다.
