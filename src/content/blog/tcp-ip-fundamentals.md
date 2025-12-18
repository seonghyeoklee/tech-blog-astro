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

## TCP 성능 최적화 기법

### Sliding Window (흐름 제어)

TCP는 수신자의 버퍼 크기에 맞춰 데이터 전송 속도를 조절합니다.

```
Sender                          Receiver
   │                               │
   │──── [1][2][3][4] ────────────>│  Window Size: 4
   │                               │
   │<───── ACK (1-4) ──────────────│
   │                               │
   │──── [5][6][7][8] ────────────>│  다음 4개 전송
```

Window 크기가 클수록 처리량이 높지만, 수신자가 감당할 수 없으면 패킷이 버려집니다.

### Congestion Control (혼잡 제어)

네트워크가 혼잡하면 전송 속도를 줄입니다.

```
Slow Start → 지수 증가
Congestion Avoidance → 선형 증가
Fast Retransmit → 3 Duplicate ACK 시 즉시 재전송
Fast Recovery → 혼잡 윈도우 절반으로 줄임
```

**Spring Boot에서 확인하기**:

```java
@RestController
public class NetworkController {

    @GetMapping("/large-data")
    public ResponseEntity<byte[]> getLargeData() {
        byte[] data = new byte[1024 * 1024]; // 1MB
        // TCP가 자동으로 세그먼트로 분할하여 전송
        // Sliding Window와 Congestion Control 적용됨
        return ResponseEntity.ok(data);
    }
}
```

### Nagle 알고리즘 vs TCP_NODELAY

**Nagle 알고리즘**: 작은 패킷을 모아서 전송 (네트워크 효율 향상)

```
작은 데이터 3개 전송:
  Nagle ON:  [A][B][C] → 하나로 합쳐서 전송
  Nagle OFF: [A] → [B] → [C] → 각각 전송
```

**실시간 통신에서는 TCP_NODELAY 사용**:

```java
// Netty 예시
ServerBootstrap b = new ServerBootstrap();
b.childOption(ChannelOption.TCP_NODELAY, true); // Nagle 비활성화
```

- **채팅, 게임**: TCP_NODELAY (지연 최소화)
- **파일 전송**: Nagle ON (효율 우선)

### Socket 옵션

```java
// Java NIO 예시
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.setOption(StandardSocketOptions.SO_REUSEADDR, true);
serverChannel.setOption(StandardSocketOptions.SO_KEEPALIVE, true);
```

| 옵션 | 용도 | 트레이드오프 |
|------|------|--------------|
| SO_REUSEADDR | 포트 재사용 허용 | TIME_WAIT 상태에서도 바인딩 가능 |
| SO_KEEPALIVE | 유휴 연결 확인 | 주기적 패킷 전송 (네트워크 비용) |
| TCP_NODELAY | Nagle 비활성화 | 작은 패킷 증가 vs 지연 감소 |
| SO_SNDBUF | 송신 버퍼 크기 | 큰 버퍼 = 메모리 사용↑, 처리량↑ |
| SO_RCVBUF | 수신 버퍼 크기 | 큰 버퍼 = 메모리 사용↑, 윈도우 크기↑ |

## 네트워크 프로토콜 선택

TCP만이 유일한 선택지는 아닙니다. 요구사항에 따라 다양한 프로토콜을 선택할 수 있습니다.

### QUIC (HTTP/3의 기반)

QUIC는 UDP 기반으로 TCP의 단점을 개선한 프로토콜입니다.

```
TCP (HTTP/2):
  3-way handshake (1.5 RTT) + TLS handshake (1-2 RTT) = 최소 2.5 RTT

QUIC (HTTP/3):
  0-RTT 또는 1-RTT 연결 수립
```

**QUIC의 장점**:
- **빠른 연결 수립**: 0-RTT 재연결 (기존 연결 정보 캐싱)
- **Head-of-Line Blocking 해결**: 스트림 단위 독립 처리
- **연결 마이그레이션**: IP 변경 시에도 연결 유지 (모바일 환경)

**Spring Boot with HTTP/3**:

```yaml
# application.yml (Spring Boot 3.2+)
server:
  http2:
    enabled: true
  ssl:
    enabled: true
    # HTTP/3는 아직 실험적 기능
```

### SCTP (Stream Control Transmission Protocol)

멀티 스트리밍과 멀티 호밍을 지원하는 프로토콜입니다.

```
TCP: 단일 스트림 (순서 보장)
  패킷1 유실 → 패킷2 대기 → 패킷3 대기

SCTP: 멀티 스트림 (스트림별 독립)
  스트림1의 패킷 유실 → 스트림2, 3은 정상 처리
```

