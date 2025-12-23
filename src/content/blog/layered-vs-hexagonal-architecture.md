---
title: '레이어드 vs 헥사고날 아키텍처 - 단순함과 유연성의 선택'
description: '전통적인 레이어드 아키텍처와 헥사고날 아키텍처의 차이, 트레이드오프, 실무 선택 기준을 정리했습니다'
pubDate: 'Dec 19 2024'
tags: ['Architecture', 'Spring']
series: 'tech-tradeoffs'
seriesOrder: 3
quiz:
  - question: '레이어드 아키텍처에서 의존성 방향은?'
    options:
      - 'Controller → Service → Repository'
      - 'Repository → Service → Controller'
      - 'Service → Controller, Repository'
      - '양방향 의존성'
    correctAnswer: 0
    explanation: '레이어드 아키텍처는 상위 레이어가 하위 레이어를 의존합니다. Controller가 Service를, Service가 Repository를 의존합니다.'

  - question: '헥사고날 아키텍처의 핵심 원칙은?'
    options:
      - '계층을 3개로 나눈다'
      - '비즈니스 로직이 외부 기술에 의존하지 않는다'
      - 'Controller를 6개 만든다'
      - 'DB를 먼저 설계한다'
    correctAnswer: 1
    explanation: '헥사고날 아키텍처는 비즈니스 로직(도메인)을 중심에 두고, 외부 기술(DB, API 등)은 포트와 어댑터를 통해 연결합니다. 도메인은 외부를 알지 못합니다.'

  - question: '다음 중 헥사고날 아키텍처의 "포트"에 해당하는 것은?'
    options:
      - 'JpaRepository 구현체'
      - 'Service 인터페이스'
      - 'RestTemplate'
      - '@Controller 클래스'
    correctAnswer: 1
    explanation: '포트는 인터페이스로, 도메인이 외부와 통신하는 계약입니다. Service 인터페이스가 포트 역할을 하며, 구현체(어댑터)는 외부에 있습니다.'

  - question: '레이어드 아키텍처가 적합한 경우는?'
    options:
      - '대규모 엔터프라이즈 프로젝트'
      - '빠른 프로토타이핑과 단순한 CRUD'
      - '외부 시스템 연동이 복잡한 경우'
      - 'MSA 전환 예정인 프로젝트'
    correctAnswer: 1
    explanation: '레이어드 아키텍처는 구조가 단순하고 학습 곡선이 낮아 빠른 개발이 필요하거나 요구사항이 단순한 프로젝트에 적합합니다.'

  - question: '헥사고날 아키텍처에서 테스트가 쉬운 이유는?'
    options:
      - '테스트 코드가 자동 생성된다'
      - '외부 의존성을 Fake로 쉽게 교체할 수 있다'
      - '테스트가 필요 없다'
      - 'Mock 라이브러리가 내장되어 있다'
    correctAnswer: 1
    explanation: '포트(인터페이스)를 통해 외부와 통신하므로, 실제 DB나 API 대신 Fake 구현체를 주입하여 독립적인 테스트가 가능합니다.'
---

새 프로젝트를 시작할 때마다 고민합니다. Controller-Service-Repository 구조로 단순하게 갈까요? 아니면 도메인 중심의 헥사고날 아키텍처로 갈까요?

초기에는 레이어드 아키텍처로 빠르게 개발하다가, 비즈니스 로직이 복잡해지고 외부 시스템 연동이 늘어나면서 Service 계층이 비대해집니다. DB 기술을 바꾸거나 API를 교체하려면 전체 코드를 수정해야 합니다.

## 레이어드 아키텍처란

레이어드(Layered) 아키텍처는 애플리케이션을 수평 계층으로 나누는 전통적인 방식입니다.

### 기본 구조

```
┌─────────────────┐
│  Presentation   │  Controller (API, View)
├─────────────────┤
│    Business     │  Service (비즈니스 로직)
├─────────────────┤
│  Persistence    │  Repository (데이터 접근)
├─────────────────┤
│    Database     │  MySQL, PostgreSQL
└─────────────────┘
```

**의존성 방향**: 상위 → 하위 (단방향)
- Controller는 Service에 의존
- Service는 Repository에 의존
- Repository는 Database에 의존

### 코드 예시

