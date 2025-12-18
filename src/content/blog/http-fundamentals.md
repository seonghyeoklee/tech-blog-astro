---
title: 'HTTP 프로토콜 - 웹의 핵심 통신 규약'
description: 'HTTP 메서드, 상태 코드, 헤더의 동작 원리와 HTTP/1.1, HTTP/2, HTTP/3의 차이를 정리했습니다'
pubDate: 'Jan 15 2025'
series: 'network-fundamentals'
seriesOrder: 2
tags: ['Network', 'CS']
quiz:
  - question: "HTTP의 특징이 아닌 것은?"
    options:
      - "Stateless (무상태)"
      - "Request-Response 구조"
      - "연결 지향적 (Connection-Oriented)"
      - "텍스트 기반 프로토콜"
    correctAnswer: 2
    explanation: "HTTP는 기본적으로 Stateless하고 Request-Response 구조를 가진 텍스트 기반 프로토콜입니다. 연결 지향적인 것은 하위 계층인 TCP의 특징입니다."

  - question: "GET과 POST의 차이로 옳은 것은?"
    options:
      - "GET은 데이터를 URL에, POST는 Body에 포함"
      - "GET은 느리고 POST는 빠름"
      - "GET은 TCP, POST는 UDP 사용"
      - "GET은 암호화되지 않고 POST는 암호화됨"
    correctAnswer: 0
    explanation: "GET은 데이터를 URL 쿼리 스트링에 포함하고, POST는 HTTP Body에 포함합니다. GET은 조회, POST는 생성/수정에 주로 사용됩니다."

  - question: "HTTP 상태 코드 404의 의미는?"
    options:
      - "서버 오류"
      - "요청 성공"
      - "리소스를 찾을 수 없음"
      - "인증 필요"
    correctAnswer: 2
    explanation: "404 Not Found는 요청한 리소스를 서버에서 찾을 수 없을 때 반환하는 상태 코드입니다."

  - question: "Idempotent(멱등성)한 HTTP 메서드가 아닌 것은?"
    options:
      - "GET"
      - "PUT"
      - "POST"
      - "DELETE"
    correctAnswer: 2
    explanation: "POST는 멱등하지 않습니다. 같은 요청을 여러 번 보내면 여러 개의 리소스가 생성될 수 있습니다. GET, PUT, DELETE는 멱등합니다."

  - question: "HTTPS에서 사용하는 암호화 프로토콜은?"
    options:
      - "SSH"
      - "TLS/SSL"
      - "IPSec"
      - "VPN"
    correctAnswer: 1
    explanation: "HTTPS는 HTTP over TLS/SSL로, TLS(Transport Layer Security) 또는 SSL(Secure Sockets Layer) 프로토콜을 사용해 통신을 암호화합니다."

  - question: "HTTP/2의 주요 개선 사항이 아닌 것은?"
    options:
      - "멀티플렉싱"
      - "헤더 압축"
      - "서버 푸시"
      - "UDP 기반 통신"
    correctAnswer: 3
    explanation: "HTTP/2는 여전히 TCP 기반입니다. UDP 기반 통신은 HTTP/3(QUIC)의 특징입니다."

  - question: "RESTful API에서 리소스 수정 시 주로 사용하는 메서드는?"
    options:
      - "GET"
      - "POST"
      - "PUT 또는 PATCH"
      - "DELETE"
    correctAnswer: 2
    explanation: "리소스 전체 수정은 PUT, 부분 수정은 PATCH를 사용합니다. POST는 주로 리소스 생성에 사용됩니다."

  - question: "CORS(Cross-Origin Resource Sharing)가 필요한 상황은?"
    options:
      - "같은 도메인 내에서 API 호출"
      - "다른 도메인의 API 호출"
      - "HTTPS로 통신"
      - "HTTP/2 사용"
    correctAnswer: 1
    explanation: "CORS는 다른 출처(도메인, 프로토콜, 포트)의 리소스에 접근할 때 필요한 보안 메커니즘입니다."

  - question: "HTTP Keep-Alive의 목적은?"
    options:
      - "보안 강화"
      - "TCP 연결 재사용으로 성능 향상"
      - "데이터 압축"
      - "캐싱"
    correctAnswer: 1
    explanation: "Keep-Alive는 TCP 연결을 재사용해 매 요청마다 연결을 새로 맺는 오버헤드를 줄입니다. HTTP/1.1부터 기본 활성화되었습니다."

  - question: "HTTP 상태 코드 5xx의 의미는?"
    options:
      - "클라이언트 오류"
      - "리다이렉션"
      - "서버 오류"
      - "성공"
    correctAnswer: 2
    explanation: "5xx 상태 코드는 서버 측 오류를 나타냅니다. 500(Internal Server Error), 502(Bad Gateway), 503(Service Unavailable) 등이 있습니다."
