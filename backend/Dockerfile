# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package \
 && cp target/marram-backend-*.jar app.jar

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 marram
WORKDIR /app
COPY --from=build /build/app.jar app.jar
COPY docker-healthcheck.sh /usr/local/bin/docker-healthcheck
RUN chmod 755 /usr/local/bin/docker-healthcheck
USER marram
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 CMD ["/usr/local/bin/docker-healthcheck"]
ENTRYPOINT ["java", "-jar", "app.jar"]