**사용 예**: 통신사 시그널링 (SS7), WebRTC Data Channel

### 프로토콜 비교

| 프로토콜 | 연결 수립 | 신뢰성 | 순서 보장 | 지연 | 사용처 |
|----------|-----------|--------|-----------|------|--------|
| **TCP** | 3-way handshake | 보장 | 보장 | 높음 | HTTP/1.1, 데이터베이스 |
| **UDP** | 없음 | 없음 | 없음 | 낮음 | DNS, 스트리밍, 게임 |
| **QUIC** | 0-1 RTT | 보장 | 스트림별 보장 | 낮음 | HTTP/3, 실시간 통신 |
| **SCTP** | 4-way handshake | 보장 | 스트림별 선택 | 중간 | 통신사 장비, WebRTC |

## 아키텍처 레벨의 네트워크 최적화

### Load Balancer (부하 분산)

**L4 Load Balancer (Transport Layer)**:

```
Client ─┐
        ├─→ L4 LB ─┐─→ Server1 (192.168.0.10:8080)
Client ─┘    ↓     ├─→ Server2 (192.168.0.11:8080)
           TCP     └─→ Server3 (192.168.0.12:8080)
         IP/Port
```

IP 주소와 포트 번호만 보고 분산합니다. 빠르지만 애플리케이션 정보는 모릅니다.

**L7 Load Balancer (Application Layer)**:

```
Client → L7 LB → /api/users    → User Service
              → /api/orders   → Order Service
              → /api/products → Product Service
```

HTTP 헤더, URL, Cookie를 보고 분산합니다. 느리지만 유연합니다.

**부하 분산 알고리즘**:

```java
// Spring Cloud LoadBalancer 예시
@Configuration
public class LoadBalancerConfig {

    @Bean
    public ReactorLoadBalancer<ServiceInstance> randomLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory loadBalancerClientFactory) {
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        return new RandomLoadBalancer(
            loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class),
            name);
    }
}
```

| 알고리즘 | 동작 방식 | 장점 | 단점 |
|----------|-----------|------|------|
| Round Robin | 순차 분배 | 단순, 공평 | 서버 성능 차이 무시 |
| Least Connection | 연결 수 최소 서버 선택 | 부하 균등 | 연결 수 추적 오버헤드 |
| IP Hash | 클라이언트 IP 기반 | 세션 유지 | 특정 서버 편중 가능 |
| Weighted | 가중치 기반 분배 | 서버 성능 반영 | 가중치 설정 필요 |

### Connection Pool 패턴

**HikariCP 설정**:

```java
@Configuration
public class DatabaseConfig {

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        config.setMaximumPoolSize(20);        // 최대 연결 수
        config.setMinimumIdle(5);             // 최소 유휴 연결
        config.setConnectionTimeout(30000);   // 연결 타임아웃
        config.setIdleTimeout(600000);        // 유휴 연결 유지 시간
        config.setMaxLifetime(1800000);       // 연결 최대 수명

        return new HikariDataSource(config);
    }
}
```

**Connection Pool 크기 계산**:

```
공식: connections = ((core_count * 2) + effective_spindle_count)

예시:
  CPU 코어: 4개
  디스크: 1개 (SSD)
  권장 크기: (4 * 2) + 1 = 9개
```

### Service Mesh (TCP 레벨 트래픽 제어)

Istio, Linkerd 같은 Service Mesh는 TCP 연결을 제어합니다.

```yaml
# Istio VirtualService 예시
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
  - user-service
  tcp:
  - match:
    - port: 8080
    route:
    - destination:
        host: user-service
        subset: v1
      weight: 90
    - destination:
        host: user-service
        subset: v2
      weight: 10  # 10% 트래픽을 v2로
```

**Service Mesh가 제공하는 기능**:
- **트래픽 라우팅**: TCP/HTTP 레벨 분산
- **Retry & Timeout**: 자동 재시도 및 타임아웃
- **Circuit Breaker**: 장애 전파 방지
- **mTLS**: 서비스 간 암호화 통신

### Circuit Breaker 패턴

장애가 발생한 서비스로의 요청을 차단합니다.

```java
// Resilience4j 예시
@Service
public class OrderService {

    private final CircuitBreaker circuitBreaker;

    @CircuitBreaker(name = "payment-service", fallbackMethod = "paymentFallback")
    public PaymentResponse processPayment(Order order) {
        // 결제 서비스 호출
        return paymentClient.pay(order);
    }

    public PaymentResponse paymentFallback(Order order, Exception e) {
        // Circuit Open 시 대체 동작
        return PaymentResponse.pending(order);
    }
}
```