---

웹 브라우저에서 URL을 입력하면 어떻게 웹 페이지가 화면에 나타날까요? 그 핵심에는 **HTTP(HyperText Transfer Protocol)** 프로토콜이 있습니다. HTTP는 웹의 근간이 되는 통신 규약으로, 백엔드 개발자라면 반드시 이해해야 하는 핵심 기술입니다.

## HTTP란?

**클라이언트와 서버 간에 데이터를 주고받기 위한 프로토콜**

```
[클라이언트]                    [서버]
   브라우저                      웹 서버
      |                            |
      |  HTTP Request (요청)       |
      |--------------------------->|
      |                            |
      |  HTTP Response (응답)      |
      |<---------------------------|
      |                            |
```

### HTTP의 특징

1. **클라이언트-서버 구조**: 요청과 응답으로 동작
2. **Stateless (무상태)**: 각 요청은 독립적 (이전 요청 정보 기억 안 함)
3. **Connectionless**: 요청-응답 후 연결 종료 (HTTP/1.0)
4. **텍스트 기반**: 사람이 읽을 수 있는 형식

## HTTP 요청 (Request)

### HTTP 요청 구조

```http
GET /users/123 HTTP/1.1               ← Request Line (메서드, 경로, 버전)
Host: api.example.com                  ← Headers (메타데이터)
User-Agent: Mozilla/5.0
Accept: application/json
Authorization: Bearer token123

{"name": "John"}                       ← Body (선택적, GET에는 없음)
```

### HTTP 메서드

**리소스에 대한 행동을 나타냄**

#### 1. GET - 조회

```http
GET /users/123 HTTP/1.1
Host: api.example.com

→ 사용자 정보 조회
```

**특징:**
- 데이터를 URL에 포함 (쿼리 스트링)
- Body 없음
- 멱등성(Idempotent): 여러 번 호출해도 결과 동일
- 캐싱 가능

#### 2. POST - 생성

```http
POST /users HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com"
}

→ 새로운 사용자 생성
```

**특징:**
- 데이터를 Body에 포함
- 멱등성 없음: 여러 번 호출 시 여러 리소스 생성
- 캐싱 불가

#### 3. PUT - 전체 수정

```http
PUT /users/123 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.new@example.com"
}

→ 사용자 정보 전체 교체
```

**특징:**
- 리소스 전체를 교체
- 멱등성: 같은 요청 반복해도 결과 동일

#### 4. PATCH - 부분 수정

```http
PATCH /users/123 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "email": "john.new@example.com"
}

→ 이메일만 수정
```

#### 5. DELETE - 삭제

```http
DELETE /users/123 HTTP/1.1
Host: api.example.com

→ 사용자 삭제
```

**특징:**
- 멱등성: 여러 번 삭제해도 결과 동일

### 메서드 비교

