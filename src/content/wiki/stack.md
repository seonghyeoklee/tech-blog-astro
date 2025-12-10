---
term: '스택'
aliases: ['Stack', 'Call Stack', '호출 스택']
category: 'general'
summary: '함수 호출과 지역 변수를 관리하는 LIFO 구조의 메모리 영역'
---

스택(Stack)은 함수 호출 정보와 지역 변수를 저장하는 메모리 영역입니다. LIFO(Last In First Out) 구조로 동작합니다.

## 저장되는 것

- 지역 변수
- 함수 매개변수
- 리턴 주소
- 이전 스택 프레임 포인터

## 특징

| 항목 | 설명 |
|------|------|
| 할당 속도 | 매우 빠름 (포인터 이동만) |
| 해제 | 자동 (함수 종료 시) |
| 크기 | 제한적 (1~8MB) |
| 스레드 | 스레드마다 독립적 |

## StackOverflowError

스택 공간이 부족하면 발생합니다. 주로 무한 재귀나 너무 깊은 재귀 호출이 원인입니다.

```java
public void recursive() {
    recursive();  // StackOverflowError
}
```