```java
// Presentation Layer
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody UserRequest request) {
        return userService.createUser(request);
    }
}

// Business Layer
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public UserResponse createUser(UserRequest request) {
        // 비즈니스 로직
        User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .build();

        userRepository.save(user);
        emailService.sendWelcomeEmail(user.getEmail());

        return UserResponse.from(user);
    }
}

// Persistence Layer
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

// Domain (Entity)
@Entity
@Getter
@NoArgsConstructor
public class User {
    @Id @GeneratedValue
    private Long id;

    private String username;
    private String email;

    // JPA 어노테이션이 도메인에 침투
}
```

### 특징과 트레이드오프

**장점:**
- **단순함**: 구조가 직관적이고 이해하기 쉬움
- **빠른 개발**: 학습 곡선이 낮아 신규 개발자도 빠르게 적응
- **Spring 기본 구조**: Spring Boot가 권장하는 기본 패키지 구조와 일치
- **CRUD 친화적**: 간단한 데이터 처리에 최적화

**단점:**
- **강한 결합**: Service가 Repository(JPA)에 직접 의존
- **기술 종속**: 도메인 모델이 JPA, Jackson 등 프레임워크에 의존
- **테스트 어려움**: 실제 DB 없이 Service 테스트가 어려움
- **비즈니스 로직 분산**: Service에 모든 로직이 집중되어 비대해짐

### 실제 문제 상황

```java
@Service
public class UserService {
    private final UserRepository userRepository;  // JPA
    private final RestTemplate restTemplate;      // HTTP Client
    private final RedisTemplate redisTemplate;    // Redis

    public UserResponse createUser(UserRequest request) {
        // 1. DB 저장 (JPA 의존)
        User user = userRepository.save(...);

        // 2. 외부 API 호출 (RestTemplate 의존)
        PaymentResponse payment = restTemplate.postForObject(...);

        // 3. 캐시 저장 (Redis 의존)
        redisTemplate.opsForValue().set(...);

        // 비즈니스 로직이 기술에 강하게 결합됨
    }
}
```

**문제:**
- JPA를 MyBatis로 바꾸려면? → Service 전체 수정
- RestTemplate을 WebClient로 바꾸려면? → Service 전체 수정
- 외부 API 없이 Service를 테스트하려면? → 어려움

## 헥사고날 아키텍처란

헥사고날(Hexagonal) 아키텍처는 **포트와 어댑터(Ports & Adapters)** 패턴이라고도 불립니다. 비즈니스 로직을 중심에 두고 외부 기술을 분리합니다.

### 기본 구조

```
           ┌─────────────┐
           │   Adapter   │ (Controller, API)
           │  (Driving)  │
           └──────┬──────┘
                  │
          ┌───────▼────────┐
          │  Inbound Port  │ (UseCase Interface)
          │                │
          │  ┌──────────┐  │
          │  │ Domain   │  │ (비즈니스 로직)
          │  │ (Core)   │  │
          │  └──────────┘  │
          │                │
          │ Outbound Port  │ (Repository Interface)
          └───────┬────────┘
                  │
           ┌──────▼──────┐
           │   Adapter   │ (JPA, HTTP, Redis)
           │  (Driven)   │
           └─────────────┘
```

**의존성 방향**: 외부 → 도메인 (의존성 역전)
- 어댑터(외부)가 포트(도메인)를 의존
- 도메인은 외부를 모름

### 주요 개념

**1. Domain (핵심)**
- 비즈니스 로직만 포함
- 프레임워크, DB, API에 의존하지 않음
- Pure Java 객체

**2. Port (인터페이스)**
- **Inbound Port**: 외부에서 도메인으로 들어오는 요청 (UseCase)
- **Outbound Port**: 도메인에서 외부로 나가는 요청 (Repository Interface)

**3. Adapter (구현체)**
- **Driving Adapter**: Inbound Port 호출 (Controller, Consumer)
- **Driven Adapter**: Outbound Port 구현 (JpaRepository, RestClient)

### 코드 예시

