# ------------------------------------------------------------------
# F2Home backend image (used by the Render dev environment).
#
# Stage 1 builds the Spring Boot jar with Maven; stage 2 is a slim JRE
# runtime. Tests are skipped here because Dev CI (dev.yml) has already run
# them before a deploy is triggered.
# ------------------------------------------------------------------

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# Resolve dependencies first so they are cached until pom.xml changes.
COPY pom.xml .
RUN mvn -B -q --no-transfer-progress dependency:go-offline

COPY src ./src
RUN mvn -B -q --no-transfer-progress package -DskipTests


FROM eclipse-temurin:17-jre
WORKDIR /app

# Run as an unprivileged user.
RUN useradd --system --uid 1001 --create-home f2home
USER f2home

COPY --from=build /workspace/target/*.jar app.jar

# Sized for a 512 MB container (Render free instance): cap the heap at ~60%
# of the cgroup limit and use the low-footprint serial collector. Override
# with JAVA_TOOL_OPTIONS in the platform's env settings if the size changes.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

# Render injects PORT; application.properties reads server.port=${PORT:8081}.
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
