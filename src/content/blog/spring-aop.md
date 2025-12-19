---
title: 'AOP - 횡단 관심사 분리로 코드 중복 제거하기'
description: 'Spring AOP의 핵심 개념과 실전 활용법, 프록시 동작 원리까지 정리했습니다'
pubDate: 'Dec 19 2024'
tags: ['Spring', 'Architecture']
series: 'spring-fundamentals'
seriesOrder: 2
quiz:
  - question: 'Spring AOP에서 @Around Advice의 특징으로 옳지 않은 것은?'
    options:
      - 'ProceedingJoinPoint.proceed()를 호출해야 원본 메서드가 실행된다'
      - '메서드 실행 전후 모두 제어할 수 있다'
      - '원본 메서드의 반환값을 변경할 수 있다'
      - 'proceed() 호출 없이도 원본 메서드가 자동 실행된다'
    correctAnswer: 3
    explanation: '@Around는 proceed()를 명시적으로 호출해야 원본 메서드가 실행됩니다. 호출하지 않으면 원본 메서드가 실행되지 않습니다.'

  - question: 'Spring AOP의 self-invocation 문제 해결 방법으로 적절하지 않은 것은?'
    options:
      - 'ApplicationContext에서 Bean을 가져와서 호출'
      - '@Async로 비동기 처리'
      - 'AopContext.currentProxy()로 프록시 참조'
      - '메서드를 별도 Bean으로 분리'
    correctAnswer: 1
    explanation: '@Async는 비동기 처리를 위한 것이지 self-invocation 문제 해결과는 관련 없습니다.'

  - question: 'execution(* com.example.service.*Service.find*(..))의 의미는?'
    options:
      - 'service 패키지의 모든 클래스, 모든 메서드'
      - 'service 패키지의 *Service 클래스, find로 시작하는 메서드'
      - 'service 패키지의 Service 인터페이스, find 메서드만'
      - 'service 패키지의 모든 하위 패키지 포함'
    correctAnswer: 1
    explanation: '*Service는 클래스명 패턴, find*는 메서드명 패턴입니다. 하위 패키지를 포함하려면 *..가 필요합니다.'

  - question: 'JDK Dynamic Proxy와 CGLIB 프록시의 차이점은?'
    options:
      - 'JDK는 인터페이스 필요, CGLIB는 클래스만으로 가능'
      - 'JDK는 클래스 상속, CGLIB는 인터페이스 구현'
      - 'JDK는 런타임 프록시, CGLIB는 컴파일타임 프록시'
      - 'JDK는 Spring 전용, CGLIB는 범용'
    correctAnswer: 0
    explanation: 'JDK Dynamic Proxy는 인터페이스 기반, CGLIB는 클래스 상속 기반입니다. Spring Boot는 기본적으로 CGLIB를 사용합니다.'

  - question: '@Transactional이 동작하지 않는 경우는?'
    options:
      - 'public 메서드에 적용'
      - '같은 클래스 내부 메서드 호출'
      - '인터페이스에 적용'
      - '@Service 클래스에 적용'
    correctAnswer: 1
    explanation: '같은 클래스 내부 호출은 프록시를 거치지 않아 AOP가 동작하지 않습니다(self-invocation 문제).'
---

Spring을 사용하다 보면 @Transactional, @Async, @Cacheable 같은 어노테이션만 붙이면 기능이 동작하는 것을 경험합니다. 이게 어떻게 가능한지, 내부에서 무슨 일이 벌어지는지 이해하면 문제 상황에서 빠르게 대처할 수 있습니다.

## 왜 AOP가 필요한가

실무 코드를 보면 비즈니스 로직 외에 반복되는 코드가 많습니다.

```java
@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    public User createUser(UserRequest request) {
        log.info("createUser 시작 - request: {}", request);
        long startTime = System.currentTimeMillis();

        try {
            // 실제 비즈니스 로직
            User user = new User(request);
            userRepository.save(user);

            log.info("createUser 성공 - userId: {}", user.getId());
            return user;
        } catch (Exception e) {
            log.error("createUser 실패", e);
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("createUser 실행 시간: {}ms", duration);
        }
    }

    public void deleteUser(Long userId) {
        log.info("deleteUser 시작 - userId: {}", userId);
        long startTime = System.currentTimeMillis();

        try {
            // 실제 비즈니스 로직
            userRepository.deleteById(userId);

            log.info("deleteUser 성공");
        } catch (Exception e) {
            log.error("deleteUser 실패", e);
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("deleteUser 실행 시간: {}ms", duration);
        }
    }
}
```