```java
// Domain Layer - 순수 비즈니스 로직
public class User {
    private Long id;
    private String username;
    private String email;

    // 프레임워크 어노테이션 없음 (Pure Java)

    public void changeEmail(String newEmail) {
        if (!isValidEmail(newEmail)) {
            throw new IllegalArgumentException("Invalid email");
        }
        this.email = newEmail;
    }

    private boolean isValidEmail(String email) {
        return email != null && email.contains("@");
    }
}

// Inbound Port (UseCase)
public interface CreateUserUseCase {
    UserResponse createUser(CreateUserCommand command);
}

// Outbound Port (Repository Interface)
public interface UserRepository {
    User save(User user);
    Optional<User> findByEmail(String email);
}

public interface EmailSender {
    void sendWelcomeEmail(String email);
}

// Domain Service (비즈니스 로직 구현)
@Service
public class UserService implements CreateUserUseCase {
    private final UserRepository userRepository;
    private final EmailSender emailSender;

    // 인터페이스에만 의존 (구현체 모름)

    @Override
    public UserResponse createUser(CreateUserCommand command) {
        // 순수 비즈니스 로직
        User user = User.create(
            command.getUsername(),
            command.getEmail()
        );

        userRepository.save(user);
        emailSender.sendWelcomeEmail(user.getEmail());

        return UserResponse.from(user);
    }
}

// Driving Adapter (Controller)
@RestController
@RequiredArgsConstructor
public class UserController {
    private final CreateUserUseCase createUserUseCase;

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody UserRequest request) {
        CreateUserCommand command = CreateUserCommand.from(request);
        return createUserUseCase.createUser(command);
    }
}

// Driven Adapter (JPA Implementation)
@Component
public class UserRepositoryAdapter implements UserRepository {
    private final UserJpaRepository jpaRepository;

    @Override
    public User save(User user) {
        UserEntity entity = UserEntity.from(user);
        UserEntity saved = jpaRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email)
            .map(UserEntity::toDomain);
    }
}

// JPA Entity (Infrastructure)
@Entity
@Table(name = "users")
class UserEntity {
    @Id @GeneratedValue
    private Long id;
    private String username;
    private String email;

    public static UserEntity from(User user) {
        // Domain → Entity 변환
    }

    public User toDomain() {
        // Entity → Domain 변환
    }
}

@Repository
interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);
}
```

### 디렉토리 구조

```
src/main/java/com/example/
├── domain/
│   ├── user/
│   │   ├── User.java                    # 순수 도메인 모델
│   │   ├── CreateUserCommand.java       # Input DTO
│   │   └── UserResponse.java            # Output DTO
│   └── port/
│       ├── in/
│       │   └── CreateUserUseCase.java   # Inbound Port
│       └── out/
│           ├── UserRepository.java      # Outbound Port
│           └── EmailSender.java
├── application/
│   └── service/
│       └── UserService.java             # UseCase 구현
└── adapter/
    ├── in/
    │   └── web/
    │       └── UserController.java      # Driving Adapter
    └── out/
        ├── persistence/
        │   ├── UserJpaRepository.java
        │   ├── UserEntity.java
        │   └── UserRepositoryAdapter.java  # Driven Adapter
        └── email/
            └── SmtpEmailSender.java
```

### 특징과 트레이드오프

**장점:**
- **기술 독립성**: 도메인이 프레임워크에 의존하지 않음
- **테스트 용이성**: 인터페이스로 쉽게 Fake/Mock 교체
- **유연성**: DB, API 교체가 어댑터만 수정하면 됨
- **명확한 경계**: 비즈니스 로직과 기술이 분리됨

**단점:**
- **높은 복잡도**: 클래스와 인터페이스 수가 많음
- **학습 곡선**: 초보자가 이해하기 어려움
- **보일러플레이트**: Entity ↔ Domain 변환 코드 필요
- **과도한 설계**: 단순한 CRUD에는 오버엔지니어링

## 두 아키텍처 비교

### 구조 비교

| 측면 | 레이어드 | 헥사고날 |
|------|---------|----------|
| **의존성 방향** | 상위 → 하위 | 외부 → 도메인 |
| **도메인 위치** | Service 계층 | 중심 (독립적) |
| **클래스 수** | 적음 (간결) | 많음 (복잡) |
| **인터페이스** | 선택적 | 필수 (Port) |
| **Entity** | 도메인 겸용 | 분리 (DTO 변환) |

### 변경 영향도 비교

**시나리오: JPA → MyBatis 전환**

**레이어드:**
```java
// 변경 전
@Service
public class UserService {
    private final UserRepository userRepository;  // JpaRepository

    public User createUser(UserRequest request) {
        User user = new User();  // JPA Entity
        user.setUsername(request.getUsername());
        return userRepository.save(user);
    }
}

// 변경 후 → Service도 수정 필요
@Service
public class UserService {
    private final UserMapper userMapper;  // MyBatis

    public User createUser(UserRequest request) {
        User user = new User();  // MyBatis DTO
        userMapper.insert(user);
        return user;
    }
}
```
**영향 범위**: Service, Repository, Entity 모두 수정

