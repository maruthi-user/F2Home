# F2Home

F2Home — a farmer-to-customer marketplace. Farmers list produce, customers browse and buy, delivery partners handle delivery.

- **Backend**: Java Spring Boot (`backend/`) — auth (phone/OTP), PostgreSQL, Flyway migrations.
- **Frontend**: React + Vite (`frontend/f2home/`) — marketplace, farmer product listings, customer orders (client-side, IndexedDB).

## Domains

| Environment | Web | API |
| --- | --- | --- |
| local | `http://f2home.com` (add `127.0.0.1 f2home.com` to your hosts file) | `http://localhost:8081` |
| dev | `https://maruthi-user.github.io/F2Home/` (GitHub Pages preview) | none yet - see `apiSlice.js` |
| dev (cloud) | `https://dev.f2home.com` | `https://api-dev.f2home.com` |
| prod | `https://f2home.com` | `https://api.f2home.com` |

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
└── .github/workflows/            dev deploy: build -> GitHub Pages (free preview);
                                     devf2home-droplet.yml: manual droplet deploy for later
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

`src/redux/slices/apiSlice.js` derives the API base URL from the hostname, so
`npm run dev` on localhost talks to `http://localhost:8081` with no config.
`frontend/f2home/build` is the Capacitor `webDir`, and is also what the
GitHub Pages deploy workflow publishes (under the `/F2Home/` base path).

## Where the data lives

- **Users, OTPs and refresh tokens** - PostgreSQL database `F2Home`, schema
owned by Flyway (`backend/src/main/resources/db/migration`).
- **Products, orders and product images** - client-side IndexedDB
(`frontend/f2home/src/utils/marketplaceDb.js`). The marketplace has no
server-side API yet.