모든 메서드에 로깅, 성능 측정 코드가 중복됩니다. 메서드가 100개면 100번 반복합니다.

**문제점:**
- 핵심 비즈니스 로직이 부가 기능에 묻혀서 보이지 않음
- 로깅 방식을 변경하려면 모든 메서드를 수정해야 함
- 실수로 누락하기 쉬움

AOP는 이런 **횡단 관심사**(Cross-cutting Concerns)를 분리합니다.

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("execution(* com.example.service.*.*(..))")
    public Object log(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        log.info("{} 시작", methodName);
        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();
            log.info("{} 성공", methodName);
            return result;
        } catch (Exception e) {
            log.error("{} 실패", methodName, e);
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("{} 실행 시간: {}ms", methodName, duration);
        }
    }
}
```

이제 Service는 핵심 로직만 포함합니다.

```java
@Service
public class UserService {

    public User createUser(UserRequest request) {
        User user = new User(request);
        userRepository.save(user);
        return user;
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }
}
```

로깅 코드가 완전히 사라졌습니다. 하지만 실행하면 여전히 로그가 출력됩니다.

## AOP 핵심 용어

### Aspect
부가 기능을 모듈화한 것입니다. 로깅, 트랜잭션, 보안 같은 관심사를 하나로 묶습니다.

```java
@Aspect  // 이 클래스가 Aspect임을 선언
@Component
public class LoggingAspect {
    // ...
}
```

### JoinPoint
Aspect를 적용할 수 있는 지점입니다. Spring AOP에서는 **메서드 실행 시점**만 지원합니다.

```java
public Object log(ProceedingJoinPoint joinPoint) {
    // joinPoint: 실행되는 메서드 정보
    String methodName = joinPoint.getSignature().getName();
    Object[] args = joinPoint.getArgs();
}
```

AspectJ를 사용하면 생성자, 필드 접근 등도 가능하지만, Spring AOP는 메서드 실행만 지원합니다.

### Pointcut
Aspect를 어디에 적용할지 정의하는 표현식입니다.

```java
@Around("execution(* com.example.service.*.*(..))")
        // ↑ Pointcut: service 패키지의 모든 메서드
```

### Advice
실제로 수행할 부가 기능입니다. JoinPoint에서 **언제** 실행할지 정의합니다.

| Advice 타입 | 실행 시점 | 사용 사례 |
|------------|---------|----------|
| **@Before** | 메서드 실행 전 | 파라미터 검증, 로깅 |
| **@AfterReturning** | 정상 반환 후 | 반환값 로깅, 후처리 |
| **@AfterThrowing** | 예외 발생 후 | 에러 로깅, 알림 |
| **@After** | 메서드 종료 후 (finally) | 리소스 정리 |
| **@Around** | 전후 모두 제어 | 성능 측정, 트랜잭션 |

### Target
Aspect가 적용될 실제 객체입니다. 프록시가 감싸는 원본 객체입니다.

```java
UserService userService;  // 실제로는 프록시
// 내부에 실제 UserService가 Target으로 존재
```

## Advice 타입 상세

### @Before
메서드 실행 전에 동작합니다.

```java
@Aspect
@Component
public class ValidationAspect {

    @Before("@annotation(com.example.annotation.ValidateParams)")
    public void validateParams(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            if (arg == null) {
                throw new IllegalArgumentException("파라미터는 null일 수 없습니다");
            }
        }
    }
}
```

```java
@Service
public class UserService {

    @ValidateParams
    public User createUser(String username, String email) {
        // validateParams() 먼저 실행됨
        return new User(username, email);
    }
}
```

**특징:**
- 원본 메서드 실행을 막을 수 없음 (예외를 던지면 중단됨)
- 반환값이 없음

### @AfterReturning
메서드가 정상적으로 반환된 후 실행됩니다.

```java
@Aspect
@Component
public class AuditAspect {

