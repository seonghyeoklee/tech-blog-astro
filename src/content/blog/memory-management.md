---
title: '가상 메모리와 페이징 - 효율적인 메모리 관리'
description: '가상 메모리의 개념, 페이징 기법, 페이지 교체 알고리즘, 그리고 실무에서 메모리 문제를 해결하는 방법을 정리했습니다'
pubDate: 'Jan 14 2025'
series: 'operating-system-fundamentals'
seriesOrder: 5
tags: ['OS', 'CS']
quiz:
  - question: "가상 메모리의 가장 큰 장점은?"
    options:
      - "프로그램 실행 속도 향상"
      - "물리 메모리보다 큰 프로그램 실행 가능"
      - "CPU 사용률 감소"
      - "메모리 단편화 제거"
    correctAnswer: 1
    explanation: "가상 메모리를 사용하면 물리 메모리 크기와 무관하게 큰 프로그램을 실행할 수 있습니다. 필요한 부분만 메모리에 올리고 나머지는 디스크에 저장합니다."

  - question: "페이지 테이블의 역할은?"
    options:
      - "프로세스 스케줄링"
      - "가상 주소를 물리 주소로 변환"
      - "메모리 할당"
      - "디스크 I/O 관리"
    correctAnswer: 1
    explanation: "페이지 테이블은 가상 주소와 물리 주소를 매핑하는 자료구조입니다. CPU가 가상 주소를 참조하면 페이지 테이블을 통해 실제 물리 주소를 찾습니다."

  - question: "페이지 폴트(Page Fault)가 발생하는 경우는?"
    options:
      - "메모리가 부족할 때"
      - "접근하려는 페이지가 물리 메모리에 없을 때"
      - "CPU 사용률이 높을 때"
      - "디스크가 가득 찼을 때"
    correctAnswer: 1
    explanation: "페이지 폴트는 CPU가 접근하려는 페이지가 현재 물리 메모리에 없을 때 발생합니다. 이 경우 OS가 디스크에서 해당 페이지를 메모리로 가져옵니다."

  - question: "LRU(Least Recently Used) 페이지 교체 알고리즘의 특징은?"
    options:
      - "가장 먼저 들어온 페이지를 교체"
      - "가장 오랫동안 사용되지 않은 페이지를 교체"
      - "참조 횟수가 가장 적은 페이지를 교체"
      - "랜덤하게 페이지를 선택"
    correctAnswer: 1
    explanation: "LRU는 가장 오랫동안 사용되지 않은 페이지를 교체하는 알고리즘입니다. 최근에 사용된 페이지는 다시 사용될 가능성이 높다는 지역성 원리를 활용합니다."

  - question: "TLB(Translation Lookaside Buffer)의 목적은?"
    options:
      - "디스크 접근 속도 향상"
      - "페이지 테이블 접근 속도 향상"
      - "CPU 캐시 크기 증가"
      - "메모리 용량 확장"
    correctAnswer: 1
    explanation: "TLB는 페이지 테이블 접근을 빠르게 하기 위한 캐시입니다. 자주 사용되는 가상 주소-물리 주소 매핑 정보를 저장해 주소 변환 속도를 높입니다."

  - question: "Thrashing(스래싱)이란?"
    options:
      - "CPU 사용률이 매우 높은 상태"
      - "페이지 폴트가 과도하게 발생하는 상태"
      - "메모리가 가득 찬 상태"
      - "디스크 I/O가 빠른 상태"
    correctAnswer: 1
    explanation: "스래싱은 페이지 폴트가 과도하게 발생해 실제 작업보다 페이지 교체에 더 많은 시간을 소비하는 상태입니다. 시스템 성능이 급격히 저하됩니다."

  - question: "페이징 기법의 주요 장점은?"
    options:
      - "메모리 접근 속도 향상"
      - "외부 단편화 제거"
      - "프로그램 실행 시간 단축"
      - "디스크 용량 절약"
    correctAnswer: 1
    explanation: "페이징은 메모리를 고정 크기 페이지로 나누어 관리하므로 외부 단편화가 발생하지 않습니다. 하지만 내부 단편화는 여전히 발생할 수 있습니다."

  - question: "Working Set(워킹 셋)이란?"
    options:
      - "프로세스가 사용 중인 전체 메모리"
      - "특정 시간 동안 참조된 페이지들의 집합"
      - "페이지 테이블의 크기"
      - "디스크에 저장된 페이지"
    correctAnswer: 1
    explanation: "워킹 셋은 프로세스가 일정 시간 동안 자주 참조하는 페이지들의 집합입니다. 워킹 셋을 메모리에 유지하면 페이지 폴트를 줄일 수 있습니다."

  - question: "Demand Paging(요구 페이징)의 특징은?"
    options:
      - "프로그램 시작 시 모든 페이지를 메모리에 로드"
      - "필요한 페이지만 메모리에 로드"
      - "페이지를 미리 예측해서 로드"
      - "페이지를 랜덤하게 로드"
    correctAnswer: 1
    explanation: "Demand Paging은 페이지가 실제로 필요할 때만 메모리에 로드하는 방식입니다. 프로그램 시작 시간을 단축하고 메모리를 효율적으로 사용할 수 있습니다."

  - question: "페이지 크기가 클수록 발생하는 문제는?"
    options:
      - "외부 단편화 증가"
      - "내부 단편화 증가"
      - "페이지 폴트 증가"
      - "TLB 미스 증가"
    correctAnswer: 1
    explanation: "페이지 크기가 크면 페이지 내부에 사용되지 않는 공간이 많아져 내부 단편화가 증가합니다. 반면 페이지 테이블 크기는 줄어드는 장점이 있습니다."