| 메서드 | 용도 | Body | 멱등성 | 안전성 | 캐싱 |
|--------|------|------|--------|--------|------|
| GET | 조회 | ❌ | ✅ | ✅ | ✅ |
| POST | 생성 | ✅ | ❌ | ❌ | ❌ |
| PUT | 전체 수정 | ✅ | ✅ | ❌ | ❌ |
| PATCH | 부분 수정 | ✅ | ❌ | ❌ | ❌ |
| DELETE | 삭제 | ❌ | ✅ | ❌ | ❌ |

## HTTP 응답 (Response)

### HTTP 응답 구조

```http
HTTP/1.1 200 OK                        ← Status Line (버전, 상태 코드, 상태 메시지)
Content-Type: application/json         ← Headers
Content-Length: 42
Cache-Control: max-age=3600

{                                      ← Body
  "id": 123,
  "name": "John"
}
```

### HTTP 상태 코드

**요청 처리 결과를 나타내는 3자리 숫자**

#### 1xx - 정보성

- **100 Continue**: 클라이언트가 요청을 계속 진행 가능

#### 2xx - 성공

- **200 OK**: 요청 성공
- **201 Created**: 리소스 생성 성공
- **204 No Content**: 성공했지만 응답 Body 없음

```http
POST /users HTTP/1.1

HTTP/1.1 201 Created
Location: /users/123
```

#### 3xx - 리다이렉션

- **301 Moved Permanently**: 영구 이동
- **302 Found**: 임시 이동
- **304 Not Modified**: 캐시된 리소스 사용 가능

```http
GET /old-page HTTP/1.1

HTTP/1.1 301 Moved Permanently
Location: /new-page
```

#### 4xx - 클라이언트 오류

- **400 Bad Request**: 잘못된 요청
- **401 Unauthorized**: 인증 필요
- **403 Forbidden**: 권한 없음
- **404 Not Found**: 리소스 없음
- **409 Conflict**: 리소스 충돌

```http
GET /users/999 HTTP/1.1

HTTP/1.1 404 Not Found
{
  "error": "User not found"
}
```

#### 5xx - 서버 오류

- **500 Internal Server Error**: 서버 내부 오류
- **502 Bad Gateway**: 게이트웨이 오류
- **503 Service Unavailable**: 서비스 이용 불가

```http
GET /users/123 HTTP/1.1

HTTP/1.1 500 Internal Server Error
{
  "error": "Database connection failed"
}
```

## HTTP 헤더

**요청/응답에 대한 메타데이터**

### 주요 요청 헤더

```http
Host: api.example.com                   # 필수, 서버 주소
User-Agent: Mozilla/5.0                 # 클라이언트 정보
Accept: application/json                # 받을 수 있는 타입
Content-Type: application/json          # 보내는 데이터 타입
Authorization: Bearer token123          # 인증 토큰
Cookie: session_id=abc123               # 쿠키
```

### 주요 응답 헤더

```http
Content-Type: application/json          # 응답 데이터 타입
Content-Length: 1234                    # 응답 크기
Set-Cookie: session_id=abc123           # 쿠키 설정
Cache-Control: max-age=3600             # 캐시 제어
Location: /users/123                    # 리다이렉션 위치
```

### Content-Type 주요 값

```http
application/json              # JSON 데이터
application/x-www-form-urlencoded  # 폼 데이터
multipart/form-data          # 파일 업로드
text/html                    # HTML
text/plain                   # 텍스트
```

## HTTP 버전별 차이

### HTTP/1.0

```
연결 방식:
요청 1 → 응답 1 → 연결 종료
요청 2 → 응답 2 → 연결 종료
요청 3 → 응답 3 → 연결 종료

문제: 매번 TCP 연결 생성 (3-way handshake 오버헤드)
```

### HTTP/1.1

**개선 사항:**

1. **Persistent Connection (Keep-Alive)**
```
요청 1 → 응답 1 ─┐
요청 2 → 응답 2  ├─ 같은 연결 재사용
요청 3 → 응답 3 ─┘
```