    @AfterReturning(
        pointcut = "execution(* com.example.service.OrderService.createOrder(..))",
        returning = "order"
    )
    public void auditOrderCreation(Order order) {
        auditLog.info("주문 생성됨 - orderId: {}, amount: {}",
            order.getId(), order.getAmount());
    }
}
```

**특징:**
- 반환값을 받아서 사용 가능
- 반환값을 변경할 수는 없음 (변경하려면 @Around 사용)

### @AfterThrowing
예외가 발생했을 때 실행됩니다.

```java
@Aspect
@Component
public class ErrorHandlingAspect {

    @AfterThrowing(
        pointcut = "execution(* com.example.service.*.*(..))",
        throwing = "ex"
    )
    public void handleException(JoinPoint joinPoint, Exception ex) {
        String methodName = joinPoint.getSignature().getName();

        // Slack 알림 전송
        slackNotifier.sendError(
            "메서드 실행 중 오류: " + methodName,
            ex.getMessage()
        );
    }
}
```

**특징:**
- 특정 예외 타입만 캐치 가능
- 예외를 처리하거나 변경할 수 없음 (그대로 전파됨)

### @After
finally 블록처럼 메서드 종료 후 항상 실행됩니다.

```java
@Aspect
@Component
public class ResourceCleanupAspect {

    @After("execution(* com.example.service.FileService.*(..))")
    public void cleanup() {
        // 임시 파일 정리
        tempFileManager.cleanup();
    }
}
```

**특징:**
- 정상 반환, 예외 발생 모두 실행됨
- 반환값이나 예외 정보에 접근 불가

### @Around
가장 강력한 Advice입니다. 메서드 실행 전후를 모두 제어합니다.

```java
@Aspect
@Component
public class PerformanceAspect {

    @Around("@annotation(com.example.annotation.Timed)")
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();

        // 실행 전
        log.info("[{}] 시작", methodName);
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();

        try {
            // 원본 메서드 실행
            Object result = joinPoint.proceed();

            // 정상 반환 후
            stopWatch.stop();
            log.info("[{}] 완료 - {}ms", methodName, stopWatch.getTotalTimeMillis());

            return result;
        } catch (Exception e) {
            // 예외 발생 후
            stopWatch.stop();
            log.error("[{}] 실패 - {}ms", methodName, stopWatch.getTotalTimeMillis(), e);
            throw e;
        }
    }
}
```

**특징:**
- `joinPoint.proceed()` 호출로 원본 메서드 실행
- proceed() 호출 안 하면 원본 메서드가 실행되지 않음
- 반환값 변경 가능
- 파라미터 변경 가능: `proceed(modifiedArgs)`

**@Around vs 다른 Advice:**

```java
// 이 코드는
@Before
public void before() { log.info("before"); }

@AfterReturning
public void after() { log.info("after"); }

// @Around로 대체 가능
@Around
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
    log.info("before");
    Object result = joinPoint.proceed();
    log.info("after");
    return result;
}
```

하지만 단순한 경우는 명확성을 위해 @Before, @After를 사용하는 것이 좋습니다.

## Pointcut 표현식

### execution
가장 많이 사용하는 표현식입니다. 메서드 시그니처로 매칭합니다.

```
execution(접근제어자? 반환타입 패키지.클래스.메서드(파라미터) 예외?)
```

**예시:**

```java
// 모든 public 메서드
execution(public * *(..))

// com.example.service 패키지의 모든 메서드
execution(* com.example.service.*.*(..))

// com.example.service와 하위 패키지의 모든 메서드
execution(* com.example.service..*.*(..))

// 이름이 Service로 끝나는 클래스의 모든 메서드
execution(* com.example.service.*Service.*(..))

// find로 시작하는 메서드
execution(* com.example..*.*find*(..))

// 파라미터가 Long 하나인 메서드
execution(* com.example..*.*(Long))

// 파라미터가 String으로 시작하는 메서드
execution(* com.example..*.*(String, ..))

// User를 반환하는 메서드
execution(User com.example..*.*(..))
```

### within
특정 타입(클래스, 패키지)에 속한 메서드를 매칭합니다.

```java
// UserService의 모든 메서드
within(com.example.service.UserService)

