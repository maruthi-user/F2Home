# ------------------------------------------------------------------
# F2Home - single live image: the Spring Boot API serves the built React
# app itself (see SpaWebConfig), so one Docker image / one Render service
# is the whole application. No separate frontend host, no CORS between
# web and API in production.
#
# Build context MUST be the repository root (not backend/), since this
# copies from both frontend/f2home and backend.
# ------------------------------------------------------------------

FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/f2home/package.json frontend/f2home/package-lock.json ./
RUN npm ci
COPY frontend/f2home/ ./
RUN npm run build


FROM maven:3.9.9-eclipse-temurin-17 AS backend-build
WORKDIR /workspace

# Resolve dependencies first so they are cached until pom.xml changes.
COPY backend/pom.xml .
RUN mvn -B -q --no-transfer-progress dependency:go-offline

COPY backend/src ./src
# The built SPA lands in src/main/resources/static, which Spring Boot
# serves automatically and SpaWebConfig falls back to for client routes.
COPY --from=frontend-build /app/build ./src/main/resources/static
RUN mvn -B -q --no-transfer-progress package -DskipTests


FROM eclipse-temurin:17-jre
WORKDIR /app

# Run as an unprivileged user.
RUN useradd --system --uid 1001 --create-home f2home
USER f2home

COPY --from=backend-build /workspace/target/*.jar app.jar

# Sized for a 512 MB container (Render free/starter instance): cap the heap
# at ~60% of the cgroup limit and use the low-footprint serial collector.
# Override with JAVA_TOOL_OPTIONS in the platform's env settings if the
# instance size changes.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

# Render injects PORT; application.properties reads server.port=${PORT:8081}.
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