2. **Pipelining**
```
요청 1 → 요청 2 → 요청 3
         ↓       ↓       ↓
       응답 1 → 응답 2 → 응답 3

문제: Head of Line Blocking (앞 요청이 지연되면 뒤도 대기)
```

### HTTP/2

**주요 개선:**

1. **Multiplexing (멀티플렉싱)**
```
하나의 TCP 연결로 여러 요청/응답 동시 처리

Stream 1: 요청 1 ──> 응답 1
Stream 2: 요청 2 ──> 응답 2  (동시에)
Stream 3: 요청 3 ──> 응답 3
```

2. **Header Compression (헤더 압축)**
```
중복 헤더를 압축해 전송 (HPACK)

요청 1: Host: api.example.com (전체 전송)
요청 2: Host: api.example.com (인덱스만 전송)
```

3. **Server Push**
```
클라이언트 요청 전에 서버가 미리 리소스 전송

GET /index.html
→ index.html + style.css + script.js (함께 전송)
```

### HTTP/3

**QUIC 프로토콜 기반 (UDP 사용)**

```
TCP의 Head of Line Blocking 해결

패킷 1 손실 ──> TCP: 전체 대기 ❌
              QUIC: 다른 스트림은 계속 ✅
```

**장점:**
- 연결 설정 빠름 (0-RTT)
- 패킷 손실에 강함
- 모바일 네트워크에 유리

## HTTPS

**HTTP over TLS/SSL - 암호화된 HTTP**

### HTTP vs HTTPS

```
[HTTP]
클라이언트 ───→ 평문 데이터 ───→ 서버
           (제3자가 볼 수 있음)

[HTTPS]
클라이언트 ───→ 암호화 데이터 ───→ 서버
           (제3자가 볼 수 없음)
```

### HTTPS 동작 과정

```
1. 클라이언트 → 서버: Hello (지원하는 암호화 방식 목록)
2. 서버 → 클라이언트: 인증서 (공개키 포함)
3. 클라이언트: 인증서 검증
4. 클라이언트 → 서버: 암호화된 대칭키
5. 이후 통신: 대칭키로 암호화
```

### HTTPS의 장점

1. **보안**: 데이터 암호화
2. **무결성**: 데이터 변조 방지
3. **인증**: 서버 신원 확인
4. **SEO**: 검색 엔진 순위 상승
5. **HTTP/2**: HTTPS만 지원

## 실무 예시

### 사례 1: RESTful API 설계

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    // GET /api/users - 목록 조회
    @GetMapping
    public List<User> getUsers() {
        return userService.findAll();
    }

    // GET /api/users/123 - 단건 조회
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    // POST /api/users - 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody UserDto dto) {
        return userService.create(dto);
    }

    // PUT /api/users/123 - 전체 수정
    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id,
                          @RequestBody UserDto dto) {
        return userService.update(id, dto);
    }

    // PATCH /api/users/123 - 부분 수정
    @PatchMapping("/{id}")
    public User patchUser(@PathVariable Long id,
                         @RequestBody Map<String, Object> updates) {
        return userService.patch(id, updates);
    }

    // DELETE /api/users/123 - 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

### 사례 2: HTTP 헤더 활용

```java
@RestController
public class ApiController {

    // Content Negotiation (Accept 헤더)
    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
        @RequestHeader(value = "Accept") String accept) {

        if (accept.contains("application/json")) {
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(users);
        } else if (accept.contains("application/xml")) {
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(usersXml);
        }

        return ResponseEntity.badRequest().build();
    }

    // 캐싱 (Cache-Control 헤더)
    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Product product = productService.findById(id);

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))
            .body(product);
    }

    // CORS 설정
    @CrossOrigin(origins = "https://example.com")
    @GetMapping("/data")
    public Data getData() {
        return dataService.getData();
    }
}
```

### 사례 3: HTTP 클라이언트 (RestTemplate)