// service 패키지의 모든 메서드
within(com.example.service.*)

// service와 하위 패키지의 모든 메서드
within(com.example.service..*)
```

**execution vs within:**

```java
// execution: 메서드 시그니처까지 세밀하게 지정
execution(public User com.example.service.UserService.findUser(Long))

// within: 타입만 지정 (간단하지만 덜 정확)
within(com.example.service.UserService)
```

### @annotation
특정 어노테이션이 붙은 메서드를 매칭합니다.

```java
// 커스텀 어노테이션 정의
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Timed {
}

// Pointcut
@Around("@annotation(com.example.annotation.Timed)")
public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
    // ...
}

// 사용
@Service
public class UserService {

    @Timed  // 이 메서드만 측정됨
    public User findUser(Long id) {
        return userRepository.findById(id);
    }
}
```

### @within
특정 어노테이션이 붙은 클래스의 모든 메서드를 매칭합니다.

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface Monitored {
}

@Around("@within(com.example.annotation.Monitored)")
public Object monitor(ProceedingJoinPoint joinPoint) throws Throwable {
    // ...
}

@Monitored  // 이 클래스의 모든 메서드가 모니터링됨
@Service
public class UserService {
    public User findUser(Long id) { }
    public void deleteUser(Long id) { }
}
```

### 조합 사용

```java
@Aspect
@Component
public class CombinedAspect {

    // service 패키지 AND public 메서드
    @Before("execution(public * com.example.service..*(..))")
    public void publicServiceMethods() { }

    // @Transactional OR @Async
    @Around("@annotation(org.springframework.transaction.annotation.Transactional) " +
            "|| @annotation(org.springframework.scheduling.annotation.Async)")
    public Object transactionalOrAsync(ProceedingJoinPoint joinPoint) throws Throwable {
        // ...
    }

    // service 패키지 AND find로 시작 AND 파라미터 1개
    @Around("execution(* com.example.service..*.find*(..)) " +
            "&& args(id)")
    public Object cacheable(ProceedingJoinPoint joinPoint, Long id) throws Throwable {
        // ...
    }
}
```

### Pointcut 재사용

```java
@Aspect
@Component
public class CommonPointcuts {

    @Pointcut("execution(* com.example.service..*(..))")
    public void serviceLayer() {}

    @Pointcut("execution(* com.example.repository..*(..))")
    public void repositoryLayer() {}

    @Pointcut("serviceLayer() || repositoryLayer()")
    public void dataAccessLayer() {}
}

@Aspect
@Component
public class LoggingAspect {

    // 재사용
    @Before("com.example.aspect.CommonPointcuts.serviceLayer()")
    public void logServiceLayer() {
        // ...
    }
}
```

## 실전 활용 사례

### 1. 성능 측정

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PerformanceMonitor {
    long threshold() default 1000;  // ms
}

@Aspect
@Component
public class PerformanceAspect {

    @Around("@annotation(performanceMonitor)")
    public Object monitor(ProceedingJoinPoint joinPoint,
                         PerformanceMonitor performanceMonitor) throws Throwable {
        long startTime = System.currentTimeMillis();

        try {
            return joinPoint.proceed();
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            if (duration > performanceMonitor.threshold()) {
                log.warn("느린 메서드 감지: {} - {}ms (기준: {}ms)",
                    joinPoint.getSignature().getName(),
                    duration,
                    performanceMonitor.threshold());
            }
        }
    }
}
```

```java
@Service
public class UserService {