**Circuit Breaker 상태**:

```
Closed (정상) → 요청 허용
   ↓ (실패율 임계값 초과)
Open (차단) → 요청 즉시 거부
   ↓ (일정 시간 경과)
Half-Open (시험) → 일부 요청 허용
   ↓ (성공 시)          ↓ (실패 시)
Closed               Open
```

## 트레이드오프와 선택 가이드

### Keep-Alive vs Connection Per Request

| 항목 | Keep-Alive | Connection Per Request |
|------|------------|------------------------|
| **연결 오버헤드** | 낮음 (재사용) | 높음 (매번 3-way handshake) |
| **동시 연결 수** | 적음 | 많음 |
| **서버 리소스** | 연결 유지로 메모리 사용 | 연결 생성/종료로 CPU 사용 |
| **적합한 경우** | 동일 서버로 반복 요청 | 드문 요청, 짧은 작업 |
| **예시** | 브라우저 ↔ 웹서버 | DNS 조회, Health Check |

### L4 vs L7 Load Balancing

| 항목 | L4 (Transport Layer) | L7 (Application Layer) |
|------|----------------------|------------------------|
| **처리 속도** | 빠름 (패킷 헤더만 확인) | 느림 (데이터 파싱) |
| **라우팅 기준** | IP, Port | URL, Header, Cookie |
| **SSL Offloading** | 불가 (암호화된 데이터) | 가능 (복호화 후 분산) |
| **세션 관리** | IP 기반만 가능 | Cookie, Header 기반 가능 |
| **비용** | 저렴 | 비싸지만 기능 많음 |
| **사용 예** | 동일 서비스 복제본 분산 | 마이크로서비스 라우팅 |

### Connection Pool 크기 설정

| Pool Size | 장점 | 단점 | 적합한 경우 |
|-----------|------|------|-------------|
| **작음 (5-10)** | 메모리 절약, DB 부하 낮음 | 대기 시간 증가 | 트래픽 적음, DB 성능 낮음 |
| **중간 (10-30)** | 균형 잡힌 성능 | - | 일반적인 웹 애플리케이션 |
| **큼 (50+)** | 대기 시간 최소화 | 메모리 과다 사용, DB 과부하 | 높은 동시성, 강력한 DB |

**잘못된 설정의 증상**:

```
Pool이 너무 작음:
  - HikariPool - Connection is not available
  - 응답 시간 급격히 증가

Pool이 너무 큼:
  - DB Max Connections 초과
  - Out of Memory Error
```

## 실무 적용 시나리오

### 시나리오 1: 마이크로서비스 간 통신

**요구사항**:
- 서비스 A → 서비스 B 빈번한 호출
- 장애 격리 필요
- 트래픽 점진적 배포

**선택**:
- **프로토콜**: HTTP/2 (멀티플렉싱)
- **Connection Pool**: 서비스별 전용 Pool
- **패턴**: Circuit Breaker + Retry
- **인프라**: Service Mesh (Istio)

```yaml
# Circuit Breaker 설정
resilience4j.circuitbreaker:
  instances:
    service-b:
      sliding-window-size: 10
      failure-rate-threshold: 50
      wait-duration-in-open-state: 10s
```

### 시나리오 2: 실시간 채팅 서비스

**요구사항**:
- 낮은 지연 시간 (<100ms)
- 많은 동시 연결 (10만+)
- 양방향 통신

**선택**:
- **프로토콜**: WebSocket over TCP
- **최적화**: TCP_NODELAY, Epoll (리눅스)
- **아키텍처**: Event-Driven (Netty, Reactor)
- **인프라**: L4 Load Balancer (세션 유지)

```java
// Netty 설정
ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)
 .channel(EpollServerSocketChannel.class)  // Epoll for Linux
 .childOption(ChannelOption.TCP_NODELAY, true)
 .childOption(ChannelOption.SO_KEEPALIVE, true);
```

### 시나리오 3: 대용량 파일 다운로드

**요구사항**:
- 큰 파일 전송 (GB 단위)
- 다운로드 재개 지원
- 네트워크 효율

**선택**:
- **프로토콜**: HTTP/1.1 with Range Requests
- **최적화**: Nagle ON, 큰 TCP 버퍼
- **패턴**: Chunked Transfer Encoding
- **인프라**: CDN + L4 Load Balancer

