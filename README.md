# F2Home

F2Home — a farmer-to-customer marketplace. Farmers list produce, customers browse and buy, delivery partners handle delivery.

- **Backend**: Java Spring Boot (`backend/`) — auth (phone/OTP), PostgreSQL, Flyway migrations.
- **Frontend**: React + Vite (`frontend/f2home/`) — marketplace, farmer product listings, customer orders (client-side, IndexedDB).

## Domains

The Spring Boot backend serves the built React frontend itself (see
`SpaWebConfig`), so web and API are always the same host - one deploy, no
CORS to configure for it.

| Environment | URL |
| --- | --- |
| local | `http://localhost:8081` (backend) / `http://localhost:3001` (Vite dev server, hot reload) |
| live | Render-assigned `https://f2home-<id>.onrender.com` URL (DB on Neon) - add a custom domain later if you want one |

The database name is `F2Home` in every environment — see
`backend/src/main/resources/application-<profile>.properties`.

See `backend/.env.example` for required local environment configuration.

## Repository layout

```
F2Home/
├── backend/                      Spring Boot API (Java 17, Maven)
│   ├── src/main/java/com/mrnpe/one/
│   │   ├── f2home/               the F2Home auth module (the only feature module)
│   │   │   ├── controller/       F2HomeAuthController - /api/f2home/auth/**
│   │   │   ├── dto/              request / response payloads
│   │   │   ├── entity/           F2HomeUser, OtpVerification, RefreshToken, enums
│   │   │   ├── repository/       Spring Data JPA repositories
│   │   │   ├── security/         JWT service, JWT filter, security chain, principal
│   │   │   └── service/          auth service, OTP service, rate limiter, SMS sender
│   │   ├── config/               Tomcat connector tuning
│   │   ├── exception/            shared error handling + handler
│   │   ├── health/               /actuator/health contributor
│   │   └── swagger/             OpenAPI / Swagger UI configuration
│   ├── src/main/resources/
│   │   ├── application.properties            + -local / -dev / -prod profiles
│   │   └── db/migration/        Flyway migrations - own the schema
│   ├── scripts/create-user.sql
│   └── src/test/java/            controller + service tests
├── frontend/f2home/              React 19 + Vite SPA
│   ├── index.html                the single Vite HTML entry
│   ├── public/                   copied verbatim into the build (favicon, manifest, robots.txt)
│   └── src/
│       ├── index.jsx             React root + Redux Provider
│       ├── App.jsx               route table; splits public routes from the app shell
│       ├── LoginPage.jsx         login (phone number + password)
│       ├── pages/auth/           register + OTP, forgot password, restore password
│       ├── pages/f2home/         welcome, marketplace, farmer products, orders
│       ├── components/           ui/ (Radix primitives), layout/ (shell, nav), common/
│       ├── redux/                store, RTK Query apiSlice, auth + processing slices
│       ├── context/              LayoutContext
│       └── utils/                jwt, publicPaths, permissions, marketplaceDb (IndexedDB)
├── Dockerfile                    One image: builds the frontend, embeds it in the Spring Boot jar
├── render.yaml                   Render Blueprint for the single live service
└── .github/workflows/
    └── deploy.yml                CI (build + test) then, on main, deploy to Render
```

## Getting started

### Backend

```bash
cd backend
cp .env.example .env       # database, JWT and SMS settings
./mvnw spring-boot:run     # http://localhost:8081
./mvnw test                # controller + service tests
```

Flyway creates the auth tables on first startup, so an empty `F2Home` database
is enough. Health is exposed at `/actuator/health` and the springdoc Swagger UI
is served from `/swagger-ui.html`.

### Frontend

```bash
cd frontend/f2home
npm install
npm run dev                # http://localhost:3001 (opens automatically)
npm run build              # -> frontend/f2home/build
npm run lint
```

`src/redux/slices/apiSlice.js` derives the API base URL from the hostname: on
`localhost` it talks to `http://localhost:8081` with no config; everywhere
else (Render, any future custom domain) it uses the same origin the page was
served from, because in those environments the backend serves this build
itself (see "One image, one service" below).

## One image, one service

The repo used to build and deploy the frontend (GitHub Pages) and backend
(Render) separately, with CORS between them. That's gone: the root
`Dockerfile` builds the React app, copies the build output into the Spring
Boot jar's `src/main/resources/static`, and `SpaWebConfig` serves it -
falling back to `index.html` for client-side routes so a hard refresh on
e.g. `/orders` still works. One Docker image, one Render service, no CORS
needed in that environment.

```text
Local code -> GitHub -> CI (frontend build + backend test) -> Deploy (main only)
                                                                 -> Render builds the root Dockerfile
                                                                    -> one service: web + API, same origin
                                                                       -> Postgres on Neon
```

**`.github/workflows/deploy.yml`** runs on every push and pull request to `main`:

- **Frontend job** - `npm ci`, `npm run lint` (non-blocking), `npm run build` (just proves it builds; the real build happens again inside the Docker image).
- **Backend job** - `./mvnw verify` (compile, unit tests, package); uploads the jar and the Surefire reports.
- **Deploy job** - only on `main`, only if both jobs above passed: calls the Render deploy hook (secret `RENDER_DEPLOY_HOOK_URL`). Render then builds the root `Dockerfile` and redeploys the one `f2home` service. Runtime config (`SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `F2HOME_JWT_SECRET`) lives in the Render dashboard, never in git.

Free-tier behaviour to know: the Render service sleeps after 15 minutes idle
and takes ~1 minute to wake (open `/actuator/health` before a demo); Neon
suspends after 5 minutes idle and wakes in about a second. Real OTP SMS isn't
wired up yet - `LoggingSmsSender` writes the code to the Render log - so seed
a demo account with `backend/scripts/create-user.sql` or read the code from
the log.

## Where the data lives

- **Users, OTPs, refresh tokens, products, orders** - PostgreSQL database
`F2Home`, schema owned by Flyway (`backend/src/main/resources/db/migration`).
- **Product photos/video** - stored as bytes in Postgres (`ProductMedia`),
served by the backend; nothing marketplace-related lives client-side anymore.
