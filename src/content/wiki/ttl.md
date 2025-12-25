---
term: 'TTL'
aliases: ['Time To Live']
category: 'infra'
summary: '데이터나 패킷이 유효한 시간 또는 홉 수를 나타내는 값'
related: [dns, redis, cache]
---

TTL(Time To Live)은 데이터의 유효 기간을 나타냅니다. 분야에 따라 의미가 다릅니다.

## DNS TTL

DNS 레코드가 캐시에 유지되는 시간 (초 단위)

```
example.com.  300  IN  A  43.201.52.89
              ^^^
              300초 동안 캐시
```

## IP 패킷 TTL

패킷이 거칠 수 있는 최대 라우터(홉) 수. 0이 되면 폐기.

## Cache TTL

캐시된 데이터의 유효 시간

```
Cache-Control: max-age=3600  # 1시간
```

## 관련 글

- [DNS와 로드밸런싱 - 요청이 서버에 도달하는 과정](/blog/dns-load-balancing)