---

프로세스가 실행되려면 메모리에 로드되어야 합니다. 하지만 물리 메모리는 제한적이고, 여러 프로세스가 동시에 실행됩니다. 운영체제는 어떻게 제한된 메모리를 효율적으로 관리할까요? 그 핵심이 **가상 메모리**와 **페이징**입니다.

## 메모리 관리의 필요성

### 문제 상황

```
물리 메모리: 8GB
실행 중인 프로그램들:
- Chrome: 2GB
- IntelliJ: 3GB
- Docker: 2GB
- MySQL: 1.5GB
총 필요 메모리: 8.5GB  ← 물리 메모리 초과!
```

**어떻게 8GB 메모리로 8.5GB가 필요한 프로그램들을 실행할까?**

→ **가상 메모리** 사용

## 가상 메모리란?

**실제 물리 메모리보다 큰 주소 공간을 제공하는 기술**입니다.

### 핵심 아이디어

1. 프로세스에게 **가상의 큰 메모리 공간** 제공
2. 실제로는 **필요한 부분만 물리 메모리**에 로드
3. 나머지는 **디스크(스왑 영역)**에 저장

### 가상 주소 vs 물리 주소

```
[가상 주소]                    [물리 주소]
프로세스 A: 0x00000000        RAM: 0x10000000
           ~ 0xFFFFFFFF             ~ 0x1FFFFFFF

프로세스 B: 0x00000000        디스크: Swap 영역
           ~ 0xFFFFFFFF
```

- **가상 주소**: 프로세스가 보는 주소 (논리적)
- **물리 주소**: 실제 RAM의 주소

**CPU가 가상 주소를 참조하면, MMU(Memory Management Unit)가 물리 주소로 변환**

## 페이징 (Paging)

가상 메모리를 구현하는 대표적인 방법이 **페이징**입니다.

### 페이징의 개념

**메모리를 고정 크기 블록으로 나누어 관리**

```
가상 메모리:                     물리 메모리:
+----------+                    +----------+
| Page 0   | -------\           | Frame 2  |
+----------+         \          +----------+
| Page 1   | ---------\-------> | Frame 0  |  ← Page 1
+----------+           \        +----------+
| Page 2   | -----------\-----> | Frame 3  |  ← Page 0
+----------+             \      +----------+
| Page 3   |              \---> | Frame 1  |  ← Page 2
+----------+                    +----------+
```

**용어:**
- **Page (페이지)**: 가상 메모리의 고정 크기 블록 (보통 4KB)
- **Frame (프레임)**: 물리 메모리의 고정 크기 블록 (페이지와 같은 크기)

