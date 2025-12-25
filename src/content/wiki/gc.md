---
term: 'GC'
aliases: ['Garbage Collection', '가비지 컬렉션', '가비지 콜렉터']
category: 'java'
summary: '사용하지 않는 객체의 메모리를 자동으로 해제하는 메커니즘'
related: ['heap', 'stack']
---

GC(Garbage Collection)는 힙 메모리에서 더 이상 참조되지 않는 객체를 자동으로 정리하는 기능입니다.

## 동작 원리

1. 루트(스택, 메서드 영역)에서 시작하여 참조 체인 추적
2. 도달 가능한(reachable) 객체를 마킹
3. 도달 불가능한(unreachable) 객체의 메모리 해제

## Java GC 영역

| 영역 | 설명 | GC |
|------|------|-----|
| Young Gen | 새 객체 | Minor GC (빠름) |
| Old Gen | 오래된 객체 | Major GC (느림) |

## GC 종류

- Serial GC: 싱글 스레드
- Parallel GC: 멀티 스레드 (Java 8 기본)
- G1 GC: 대용량 힙에 적합 (Java 9+ 기본)
- ZGC: 초저지연

## 튜닝 옵션

```bash
java -Xms512m -Xmx2g -XX:+UseG1GC MyApp
```
