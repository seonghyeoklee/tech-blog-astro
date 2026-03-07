---
title: 'spring-cloud-stream에 Automatic-Module-Name 추가하기'
description: 'Jigsaw 모듈 시스템에서 spring-cloud-stream을 사용할 수 없던 문제를 해결한 오픈소스 기여 과정을 정리합니다.'
pubDate: 2026-03-07
tags: ['Open Source', 'Spring']
series: 'open-source-contribution'
seriesOrder: 1
---

## 이슈 발견

GitHub에서 기여할 이슈를 찾다가 spring-cloud-stream 저장소에서 `ideal-for-contribution` 라벨이 붙은 [#2964](https://github.com/spring-cloud/spring-cloud-stream/issues/2964)를 발견했습니다. 2024년 6월에 등록된 이슈인데, 아무도 작업하지 않고 있었습니다.

이슈의 내용은 명확했습니다. `spring-cloud-stream` JAR 파일의 매니페스트에 `Automatic-Module-Name` 항목이 없어서, Java 9+ Jigsaw 모듈 시스템 환경에서 이 라이브러리를 사용할 수 없다는 것이었습니다.

## Automatic-Module-Name이 왜 필요한가

Java 9에서 도입된 Jigsaw(JPMS)는 명시적인 모듈 의존성을 선언하는 시스템입니다. `module-info.java`에서 다른 모듈을 `requires`로 지정해야 사용할 수 있습니다.

```java
module my.application {
    requires spring.cloud.stream; // 이 이름이 안정적이어야 합니다
}
```

문제는 모듈 이름의 결정 방식입니다. JAR 파일이 명시적으로 모듈 이름을 지정하지 않으면, JVM이 JAR 파일명에서 자동으로 추론합니다. `spring-cloud-stream-4.2.0.jar`에서 버전을 떼고 `-`를 `.`으로 바꿔서 `spring.cloud.stream`이 됩니다. 하지만 이 방식은 파일명이 바뀌면 모듈 이름도 바뀌기 때문에 안정적이지 않습니다.

Spring Framework는 이 문제를 이미 해결하고 있었습니다. `spring-core`, `spring-context` 같은 JAR들은 매니페스트에 `Automatic-Module-Name`을 명시하고 있습니다. 하지만 `spring-cloud-stream`은 이 항목이 빠져 있었습니다.

## 코드 분석

`spring-cloud-stream`의 빌드 구조를 확인해보니 Maven 기반이었습니다. 매니페스트에 항목을 추가하려면 `maven-jar-plugin`의 설정에 `Automatic-Module-Name`을 넣으면 됩니다.

다른 Spring 프로젝트들이 어떤 네이밍 규칙을 사용하는지 확인했습니다.

| 프로젝트 | Automatic-Module-Name |
|---------|----------------------|
| spring-core | `spring.core` |
| spring-context | `spring.context` |
| spring-cloud-function-context | `spring.cloud.function.context` |

패턴은 아티팩트 이름의 `-`를 `.`으로 바꾸는 것이었습니다. 따라서 `spring-cloud-stream`은 `spring.cloud.stream`이 됩니다.

## 구현

`core/spring-cloud-stream/pom.xml`에 `maven-jar-plugin` 설정을 추가했습니다.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <configuration>
        <archive>
            <manifestEntries>
                <Automatic-Module-Name>spring.cloud.stream</Automatic-Module-Name>
            </manifestEntries>
        </archive>
    </configuration>
</plugin>
```

변경은 `pom.xml` 한 파일, 11줄 추가가 전부였습니다. 코드가 적다고 가치가 없는 게 아닙니다. 이 한 줄의 매니페스트 항목이 없어서 Jigsaw 환경에서 spring-cloud-stream을 아예 사용할 수 없었으니까요.

## PR과 머지 과정

[PR #3179](https://github.com/spring-cloud/spring-cloud-stream/pull/3179)를 올렸습니다. DCO sign-off를 포함한 커밋 메시지를 작성했고, 이슈 번호를 `Closes #2964`로 연결했습니다.

며칠 후 PR이 아무 피드백 없이 `Closed` 상태가 됐습니다. 머지도 아닌 그냥 닫힘이라서 처음에는 거절당한 줄 알았습니다.

하지만 커밋 히스토리를 확인해보니, 메인테이너 Oleg Zhurakousky가 제 커밋을 cherry-pick해서 직접 반영한 것이었습니다.

```
Author:    seonghyeoklee <dltjdgur327@gmail.com>
Committer: Oleg Zhurakousky <ozhurakousky@vmware.com>
```

커밋의 author는 저이고 committer는 메인테이너입니다. Spring 프로젝트에서는 PR을 GitHub의 머지 버튼으로 합치지 않고, 메인테이너가 cherry-pick으로 직접 반영하는 경우가 있습니다. 그래서 GitHub에서는 "Closed"로 표시되지만 실제로는 코드가 반영된 상태입니다.

커밋 메시지에 `Resolves #3179`가 포함된 것도 메인테이너가 제 PR 번호를 명시적으로 레퍼런스한 것입니다.

## 배운 점

- **Automatic-Module-Name은 라이브러리 제작자의 책임입니다.** Jigsaw 환경을 지원하려면 매니페스트에 안정적인 모듈 이름을 명시해야 합니다.
- **Spring 프로젝트의 머지 방식은 독특합니다.** cherry-pick으로 반영하기 때문에 PR이 "Closed"로 표시될 수 있습니다. 커밋 히스토리를 확인해야 실제 반영 여부를 알 수 있습니다.
- **작은 변경도 의미가 있습니다.** 11줄의 XML 추가가 Jigsaw 사용자에게는 spring-cloud-stream 채택 여부를 결정하는 차이였습니다.