### 페이지 테이블

**가상 주소와 물리 주소를 매핑하는 자료구조**

```
페이지 테이블 (Process A):
+-------+--------+-------+
| Page  | Frame  | Valid |
+-------+--------+-------+
|   0   |   2    |   1   |  ← 메모리에 있음
|   1   |   0    |   1   |
|   2   |   3    |   1   |
|   3   |   -    |   0   |  ← 디스크에 있음 (Page Fault)
+-------+--------+-------+
```

**Valid Bit:**
- `1`: 페이지가 물리 메모리에 있음
- `0`: 페이지가 디스크에 있음 (접근 시 Page Fault 발생)

### 주소 변환 과정

```
가상 주소 (32비트):
+------------------+----------------+
| Page Number (20) | Offset (12)    |
+------------------+----------------+

예: 0x00012ABC
  Page Number: 0x00012
  Offset: 0xABC

1. Page Number로 페이지 테이블 검색
2. Frame Number 찾기 (예: Frame 5)
3. Frame Number + Offset = 물리 주소
   → 0x00005ABC
```

## 페이지 폴트 (Page Fault)

**CPU가 접근하려는 페이지가 물리 메모리에 없을 때 발생하는 예외**

### 페이지 폴트 처리 과정

```
1. CPU가 가상 주소 접근
2. 페이지 테이블 확인 → Valid Bit = 0
3. Page Fault 발생 (Trap)
4. OS가 개입:
   - 디스크에서 해당 페이지 찾기
   - 물리 메모리에 빈 프레임 할당 (없으면 교체)
   - 페이지를 메모리로 로드
   - 페이지 테이블 업데이트 (Valid Bit = 1)
5. 중단된 명령어 재실행
```

**시간:**
- 메모리 접근: 100ns
- 디스크 접근: 10ms (100,000배 느림!)

**페이지 폴트가 자주 발생하면 성능 급격히 저하**

## 페이지 교체 알고리즘

물리 메모리가 가득 찼을 때, **어떤 페이지를 내보낼지 결정하는 알고리즘**

### 1. FIFO (First-In-First-Out)

**가장 먼저 들어온 페이지를 교체**

```
메모리 프레임: [1] [2] [3]

참조 순서: 1, 2, 3, 4, 1, 2, 5
         ↓  ↓  ↓  ↓     ↓  ↓
메모리:  1  1  1  4  4  4  5
            2  2  2  1  1  1
               3  3  3  2  2

Page Fault: 1, 2, 3, 4, 1, 2, 5 → 7번
```

**단점: 자주 사용되는 페이지도 교체될 수 있음**

### 2. LRU (Least Recently Used)

**가장 오랫동안 사용되지 않은 페이지를 교체**

```
메모리 프레임: [1] [2] [3]

참조 순서: 1, 2, 3, 4, 1, 2, 5
         ↓  ↓  ↓  ↓  ↓  ↓  ↓
메모리:  1  1  1  4  4  4  4
            2  2  2  1  1  5
               3  3  3  2  2

마지막 사용 시간 추적
Page Fault: 1, 2, 3, 4, 1(hit), 2(hit), 5 → 5번
```

**장점: 지역성 원리를 잘 활용 (최근 사용된 페이지는 다시 사용될 가능성 높음)**

### 3. LFU (Least Frequently Used)

**참조 횟수가 가장 적은 페이지를 교체**

```
참조 횟수 카운터 유지

페이지 1: 참조 5번
페이지 2: 참조 2번 ← 교체 대상
페이지 3: 참조 4번
```

### 4. Clock (Second Chance)

**LRU의 근사 알고리즘 (효율적)**

```
각 페이지에 Reference Bit 유지

    [1] → [1] → [1] → [1]
     ↑                 ↓
    [0] ← [0] ← [0] ← [1]

Reference Bit = 1: 최근 사용됨
Reference Bit = 0: 교체 가능
```

## TLB (Translation Lookaside Buffer)

**페이지 테이블 접근을 빠르게 하기 위한 캐시**

### 문제: 주소 변환 오버헤드