    @PerformanceMonitor(threshold = 500)
    public List<User> findAllUsers() {
        // 500ms 넘으면 경고 로그
        return userRepository.findAll();
    }
}
```

### 2. 재시도 로직

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Retry {
    int maxAttempts() default 3;
    long delay() default 1000;
    Class<? extends Exception>[] retryFor() default {Exception.class};
}

@Aspect
@Component
public class RetryAspect {

    @Around("@annotation(retry)")
    public Object retry(ProceedingJoinPoint joinPoint, Retry retry) throws Throwable {
        int attempts = 0;
        Throwable lastException = null;

        while (attempts < retry.maxAttempts()) {
            try {
                return joinPoint.proceed();
            } catch (Exception e) {
                lastException = e;

                // retryFor에 지정된 예외만 재시도
                if (!isRetryableException(e, retry.retryFor())) {
                    throw e;
                }

                attempts++;
                if (attempts < retry.maxAttempts()) {
                    log.warn("재시도 {}/{}: {}",
                        attempts, retry.maxAttempts(), e.getMessage());
                    Thread.sleep(retry.delay());
                }
            }
        }

        throw lastException;
    }

    private boolean isRetryableException(Exception e, Class<? extends Exception>[] retryFor) {
        for (Class<? extends Exception> exceptionClass : retryFor) {
            if (exceptionClass.isInstance(e)) {
                return true;
            }
        }
        return false;
    }
}
```

```java
@Service
public class ExternalApiService {

    @Retry(maxAttempts = 3, delay = 2000, retryFor = {TimeoutException.class})
    public String callExternalApi() {
        // 네트워크 타임아웃 시 3번까지 재시도
        return restTemplate.getForObject("https://api.example.com/data", String.class);
    }
}
```

### 3. API 요청 제한 (Rate Limiting)

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int requests() default 10;
    int period() default 60;  // seconds
}

@Aspect
@Component
public class RateLimitAspect {
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    @Before("@annotation(rateLimit)")
    public void checkRateLimit(JoinPoint joinPoint, RateLimit rateLimit) {
        String key = joinPoint.getSignature().toLongString();

        RateLimiter limiter = limiters.computeIfAbsent(key, k ->
            RateLimiter.create(rateLimit.requests(), Duration.ofSeconds(rateLimit.period()))
        );

        if (!limiter.tryAcquire()) {
            throw new RateLimitExceededException(
                "요청 제한 초과: " + rateLimit.requests() + "회/" + rateLimit.period() + "초"
            );
        }
    }
}
```

```java
@RestController
public class ApiController {

    @RateLimit(requests = 5, period = 60)
    @GetMapping("/api/data")
    public ResponseEntity<Data> getData() {
        // 1분에 5번까지만 허용
        return ResponseEntity.ok(dataService.getData());
    }
}
```

### 4. 로깅 자동화

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("execution(* com.example.controller..*(..))")
    public Object logController(ProceedingJoinPoint joinPoint) throws Throwable {
        HttpServletRequest request =
            ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                .getRequest();

        log.info("API 요청: {} {} - {}",
            request.getMethod(),
            request.getRequestURI(),
            joinPoint.getSignature().getName());

        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();

            long duration = System.currentTimeMillis() - startTime;
            log.info("API 응답: 성공 - {}ms", duration);

            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("API 응답: 실패 - {}ms", duration, e);
            throw e;
        }
    }
}
```

### 5. 캐싱

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Cacheable {
    String key();
    long ttl() default 3600;  // seconds
}

@Aspect
@Component
public class CacheAspect {
    private final CacheManager cacheManager;

    @Around("@annotation(cacheable)")
    public Object cache(ProceedingJoinPoint joinPoint, Cacheable cacheable) throws Throwable {
        String cacheKey = generateKey(joinPoint, cacheable.key());

        // 캐시 조회
        Object cached = cacheManager.get(cacheKey);
        if (cached != null) {
            log.debug("캐시 히트: {}", cacheKey);
            return cached;
        }

        // 캐시 미스: 실제 메서드 실행
        Object result = joinPoint.proceed();

        // 캐시 저장
        cacheManager.put(cacheKey, result, cacheable.ttl());
        log.debug("캐시 저장: {}", cacheKey);

        return result;
    }

    private String generateKey(ProceedingJoinPoint joinPoint, String keyPattern) {
        // key = "user:{0}" → "user:123"
        Object[] args = joinPoint.getArgs();
        return keyPattern.replaceAll("\\{(\\d+)\\}", args[$1].toString());
    }
}
```

```java
@Service
public class UserService {