```java
@Service
public class ExternalApiService {

    private final RestTemplate restTemplate;

    // GET 요청
    public User getUser(Long id) {
        String url = "https://api.example.com/users/" + id;
        return restTemplate.getForObject(url, User.class);
    }

    // POST 요청
    public User createUser(UserDto dto) {
        String url = "https://api.example.com/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth("token123");

        HttpEntity<UserDto> request = new HttpEntity<>(dto, headers);

        return restTemplate.postForObject(url, request, User.class);
    }

    // 에러 처리
    public User getUserWithErrorHandling(Long id) {
        try {
            String url = "https://api.example.com/users/" + id;
            return restTemplate.getForObject(url, User.class);
        } catch (HttpClientErrorException.NotFound e) {
            // 404 처리
            throw new UserNotFoundException(id);
        } catch (HttpServerErrorException e) {
            // 5xx 처리
            throw new ExternalApiException("Server error");
        }
    }
}
```

## 실시간 통신 기술

HTTP는 요청-응답 모델이지만, 실시간 통신이 필요한 경우 다양한 기술이 있습니다.

### Long Polling

**동작 방식:**
- 클라이언트가 요청을 보내고 서버가 새 데이터가 있을 때까지 응답 대기
- 응답 후 즉시 재요청

```javascript
// 클라이언트
async function longPoll() {
    while (true) {
        const response = await fetch('/api/messages?timeout=30000');
        const data = await response.json();
        updateUI(data);
        // 즉시 재요청
    }
}
```

```java
// 서버
@GetMapping("/messages")
public DeferredResult<List<Message>> getMessages(
    @RequestParam(defaultValue = "30000") long timeout) {

    DeferredResult<List<Message>> result = new DeferredResult<>(timeout);

    // 새 메시지가 도착하면 응답
    messageService.onNewMessage(messages -> {
        result.setResult(messages);
    });

    // 타임아웃 시 빈 응답
    result.onTimeout(() -> result.setResult(Collections.emptyList()));

    return result;
}
```

**트레이드오프:**
- **장점**: HTTP 기반, 방화벽 문제 없음, 구현 단순
- **단점**: 불필요한 요청 많음, 서버 리소스 낭비, 실시간성 부족

### Server-Sent Events (SSE)

**동작 방식:**
- 서버에서 클라이언트로 단방향 스트리밍
- HTTP 연결 유지하며 이벤트 푸시

```javascript
// 클라이언트
const eventSource = new EventSource('/api/notifications');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('New notification:', data);
};

eventSource.onerror = () => {
    console.error('Connection lost, reconnecting...');
};
```

```java
// 서버 (Spring)
@GetMapping(value = "/notifications", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<Notification>> streamNotifications() {
    return notificationService.getStream()
        .map(notification -> ServerSentEvent.<Notification>builder()
            .id(String.valueOf(notification.getId()))
            .event("notification")
            .data(notification)
            .build()
        );
}
```

**트레이드오프:**
- **장점**: 단방향에 최적화, 자동 재연결, HTTP 기반
- **단점**: 단방향만 가능, IE 미지원, 연결 수 제한

### WebSocket

**동작 방식:**
- HTTP에서 시작하여 양방향 통신 프로토콜로 업그레이드
- 지속적인 TCP 연결 유지

```javascript
// 클라이언트
const ws = new WebSocket('ws://localhost:8080/chat');

ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', room: 'general' }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    displayMessage(message);
};

ws.send(JSON.stringify({ type: 'message', text: 'Hello!' }));
```

```java
// 서버 (Spring WebSocket)
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler(), "/chat")
            .setAllowedOrigins("*");
    }

    @Bean
    public WebSocketHandler chatHandler() {
        return new ChatHandler();
    }
}

public class ChatHandler extends TextWebSocketHandler {
    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        // 양방향 메시지 처리
        String payload = message.getPayload();
        session.sendMessage(new TextMessage("Echo: " + payload));
    }
}
```

**트레이드오프:**
- **장점**: 양방향 실시간 통신, 낮은 레이턴시, 오버헤드 최소
- **단점**: 프록시/방화벽 문제 가능, 상태 관리 복잡, 연결 수 제한