```
메모리 접근 1번 = 실제로는 2번 메모리 접근
1. 페이지 테이블 접근 (가상 → 물리 변환)
2. 실제 데이터 접근
```

### TLB 사용

```
CPU
 ↓
TLB (캐시) ←──┐
 │ Hit!       │ Miss
 ↓            ↓
데이터      페이지 테이블
           (메모리)
```

**TLB Hit (90-98%):**
- TLB에서 직접 물리 주소 찾음
- 시간: 1ns

**TLB Miss (2-10%):**
- 페이지 테이블 접근 필요
- 시간: 100ns

**효과적인 메모리 접근 시간:**
```
EAT = TLB Hit Time × TLB Hit Rate + (TLB Miss Time + Memory Access) × TLB Miss Rate
    = 1ns × 0.95 + (100ns + 100ns) × 0.05
    = 1ns + 10ns
    = 11ns
```

## 스래싱 (Thrashing)

**페이지 폴트가 과도하게 발생하는 현상**

### 발생 원인

```
프로세스가 너무 많이 실행 중
→ 각 프로세스의 워킹 셋이 메모리에 부족
→ 페이지 폴트 빈번
→ 페이지 교체 작업에 시간 소비
→ CPU 유휴
→ OS가 더 많은 프로세스 실행 (악순환)
```

### 스래싱 해결 방법

1. **프로세스 개수 줄이기**
2. **메모리 추가**
3. **워킹 셋 모델**: 프로세스의 워킹 셋 크기만큼 메모리 보장
4. **PFF (Page Fault Frequency)**: 페이지 폴트 빈도 모니터링

## 실무 예시

### 사례 1: Java 애플리케이션 OOM

```java
// 메모리 부족 발생
OutOfMemoryError: Java heap space

// 원인 분석
jstat -gcutil <pid> 1000
S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT
0.00  99.99  80.52  95.26  96.42  93.87   245    1.234    10   15.678

// 해결: 힙 메모리 증가
java -Xms2g -Xmx4g -XX:+UseG1GC MyApp
```

### 사례 2: Linux 메모리 모니터링

```bash
# 메모리 사용량 확인
free -h
              total        used        free      shared  buff/cache   available
Mem:           15Gi       8.2Gi       1.1Gi       324Mi       6.1Gi       6.5Gi
Swap:         2.0Gi       512Mi       1.5Gi

# Swap 사용 중 → 메모리 부족 신호
# 페이지 폴트 확인
vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2  0 524288 1155584 89216 6234112   0   10    50   200  500 1000 25  5 68  2  0
```

**si (swap in), so (swap out)이 크면 스래싱 의심**

### 사례 3: Docker 컨테이너 메모리 제한

```bash
# 메모리 제한 설정
docker run -m 512m --memory-swap 1g myapp

# OOM Killer 로그 확인
dmesg | grep -i "out of memory"
[12345.678] Out of memory: Kill process 1234 (java) score 950 or sacrifice child
```

## 고급 메모리 관리 기법

기본 페이징 외에도 다양한 메모리 관리 기법이 있습니다.

### Multi-Level Page Table

**문제:** 단일 페이지 테이블은 메모리 낭비

```
32비트 시스템:
- 가상 주소 공간: 4GB
- 페이지 크기: 4KB
- 페이지 개수: 1,048,576개
- 페이지 테이블 엔트리 크기: 4바이트
- 페이지 테이블 크기: 4MB (프로세스당!)
```

**해결: 2단계 페이지 테이블**

```
가상 주소 (32비트):
+--------+--------+--------+
| L1(10) | L2(10) | Off(12)|
+--------+--------+--------+

1단계: L1 인덱스로 2단계 페이지 테이블 찾기
2단계: L2 인덱스로 프레임 찾기
3단계: Offset으로 실제 주소 계산
```

**트레이드오프:**
- **장점**: 사용하는 부분만 할당, 메모리 절약
- **단점**: 주소 변환 단계 증가, 성능 저하 (TLB로 완화)

### Huge Pages (대용량 페이지)

**문제:** 4KB 페이지는 대용량 데이터에 비효율