    @Cacheable(key = "user:{0}", ttl = 1800)
    public User findUser(Long id) {
        // 30분간 캐시됨
        return userRepository.findById(id);
    }
}
```

## Spring AOP 내부 동작 - 프록시 방식

Spring AOP는 **프록시 패턴**으로 구현됩니다. 실제 객체를 감싸는 프록시 객체를 생성해서 부가 기능을 추가합니다.

### 프록시 생성 과정

```java
@Service
public class UserService {
    public User findUser(Long id) {
        return userRepository.findById(id);
    }
}
```

Spring이 하는 일:

```java
// 1. 실제 UserService 객체 생성
UserService target = new UserService();

// 2. 프록시 객체 생성 (Aspect 적용)
UserService proxy = createProxy(target);

// 3. Spring Container에 프록시 등록
context.registerBean("userService", proxy);
```

실제 호출:

```java
@Autowired
private UserService userService;  // 프록시 객체가 주입됨

userService.findUser(1L);

// 실제로는:
// 1. proxy.findUser(1L) 호출
// 2. @Before Advice 실행
// 3. target.findUser(1L) 호출
// 4. @AfterReturning Advice 실행
```

### 두 가지 프록시 방식

**1. JDK Dynamic Proxy (인터페이스 기반)**

```java
public interface UserService {
    User findUser(Long id);
}

@Service
public class UserServiceImpl implements UserService {
    @Override
    public User findUser(Long id) {
        return userRepository.findById(id);
    }
}
```

Spring이 생성하는 프록시:

```java
class UserServiceProxy implements UserService {
    private UserService target;
    private List<Advice> advices;

    @Override
    public User findUser(Long id) {
        // Before Advice 실행
        for (Advice advice : advices) {
            if (advice instanceof BeforeAdvice) {
                advice.before();
            }
        }

        // 실제 메서드 호출
        User result = target.findUser(id);

        // After Advice 실행
        for (Advice advice : advices) {
            if (advice instanceof AfterAdvice) {
                advice.after();
            }
        }

        return result;
    }
}
```

**2. CGLIB (클래스 기반)**

```java
@Service
public class UserService {  // 인터페이스 없음
    public User findUser(Long id) {
        return userRepository.findById(id);
    }
}
```

Spring이 생성하는 프록시:

```java
class UserService$$EnhancerBySpringCGLIB extends UserService {
    private UserService target;

    @Override
    public User findUser(Long id) {
        // Advice 실행
        // ...

        // 부모(실제) 메서드 호출
        return super.findUser(id);
    }
}
```

**JDK vs CGLIB 비교:**

| 특징 | JDK Dynamic Proxy | CGLIB |
|------|------------------|-------|
| **기반** | 인터페이스 구현 | 클래스 상속 |
| **필요조건** | 인터페이스 필수 | 클래스만 있으면 가능 |
| **final 제약** | 없음 | final 메서드/클래스 불가 |
| **성능** | 약간 느림 | 약간 빠름 |
| **Spring Boot 기본** | 아님 | **기본값** |

**Spring Boot 설정:**

```yaml
# application.yml
spring:
  aop:
    proxy-target-class: true  # CGLIB (기본값)
    # proxy-target-class: false  # JDK Dynamic Proxy
```

## 주의사항과 한계

### self-invocation 문제

같은 클래스 내부 메서드 호출은 프록시를 거치지 않아 AOP가 동작하지 않습니다.

```java
@Service
public class UserService {

    @Transactional
    public void createUser(User user) {
        userRepository.save(user);
        sendEmail(user);  // 내부 호출
    }

    @Async  // 동작 안 함!
    public void sendEmail(User user) {
        emailService.send(user.getEmail());
    }
}
```

**왜 안 될까?**

```java
// 실제로는 이렇게 호출됨
UserServiceProxy proxy = context.getBean(UserService.class);
proxy.createUser(user);  // 프록시를 거침

// proxy 내부:
public void createUser(User user) {
    // @Transactional 처리

    // 실제 메서드 호출
    target.createUser(user);
}

// UserService 내부:
public void createUser(User user) {
    userRepository.save(user);
    this.sendEmail(user);  // this는 프록시가 아닌 실제 객체!
}
```

**해결 방법:**

**1. 메서드를 별도 Bean으로 분리 (권장)**

```java
@Service
public class UserService {
    private final EmailService emailService;

