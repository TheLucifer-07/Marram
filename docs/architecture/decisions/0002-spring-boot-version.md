# ADR 0002: Spring Boot 3.5.16

**Context.** The SRS and build brief require Spring Boot 3.x. As of the current date, Spring Boot 3.5 is the last 3.x line and its free (open-source) support ended on 30 June 2026; 3.5.16 (25 June 2026) is the final free patch. Spring Boot 4.0 is supported until the end of December 2026 and 4.1 is current.

**Decision.** Use 3.5.16 as specified. It is mature and compatible with Java 21, springdoc 2.8.x, Testcontainers and Flyway as managed by the parent POM.

**Consequences.** No further free security patches for the Spring Boot 3.5 line. Treat this as a known risk.

**Upgrade path.** Move to the latest 4.x: bump the parent version, follow the Spring Boot 4 migration guide (Spring Framework 7, Security 7, Jackson 3 changes, starter modularization, `spring.jackson.*` property moves), and re-run `./mvnw verify`. The layered code has no framework-specific cleverness that should make this hard. Commercial support for 3.5 exists if a delay is unavoidable.

**Other pinned versions.** Java 21, springdoc 2.8.12 (declares Spring Boot 3.5 support), MySQL 8.4 in Docker/Testcontainers, Maven wrapper 3.9.11 (not verified here; edit `.mvn/wrapper/maven-wrapper.properties` if that version is unavailable).