```
데이터베이스 10GB 버퍼:
- 4KB 페이지: 2,621,440개 페이지
- TLB 미스 증가
- 페이지 테이블 오버헤드 증가
```

**해결: Huge Pages (2MB 또는 1GB)**

```bash
# Linux Huge Pages 설정
echo 1000 > /proc/sys/vm/nr_hugepages  # 2GB (2MB × 1000)

# 확인
cat /proc/meminfo | grep Huge
HugePages_Total:    1000
HugePages_Free:      800
Hugepagesize:       2048 kB
```

```java
// Java에서 Huge Pages 사용
java -XX:+UseLargePages -XX:LargePageSizeInBytes=2m MyApp
```

**트레이드오프:**
- **장점**: TLB 효율 증가, 페이지 테이블 크기 감소
- **단점**: 내부 단편화 증가, 유연성 감소

### Copy-on-Write (COW)

**개념:** 쓰기 시점까지 메모리 복사 지연

```
프로세스 fork 시:
1. 기존: 부모 메모리 전체 복사 (느림)
2. COW: 페이지 테이블만 복사, Read-Only로 설정
3. 쓰기 시도 시: Page Fault → 해당 페이지만 복사
```

```c
// Linux fork
pid_t pid = fork();

if (pid == 0) {
    // 자식 프로세스
    // 부모와 메모리 공유 (COW)
    data[0] = 100;  // 이 시점에 복사 발생
} else {
    // 부모 프로세스
}
```

**트레이드오프:**
- **장점**: fork 빠름, 메모리 절약
- **단점**: 첫 쓰기 시 Page Fault 오버헤드

### Memory-Mapped Files (mmap)

**개념:** 파일을 메모리에 매핑

```c
// 파일을 메모리에 매핑
int fd = open("data.bin", O_RDWR);
char* mapped = mmap(NULL, file_size, PROT_READ | PROT_WRITE,
                    MAP_SHARED, fd, 0);

// 메모리 접근 = 파일 접근
mapped[0] = 'A';  // 파일에 자동 기록 (Lazy Write)

munmap(mapped, file_size);
```

```java
// Java NIO MappedByteBuffer
RandomAccessFile file = new RandomAccessFile("data.bin", "rw");
MappedByteBuffer buffer = file.getChannel()
    .map(FileChannel.MapMode.READ_WRITE, 0, file.length());

buffer.put(0, (byte) 'A');  // 파일에 자동 기록
```

**트레이드오프:**
- **장점**: 빠른 파일 I/O, 프로세스 간 메모리 공유
- **단점**: 파일 크기 제한, 동기화 복잡

### 메모리 관리 기법 비교

| 기법 | 목적 | 장점 | 단점 |
|------|------|------|------|
| **Multi-Level Page Table** | 페이지 테이블 절약 | 메모리 효율 | 변환 오버헤드 |
| **Huge Pages** | TLB 효율 | 주소 변환 빠름 | 내부 단편화 |
| **Copy-on-Write** | fork 최적화 | 빠른 프로세스 생성 | 첫 쓰기 지연 |
| **mmap** | 파일 I/O 최적화 | 빠른 파일 접근 | 동기화 복잡 |

## 애플리케이션 레벨 메모리 관리

OS 레벨을 넘어 애플리케이션에서도 메모리 관리가 중요합니다.

### 1단계: JVM 메모리 튜닝

**문제:** 기본 JVM 설정으로는 대용량 처리 불가

```bash
# 기본 설정 (작은 힙)
java -jar app.jar
# 결과: OutOfMemoryError

# 튜닝된 설정
java -Xms4g \                    # 초기 힙 크기
     -Xmx8g \                    # 최대 힙 크기
     -XX:+UseG1GC \              # G1 GC 사용
     -XX:MaxGCPauseMillis=200 \  # GC 최대 정지 시간
     -XX:+UseStringDeduplication \ # 문자열 중복 제거
     -XX:+PrintGCDetails \       # GC 로그
     -jar app.jar
```

**힙 크기 선택 가이드:**