### gRPC

**동작 방식:**
- HTTP/2 기반 RPC 프레임워크
- Protocol Buffers로 직렬화
- 양방향 스트리밍 지원

```protobuf
// user.proto
syntax = "proto3";

service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc StreamUsers (stream UserRequest) returns (stream UserResponse);
}

message UserRequest {
  int64 id = 1;
}

message UserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

```java
// 서버
@GrpcService
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {
    @Override
    public void getUser(UserRequest request, StreamObserver<UserResponse> responseObserver) {
        User user = userRepository.findById(request.getId());

        UserResponse response = UserResponse.newBuilder()
            .setId(user.getId())
            .setName(user.getName())
            .setEmail(user.getEmail())
            .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
```

**트레이드오프:**
- **장점**:
  - HTTP/2 기반 고성능
  - 바이너리 프로토콜로 작은 페이로드
  - 양방향 스트리밍
  - 타입 안정성 (코드 생성)
- **단점**:
  - 브라우저 직접 호출 어려움
  - 디버깅 어려움 (바이너리)
  - REST보다 복잡한 설정

### 실시간 통신 기술 비교

| 기술 | 방향 | 프로토콜 | 실시간성 | 사용 사례 |
|------|------|----------|----------|----------|
| **Long Polling** | 단방향 | HTTP | 낮음 | 간단한 알림 |
| **SSE** | 서버→클라이언트 | HTTP | 중간 | 실시간 피드, 진행률 |
| **WebSocket** | 양방향 | WS | 높음 | 채팅, 게임, 협업 |
| **gRPC** | 양방향 | HTTP/2 | 높음 | 마이크로서비스 통신 |

## 아키텍처로 풀어내는 HTTP 확장

단일 서버 HTTP만으로는 대규모 트래픽을 처리하기 어렵습니다. 아키텍처 레벨의 해결책이 필요합니다.

### 1단계: API Gateway

**역할:**
- 단일 진입점으로 라우팅
- 인증/인가 중앙화
- Rate Limiting
- 요청/응답 변환

```yaml
# Kong API Gateway 예시
services:
  - name: user-service
    url: http://user-service:8080
    routes:
      - paths: ["/api/users"]
    plugins:
      - name: rate-limiting
        config:
          minute: 100
      - name: jwt
        config:
          secret: "secret-key"
```

```java
// Spring Cloud Gateway
@Configuration
public class GatewayConfig {
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("user-service", r -> r
                .path("/api/users/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .addRequestHeader("X-Gateway", "Spring")
                    .circuitBreaker(c -> c.setName("userServiceCB"))
                )
                .uri("lb://USER-SERVICE")
            )
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .rateLimit(c -> c.setReplenishRate(10))
                )
                .uri("lb://ORDER-SERVICE")
            )
            .build();
    }
}
```

**트레이드오프:**
- **장점**: 중앙 집중식 관리, 서비스 독립성, 횡단 관심사 처리
- **단점**: 단일 장애점, 레이턴시 증가, 복잡도 증가

### 2단계: Load Balancer

**역할:**
- 트래픽 분산
- Health Check
- 장애 격리

```nginx
# Nginx Load Balancer
upstream backend {
    least_conn;  # 연결 수 기준 분산

    server backend1.example.com:8080 weight=3;
    server backend2.example.com:8080 weight=2;
    server backend3.example.com:8080 backup;  # 백업 서버

    keepalive 32;  # 연결 풀
}