```java
@GetMapping("/download")
public ResponseEntity<Resource> downloadFile(
        @RequestHeader(value = "Range", required = false) String range) {

    Resource file = resourceLoader.getResource("file:///large-file.zip");

    if (range != null) {
        // Range 요청 처리 (부분 다운로드)
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
            .header(HttpHeaders.CONTENT_RANGE, "bytes 0-1024/2048")
            .body(file);
    }

    return ResponseEntity.ok(file);
}
```

### 시나리오 4: IoT 디바이스 통신

**요구사항**:
- 수천 개 디바이스 연결
- 간헐적 연결 (네트워크 불안정)
- 배터리 효율

**선택**:
- **프로토콜**: MQTT over TCP (경량 프로토콜)
- **대안**: CoAP over UDP (더 경량)
- **패턴**: Keep-Alive with Long Timeout
- **인프라**: MQTT Broker (Mosquitto, EMQ X)

```java
// MQTT 클라이언트 설정
MqttConnectOptions options = new MqttConnectOptions();
options.setKeepAliveInterval(300);  // 5분
options.setAutomaticReconnect(true);
options.setCleanSession(false);     // 세션 유지
```

## 선택 가이드: 언제 무엇을 사용할까?

### 프로토콜 선택

| 상황 | 권장 프로토콜 | 이유 |
|------|---------------|------|
| 일반 웹 API | HTTP/1.1 over TCP | 검증된 기술, 생태계 풍부 |
| 고성능 웹 | HTTP/2 or HTTP/3 | 멀티플렉싱, 낮은 지연 |
| 실시간 통신 | WebSocket | 양방향 통신, 낮은 오버헤드 |
| DNS, 간단한 조회 | UDP | 연결 오버헤드 없음 |
| 스트리밍 | UDP (with QUIC) | 빠른 전송, 일부 손실 허용 |
| 금융 거래 | TCP | 신뢰성 최우선 |

### 아키텍처 패턴 선택

```
트래픽 < 1000 RPS:
  → 단일 서버 + Connection Pool

트래픽 < 10000 RPS:
  → L4 Load Balancer + Connection Pool

트래픽 > 10000 RPS:
  → L7 Load Balancer + Service Mesh + Circuit Breaker

마이크로서비스:
  → Service Mesh (Istio) + gRPC

레거시 모놀리스:
  → L7 Load Balancer + API Gateway
```

### Connection Pool 설정 가이드

```java
// 공식: connections = ((core_count * 2) + effective_spindle_count)

// 예시 1: 일반 웹 애플리케이션
HikariConfig config = new HikariConfig();
config.setMaximumPoolSize(20);      // 적당한 크기
config.setMinimumIdle(5);           // 최소 연결 유지
config.setConnectionTimeout(30000); // 30초 대기

// 예시 2: 높은 동시성
config.setMaximumPoolSize(50);      // 큰 Pool
config.setMinimumIdle(20);          // 유휴 연결 많이 유지

// 예시 3: 배치 처리
config.setMaximumPoolSize(5);       // 작은 Pool
config.setMinimumIdle(1);           // 최소한의 연결만
```

## 정리

이 글에서 다룬 내용을 정리하면 다음과 같습니다.

**기본 개념**:
- TCP/IP는 4개 계층으로 구성됩니다
- IP는 목적지를 찾고, TCP는 신뢰성을 보장합니다
- TCP는 3-way handshake로 연결을 수립합니다

**TCP 최적화**:
- Sliding Window와 Congestion Control로 성능을 조절합니다
- Nagle 알고리즘 vs TCP_NODELAY는 트레이드오프 선택입니다
- Socket 옵션으로 세부 동작을 제어할 수 있습니다

**프로토콜 선택**:
- TCP: 신뢰성이 필요한 일반적인 웹 애플리케이션
- UDP: 빠른 전송이 필요한 DNS, 스트리밍
- QUIC: HTTP/3의 기반, 빠른 연결과 낮은 지연
- SCTP: 멀티 스트리밍이 필요한 통신사 장비

**아키텍처 패턴**:
- Connection Pool: TCP 연결 비용을 줄입니다
- Load Balancer: L4 (빠름, 단순) vs L7 (느림, 유연함)
- Service Mesh: 마이크로서비스의 TCP 트래픽 제어
- Circuit Breaker: 장애 격리 및 전파 방지

**핵심 원칙**:
네트워크 기술 선택은 정답이 아닌 **요구사항에 따른 트레이드오프**입니다. 신뢰성이 필요하면 TCP, 속도가 필요하면 UDP/QUIC, 유연한 라우팅이 필요하면 L7 Load Balancer를 선택하세요. 선택의 문제지 기술의 문제는 아닙니다.

다음 글에서는 HTTP 프로토콜에 대해 다루겠습니다.