| 애플리케이션 | 힙 크기 | GC 선택 |
|-------------|--------|---------|
| **소규모 (~100MB)** | 512MB - 1GB | Serial GC |
| **중규모 (~1GB)** | 2GB - 4GB | G1 GC |
| **대규모 (~10GB)** | 8GB - 16GB | G1 GC |
| **초대규모 (>32GB)** | 32GB+ | ZGC, Shenandoah |

**트레이드오프:**
- **장점**: 메모리 부족 방지, GC 최적화
- **단점**: 큰 힙은 GC 시간 증가, 메모리 낭비 가능

### 2단계: Container Memory Management

**문제:** 컨테이너가 호스트 메모리를 모두 사용

```yaml
# Docker Compose
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          memory: 2G       # 최대 2GB
        reservations:
          memory: 1G       # 최소 1GB 보장
```

```bash
# Kubernetes Pod
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    resources:
      requests:
        memory: "1Gi"    # 최소 요청
      limits:
        memory: "2Gi"    # 최대 제한
```

**OOM Killer 동작:**

```bash
# 메모리 초과 시 컨테이너 종료
dmesg | grep -i "killed process"
[OOM Killer] Killed process 1234 (java) total-vm:4GB, anon-rss:2GB

# 재시작 정책
apiVersion: v1
kind: Pod
spec:
  restartPolicy: Always  # OOM 시 자동 재시작
```

**트레이드오프:**
- **장점**: 리소스 격리, 다중 테넌트 안정성
- **단점**: OOM Killer 위험, 정확한 예측 필요

### 3단계: Database Buffer Pool

**문제:** DB가 매번 디스크 I/O 발생

**해결: Buffer Pool (메모리 캐시)**

```sql
-- MySQL InnoDB Buffer Pool
SET GLOBAL innodb_buffer_pool_size = 8G;  -- 물리 메모리의 70-80%

-- 상태 확인
SHOW STATUS LIKE 'Innodb_buffer_pool%';
Innodb_buffer_pool_read_requests: 1000000
Innodb_buffer_pool_reads: 50000
→ Hit Rate = 95% (좋음)
```

```sql
-- PostgreSQL Shared Buffers
ALTER SYSTEM SET shared_buffers = '4GB';  -- 물리 메모리의 25%

-- 상태 확인
SELECT * FROM pg_stat_bgwriter;
```

**Buffer Pool 크기 선택:**

| 메모리 | Buffer Pool | 이유 |
|--------|------------|------|
| **8GB** | 4-6GB | OS, 애플리케이션 여유 |
| **16GB** | 10-12GB | DB 집중 서버 |
| **32GB+** | 24GB+ | 전용 DB 서버 |

**트레이드오프:**
- **장점**: 디스크 I/O 감소, 쿼리 성능 향상
- **단점**: 큰 Buffer Pool은 체크포인트 지연, 메모리 부족 위험

### 4단계: Redis Memory Management

**문제:** Redis가 모든 데이터를 메모리에 저장 → 메모리 부족

**해결 1: Eviction Policy**

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru  # LRU로 키 제거
```

**Eviction Policy 비교:**

| 정책 | 동작 | 사용 사례 |
|------|------|----------|
| **noeviction** | 쓰기 거부 | 데이터 손실 불가 |
| **allkeys-lru** | 모든 키에서 LRU | 일반 캐시 |
| **volatile-lru** | TTL 있는 키에서 LRU | 세션 캐시 |
| **allkeys-random** | 랜덤 제거 | 균등 액세스 |

**해결 2: Redis Cluster (분산)**

```bash
# 3개 마스터 + 3개 레플리카 (6노드)
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

**트레이드오프:**
- **장점**: 메모리 부족 자동 처리, 수평 확장
- **단점**: 데이터 손실 가능 (eviction), 클러스터 관리 복잡

### 5단계: 분산 캐싱

**문제:** 단일 Redis로 처리량 부족

**해결: Memcached + Consistent Hashing**

```java
// Consistent Hashing으로 여러 Memcached 서버 분산
MemcachedClient client = new MemcachedClient(
    new InetSocketAddress("cache1", 11211),
    new InetSocketAddress("cache2", 11211),
    new InetSocketAddress("cache3", 11211)
);

// 키가 해시되어 특정 서버로 라우팅
client.set("user:123", 3600, userObject);
```