server {
    listen 80;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Health Check
        proxy_next_upstream error timeout http_500 http_502 http_503;
        proxy_connect_timeout 2s;
    }
}
```

**로드 밸런싱 알고리즘:**

| 알고리즘 | 방식 | 장점 | 단점 |
|---------|------|------|------|
| **Round Robin** | 순차 분배 | 단순, 균등 분산 | 서버 성능 차이 무시 |
| **Least Connection** | 연결 수 기준 | 동적 부하 반영 | 오버헤드 있음 |
| **IP Hash** | 클라이언트 IP 기준 | 세션 유지 | 특정 서버 편중 가능 |
| **Weighted** | 가중치 기준 | 서버 성능 반영 | 가중치 조정 필요 |

**트레이드오프:**
- **장점**: 고가용성, 확장성, 무중단 배포
- **단점**: 세션 관리 복잡, L7 로드 밸런서는 비용 높음

### 3단계: Reverse Proxy

**역할:**
- 정적 파일 서빙
- SSL Termination
- 캐싱
- 압축

```nginx
# Nginx Reverse Proxy
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL 설정
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    # 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 압축
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # 프록시
    location / {
        proxy_pass http://backend;
        proxy_cache my_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_use_stale error timeout http_500;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

**트레이드오프:**
- **장점**: 백엔드 부하 감소, SSL 오프로딩, 보안 강화
- **단점**: 설정 복잡, 캐시 무효화 관리

### 4단계: CDN (Content Delivery Network)

**역할:**
- 전 세계 엣지 서버에 콘텐츠 캐싱
- 지리적으로 가까운 서버에서 응답
- DDoS 방어

```javascript
// CloudFlare CDN 예시
// 오리진 서버에서 캐시 제어
@GetMapping("/static/image.jpg")
public ResponseEntity<byte[]> getImage() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
        .header("CDN-Cache-Control", "max-age=31536000")
        .body(imageBytes);
}
```

**CDN 전략:**
- **Push**: 직접 CDN에 업로드
- **Pull**: 최초 요청 시 오리진에서 가져와 캐싱

**트레이드오프:**
- **장점**: 전 세계 빠른 응답, 오리진 부하 감소, DDoS 방어
- **단점**: 비용, 캐시 무효화 지연, 디버깅 어려움

### 5단계: Circuit Breaker

**역할:**
- 장애 전파 방지
- 빠른 실패 (Fail Fast)
- 자동 복구

```java
// Resilience4j Circuit Breaker
@Service
public class ExternalApiService {
    private final CircuitBreaker circuitBreaker;
    private final RestTemplate restTemplate;

    @CircuitBreaker(name = "externalApi", fallbackMethod = "fallback")
    public User getUser(Long id) {
        return restTemplate.getForObject(
            "https://api.example.com/users/" + id,
            User.class
        );
    }

    // Fallback 메서드
    public User fallback(Long id, Exception e) {
        log.warn("Circuit breaker activated for user {}", id, e);
        return User.getDefaultUser(id);
    }
}
```

```yaml
# Circuit Breaker 설정
resilience4j.circuitbreaker:
  configs:
    default:
      registerHealthIndicator: true
      slidingWindowSize: 10               # 최근 10개 요청 평가
      minimumNumberOfCalls: 5             # 최소 5개 호출 후 평가
      permittedNumberOfCallsInHalfOpenState: 3
      automaticTransitionFromOpenToHalfOpenEnabled: true
      waitDurationInOpenState: 5s         # 5초 후 Half-Open
      failureRateThreshold: 50            # 실패율 50% 이상 시 Open
      slowCallRateThreshold: 100          # 느린 호출 비율
      slowCallDurationThreshold: 2s       # 2초 이상은 느린 호출
```

**상태 전환:**
```
CLOSED (정상)
   ↓ (실패율 50% 이상)
OPEN (차단)
   ↓ (5초 경과)
HALF_OPEN (테스트)
   ↓ (성공 시)        ↓ (실패 시)
CLOSED              OPEN
```

**트레이드오프:**
- **장점**: 장애 격리, 빠른 복구, 시스템 안정성
- **단점**: Fallback 로직 필요, 복잡도 증가, 모니터링 필수

### 6단계: BFF (Backend for Frontend)

**역할:**
- 프론트엔드별 맞춤 API
- 데이터 집계 (Aggregation)
- 프로토콜 변환

```java
// Mobile BFF
@RestController
@RequestMapping("/mobile/api")
public class MobileBffController {
    @GetMapping("/home")
    public MobileHomeResponse getHome(@AuthenticationPrincipal User user) {
        // 여러 서비스 호출 병렬 처리
        CompletableFuture<List<Product>> products =
            CompletableFuture.supplyAsync(() -> productService.getRecommended(user));
        CompletableFuture<List<Order>> orders =
            CompletableFuture.supplyAsync(() -> orderService.getRecent(user));
        CompletableFuture<UserProfile> profile =
            CompletableFuture.supplyAsync(() -> userService.getProfile(user));

        // 모바일에 최적화된 응답
        return new MobileHomeResponse(
            products.join().stream().limit(5).toList(),  // 모바일은 5개만
            orders.join().stream().limit(3).toList(),
            profile.join().getSummary()  // 요약만
        );
    }
}

// Web BFF
@RestController
@RequestMapping("/web/api")
public class WebBffController {
    @GetMapping("/home")
    public WebHomeResponse getHome(@AuthenticationPrincipal User user) {
        // 웹은 더 많은 데이터와 상세 정보
        return new WebHomeResponse(
            productService.getRecommended(user),
            orderService.getRecent(user),
            userService.getProfile(user)  // 전체 프로필
        );
    }
}
```

**트레이드오프:**
- **장점**: 클라이언트 최적화, 네트워크 요청 감소, 버전 관리 용이
- **단점**: 코드 중복, 유지보수 비용, 서비스 수 증가

### 아키텍처 선택 가이드

| 규모/요구사항 | 권장 아키텍처 | 이유 |
|-------------|-------------|------|
| **소규모 (~1만 req/s)** | 단일 서버 + Nginx | 간단한 구성 |
| **중규모 (~10만 req/s)** | Load Balancer + 다중 서버 | 수평 확장 |
| **대규모 (~100만 req/s)** | API Gateway + LB + CDN | 글로벌 분산 |
| **마이크로서비스** | API Gateway + Circuit Breaker | 장애 격리 |
| **멀티 플랫폼** | BFF 패턴 | 클라이언트 최적화 |
| **실시간 필요** | WebSocket + Load Balancer | 양방향 통신 |

### 진화 경로

```
1단계: 단일 서버
   ↓ (트래픽 증가)
2단계: Load Balancer 추가
   ↓ (정적 파일 부하)
3단계: CDN 도입
   ↓ (마이크로서비스 전환)
4단계: API Gateway + Circuit Breaker
   ↓ (멀티 플랫폼)
5단계: BFF 패턴
   ↓ (실시간 요구사항)
6단계: WebSocket/gRPC 추가
```

## 정리

**HTTP 기본:**
- 요청-응답 구조, Stateless
- HTTP 메서드: GET(조회), POST(생성), PUT(수정), DELETE(삭제)
- 상태 코드: 2xx(성공), 4xx(클라이언트 오류), 5xx(서버 오류)
- HTTP/1.1 → HTTP/2 → HTTP/3 진화

**실시간 통신:**
- Long Polling: 간단하지만 비효율적
- SSE: 서버→클라이언트 단방향 스트리밍
- WebSocket: 양방향 실시간 통신
- gRPC: 고성능 마이크로서비스 통신

**아키텍처 패턴:**
- API Gateway: 중앙 진입점, 인증, Rate Limiting
- Load Balancer: 트래픽 분산, 고가용성
- CDN: 전 세계 빠른 응답, 오리진 부하 감소
- Circuit Breaker: 장애 격리, 빠른 실패
- BFF: 클라이언트별 최적화

**선택 기준:**
- 요청량과 확장성 요구사항에 따라 아키텍처 선택
- 실시간성 필요 여부에 따라 통신 기술 선택
- 비용, 복잡도, 유지보수를 고려한 점진적 진화