**헥사고날:**
```java
// Domain Service - 변경 없음
public class UserService implements CreateUserUseCase {
    private final UserRepository userRepository;  // 인터페이스

    public UserResponse createUser(CreateUserCommand command) {
        User user = User.create(command);
        userRepository.save(user);  // 인터페이스 호출
        return UserResponse.from(user);
    }
}

// Adapter만 교체
@Component
public class UserMyBatisAdapter implements UserRepository {
    private final UserMapper mapper;

    @Override
    public User save(User user) {
        UserDto dto = UserDto.from(user);
        mapper.insert(dto);
        return user;
    }
}
```
**영향 범위**: Adapter만 수정 (도메인 불변)

### 테스트 비교

**레이어드:**
```java
@SpringBootTest
class UserServiceTest {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void createUser() {
        // 실제 DB 필요 또는 @MockBean 필요
        UserRequest request = new UserRequest("test", "test@example.com");

        UserResponse response = userService.createUser(request);

        assertThat(response).isNotNull();
    }
}
```

**헥사고날:**
```java
class UserServiceTest {
    private UserService userService;
    private FakeUserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository = new FakeUserRepository();
        EmailSender emailSender = new FakeEmailSender();
        userService = new UserService(userRepository, emailSender);
    }

    @Test
    void createUser() {
        // Spring 없이 순수 Java 테스트
        CreateUserCommand command = new CreateUserCommand("test", "test@example.com");

        UserResponse response = userService.createUser(command);

        assertThat(response).isNotNull();
        assertThat(userRepository.findAll()).hasSize(1);
    }
}

// Fake 구현
class FakeUserRepository implements UserRepository {
    private Map<Long, User> store = new HashMap<>();
    private Long id = 1L;

    @Override
    public User save(User user) {
        user.setId(id++);
        store.put(user.getId(), user);
        return user;
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return store.values().stream()
            .filter(u -> u.getEmail().equals(email))
            .findFirst();
    }
}
```

## 선택 가이드

### 레이어드 아키텍처가 적합한 경우

✅ **프로젝트 특성:**
- 간단한 CRUD 중심 애플리케이션
- 빠른 프로토타이핑이 필요한 경우
- 소규모 프로젝트 (팀원 1-3명)
- 비즈니스 로직이 단순한 경우

✅ **팀 상황:**
- 주니어 개발자 비율이 높음
- 아키텍처 학습 시간이 부족함
- Spring 기본 패턴에 익숙함

✅ **요구사항:**
- 외부 시스템 연동이 적음
- 기술 스택 변경 가능성이 낮음
- 빠른 출시가 최우선

**예시 프로젝트:**
- 사내 관리자 페이지
- 단순 게시판 서비스
- MVP 단계 스타트업 제품

### 헥사고날 아키텍처가 적합한 경우

✅ **프로젝트 특성:**
- 복잡한 비즈니스 로직
- 다양한 외부 시스템 연동 (결제, 알림, API)
- 장기 운영 예정 프로젝트
- MSA로 전환 가능성

✅ **팀 상황:**
- 시니어 개발자가 있음
- 클린 아키텍처 경험이 있음
- 테스트 주도 개발(TDD) 문화

✅ **요구사항:**
- 높은 테스트 커버리지 필요
- 기술 스택 변경 가능성 (DB, API)
- 도메인 지식이 중요함

**예시 프로젝트:**
- 금융/결제 시스템
- 전자상거래 플랫폼
- 엔터프라이즈 SaaS
- 레거시 시스템 현대화

### 의사결정 플로우

```
프로젝트 시작
    │
    ├─ 비즈니스 로직이 복잡한가?
    │   ├─ Yes → 헥사고날 고려
    │   └─ No → 레이어드
    │
    ├─ 외부 시스템 연동이 많은가?
    │   ├─ Yes (5개 이상) → 헥사고날
    │   └─ No → 레이어드
    │
    ├─ 기술 스택 변경 가능성?
    │   ├─ High → 헥사고날
    │   └─ Low → 레이어드
    │
    ├─ 테스트 커버리지 요구사항?
    │   ├─ >80% → 헥사고날
    │   └─ <60% → 레이어드
    │
    └─ 팀 경험 수준?
        ├─ Senior → 헥사고날
        └─ Junior → 레이어드
```

## 마이그레이션 전략

이미 레이어드로 개발 중이지만 복잡도가 증가한다면?

### 단계별 전환

**1단계: 인터페이스 도입**