    @Transactional
    public void createUser(User user) {
        userRepository.save(user);
        emailService.sendEmail(user);  // 별도 Bean 호출
    }
}

@Service
public class EmailService {

    @Async
    public void sendEmail(User user) {
        emailService.send(user.getEmail());
    }
}
```

**2. AopContext 사용**

```java
@Service
public class UserService {

    @Transactional
    public void createUser(User user) {
        userRepository.save(user);

        // 현재 프록시 참조
        ((UserService) AopContext.currentProxy()).sendEmail(user);
    }

    @Async
    public void sendEmail(User user) {
        emailService.send(user.getEmail());
    }
}
```

```yaml
# application.yml
spring:
  aop:
    proxy-target-class: true
    expose-proxy: true  # 필수
```

**3. ApplicationContext에서 Bean 가져오기**

```java
@Service
public class UserService {
    @Autowired
    private ApplicationContext context;

    @Transactional
    public void createUser(User user) {
        userRepository.save(user);

        UserService self = context.getBean(UserService.class);
        self.sendEmail(user);  // 프록시를 거침
    }
}
```

### final 메서드는 AOP 적용 불가 (CGLIB)

```java
@Service
public class UserService {

    @Transactional
    public final void createUser(User user) {  // AOP 적용 안 됨!
        userRepository.save(user);
    }
}
```

CGLIB는 클래스를 상속하므로 final 메서드를 오버라이드할 수 없습니다.

해결: final 제거하거나 인터페이스 사용 (JDK Proxy)

### private 메서드는 AOP 적용 불가

```java
@Service
public class UserService {

    @Transactional  // 적용 안 됨!
    private void createUser(User user) {
        userRepository.save(user);
    }
}
```

프록시는 외부에서 호출 가능한 메서드만 감쌀 수 있습니다.

해결: public으로 변경하거나 별도 Bean으로 분리

### 성능 오버헤드

프록시 방식은 메서드 호출마다 오버헤드가 발생합니다.

```java
// 프록시 없음: 직접 호출
userService.findUser(1L);  // ~0.001ms

// 프록시 있음: 프록시 → Advice → 실제 메서드
proxy.findUser(1L);  // ~0.005ms (5배)
```

**최적화 방법:**

```java
// 나쁨: 매우 빈번한 호출에 AOP
@Around("execution(* com.example..*.*(..))")
public Object logEverything(ProceedingJoinPoint joinPoint) {
    // 모든 메서드 호출마다 실행 (성능 저하)
}

// 좋음: 필요한 곳만 적용
@Around("@annotation(com.example.annotation.PerformanceMonitor)")
public Object monitorCriticalMethods(ProceedingJoinPoint joinPoint) {
    // @PerformanceMonitor가 붙은 메서드만
}
```

## 정리

**핵심 개념:**
- AOP는 횡단 관심사를 분리해서 코드 중복을 제거합니다
- Aspect = 부가 기능, Pointcut = 적용 위치, Advice = 실행 시점
- @Before, @After, @Around 등 5가지 Advice 타입 제공
- execution, @annotation 등 다양한 Pointcut 표현식 지원

**실전 활용:**
- 성능 측정, 로깅, 재시도, Rate Limiting, 캐싱 등에 유용
- 커스텀 어노테이션으로 명시적이고 재사용 가능한 AOP 구현
- 비즈니스 로직에서 부가 기능을 완전히 분리

**내부 동작:**
- 프록시 패턴으로 구현 (JDK Dynamic Proxy 또는 CGLIB)
- Spring Boot는 CGLIB를 기본으로 사용
- 프록시 객체가 실제 객체를 감싸서 부가 기능 제공

**주의사항:**
- self-invocation 문제: 내부 호출은 프록시를 거치지 않음
- final, private 메서드는 AOP 적용 불가
- 성능 오버헤드 고려: 빈번한 호출에는 신중하게 사용
- @Transactional, @Async도 AOP로 구현되므로 같은 제약 적용

**선택 기준:**
- 여러 클래스에 반복되는 코드 → AOP로 분리
- 핵심 로직과 부가 기능 구분 → 유지보수성 향상
- 명시적 표현 필요 시 → 커스텀 어노테이션 활용