**Consistent Hashing 장점:**
- 서버 추가/제거 시 최소한의 키만 재분배
- 특정 서버 장애 시 다른 서버로 분산

**Redis Cluster vs Memcached Cluster:**

| 구분 | Redis Cluster | Memcached |
|------|--------------|-----------|
| **데이터 구조** | String, Hash, List, Set | String only |
| **지속성** | RDB, AOF | 없음 |
| **복제** | 마스터-레플리카 | 없음 |
| **사용 사례** | 복잡한 데이터, 세션 | 단순 캐시 |

**트레이드오프:**
- **장점**: 높은 처리량, 수평 확장
- **단점**: 네트워크 지연, 일관성 복잡도

### 6단계: Application-Level Memory Pool

**문제:** 객체 생성/소멸 오버헤드

**해결: Object Pooling**

```java
// Apache Commons Pool
GenericObjectPool<Connection> connectionPool = new GenericObjectPool<>(
    new ConnectionFactory(),
    new GenericObjectPoolConfig<>() {{
        setMaxTotal(100);          // 최대 100개 연결
        setMaxIdle(50);            // 최대 50개 유휴 연결
        setMinIdle(10);            // 최소 10개 유휴 연결
        setMaxWaitMillis(3000);    // 3초 대기
    }}
);

// 사용
Connection conn = connectionPool.borrowObject();
try {
    // 작업 수행
} finally {
    connectionPool.returnObject(conn);  // 풀에 반환
}
```

**풀 크기 설정:**

```
적정 크기 = (동시 요청 수 × 평균 처리 시간) / 요청 간격

예: 초당 100 요청, 평균 100ms 처리
→ 100 × 0.1 = 10개
```

**트레이드오프:**
- **장점**: 객체 재사용, GC 부담 감소
- **단점**: 초기 메모리 사용, 유휴 객체 관리

### 메모리 관리 전략 선택 가이드

| 계층 | 도구 | 사용 시점 |
|------|------|----------|
| **OS** | Huge Pages, mmap | 대용량 데이터, 파일 I/O |
| **JVM** | Heap Tuning, GC | Java 애플리케이션 |
| **Container** | Memory Limits | 마이크로서비스, 클라우드 |
| **DB** | Buffer Pool | 데이터베이스 서버 |
| **Cache** | Redis, Memcached | 읽기 집중 워크로드 |
| **Pool** | Connection Pool | DB/네트워크 연결 |

### 진화 경로

```
1단계: OS 기본 설정
   ↓ (성능 이슈)
2단계: JVM/DB 튜닝
   ↓ (트래픽 증가)
3단계: 캐시 레이어 (Redis)
   ↓ (단일 캐시 한계)
4단계: 분산 캐싱
   ↓ (메모리 부족)
5단계: Huge Pages, mmap 최적화
   ↓ (컨테이너 환경)
6단계: Container Memory Management
```

## 정리

**OS 레벨 메모리 관리:**
- 가상 메모리: 물리 메모리보다 큰 주소 공간
- 페이징: 고정 크기(4KB) 페이지로 관리
- 페이지 교체: FIFO < Clock < LRU
- TLB: 주소 변환 캐시로 성능 향상

**고급 메모리 기법:**
- Multi-Level Page Table: 페이지 테이블 메모리 절약
- Huge Pages: TLB 효율 향상
- Copy-on-Write: fork 최적화
- mmap: 빠른 파일 I/O

**애플리케이션 레벨:**
- JVM: 힙 크기와 GC 튜닝
- Container: Memory limits로 리소스 격리
- DB: Buffer Pool로 디스크 I/O 감소
- Redis: Eviction policy와 클러스터
- 분산 캐싱: 수평 확장
- Object Pool: 객체 재사용

**선택 기준:**
- 워크로드 특성에 따라 메모리 전략 선택
- 계층별 최적화 (OS → JVM → 애플리케이션)
- 모니터링으로 병목 지점 파악
- 비용과 성능 사이의 트레이드오프 고려