```java
// Before
@Service
public class UserService {
    private final UserRepository userRepository;  // 직접 의존
}

// After
@Service
public class UserService {
    private final UserPort userPort;  // 인터페이스 의존

    public interface UserPort {
        User save(User user);
        Optional<User> findByEmail(String email);
    }
}

@Component
class UserAdapter implements UserService.UserPort {
    private final UserRepository repository;

    @Override
    public User save(User user) {
        return repository.save(user);
    }
}
```

**2단계: 도메인 분리**

```java
// Before: JPA Entity가 도메인
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;
    private String email;
}

// After: 도메인과 Entity 분리
// Domain
public class User {
    private Long id;
    private String email;

    public void changeEmail(String newEmail) {
        // 비즈니스 로직
    }
}

// Entity
@Entity
class UserEntity {
    @Id @GeneratedValue
    private Long id;
    private String email;

    public User toDomain() {
        return new User(id, email);
    }
}
```

**3단계: UseCase 패턴 적용**

```java
// Before
@RestController
public class UserController {
    private final UserService userService;

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody UserRequest request) {
        return userService.createUser(request);
    }
}

// After
public interface CreateUserUseCase {
    UserResponse execute(CreateUserCommand command);
}

@RestController
public class UserController {
    private final CreateUserUseCase createUserUseCase;

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody UserRequest request) {
        CreateUserCommand command = CreateUserCommand.from(request);
        return createUserUseCase.execute(command);
    }
}
```

### 점진적 전환 전략

```
Phase 1 (1-2주): 핵심 도메인부터
├─ 가장 복잡한 비즈니스 로직 선택
├─ 인터페이스 도입
└─ 단위 테스트 작성

Phase 2 (2-3주): 외부 의존성 분리
├─ Repository 인터페이스화
├─ 외부 API 인터페이스화
└─ Adapter 패턴 적용

Phase 3 (3-4주): 완전 분리
├─ 도메인 모델 분리
├─ UseCase 패턴 적용
└─ 디렉토리 재구성
```

**위험 관리:**
- 한 번에 전체 전환 ❌
- 모듈별/기능별 점진적 전환 ✅
- 기존 코드와 신규 코드 공존 허용
- 테스트 커버리지 유지

## 하이브리드 접근

실무에서는 두 패턴을 섞어 쓰기도 합니다.

### 도메인별 선택

```
프로젝트
├── user/        (단순 CRUD)
│   ├── UserController
│   ├── UserService
│   └── UserRepository
│
└── order/       (복잡한 비즈니스)
    ├── domain/
    │   └── Order.java
    ├── port/
    │   ├── in/CreateOrderUseCase.java
    │   └── out/OrderRepository.java
    ├── application/
    │   └── OrderService.java
    └── adapter/
        ├── web/OrderController.java
        └── persistence/OrderJpaAdapter.java
```

**전략:**
- 단순한 도메인 → 레이어드
- 복잡한 도메인 → 헥사고날

### 인터페이스 선택적 사용

```java
// 단순한 경우: 구현체 직접 의존
@Service
public class UserService {
    private final UserRepository userRepository;  // JpaRepository
}

// 복잡한 경우: 인터페이스 의존
@Service
public class PaymentService {
    private final PaymentPort paymentPort;  // 인터페이스

    public interface PaymentPort {
        PaymentResult process(Payment payment);
    }
}
```

## 정리

**레이어드 아키텍처:**
- Controller → Service → Repository 계층 구조
- 단순하고 빠른 개발에 유리
- 작은 프로젝트, 단순한 CRUD에 적합
- 기술 종속성과 테스트 어려움

**헥사고날 아키텍처:**
- 도메인 중심, 포트와 어댑터 분리
- 유연성과 테스트 용이성
- 복잡한 비즈니스, 외부 연동이 많은 프로젝트에 적합
- 높은 학습 곡선과 보일러플레이트 코드

**선택 기준:**
- **프로젝트 규모**: 작음 → 레이어드, 큼 → 헥사고날
- **비즈니스 복잡도**: 단순 → 레이어드, 복잡 → 헥사고날
- **팀 경험**: 주니어 → 레이어드, 시니어 → 헥사고날
- **변경 빈도**: 낮음 → 레이어드, 높음 → 헥사고날

**실무 팁:**
- 무조건적인 선택보다는 상황에 맞는 판단
- 레이어드로 시작해서 필요시 점진적 전환
- 도메인별로 다른 패턴 적용 가능
- 인터페이스는 필요한 곳에만 선택적 사용
