# SecureFin — User Authentication & Authorization Module

A secure coding prototype for **SecureFin Sdn. Bhd.**, implementing username/password authentication with OTP-based MFA, JWT session management, and Role-Based Access Control (RBAC).

> **Assignment context:** ITS69405 Software Secure Systems — Q3 Secure Coding Implementation

---

## Project Description

This module provides the backend authentication and authorization layer for SecureFin's online customer portal. It demonstrates industry-standard secure coding practices including input validation, password hashing, multi-factor authentication, secure session cookies, RBAC, rate limiting, and defence-in-depth error handling.

---

## Security Objective

To implement a **defence-in-depth** authentication and authorization system that:

- Protects user credentials at rest and in transit (when deployed with TLS)
- Prevents common attacks: SQL injection, brute-force, credential enumeration, session hijacking
- Enforces least privilege through RBAC (`CUSTOMER` vs `ADMIN`)
- Follows OWASP secure coding principles and ASVS-aligned controls

---

## Features

| Feature | Description |
|---------|-------------|
| User Registration | Validated signup with email OTP verification before account creation |
| Login Step 1 | Email + password verification; triggers email OTP |
| Login Step 2 | Email OTP verification; issues JWT in HttpOnly cookie |
| Profile | Authenticated users view their own profile |
| Admin Users List | `ADMIN`-only endpoint listing all users |
| Role Management | `ADMIN` can update `CUSTOMER` / `ADMIN` roles |
| Forgot Password | Email OTP reset flow with bcrypt-hashed reset OTP |
| Logout | Clears authentication cookie |
| Rate Limiting | Global, login, OTP, and registration limits |
| Security Headers | Helmet middleware |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js 5 |
| Database | SQLite (local prototype) |
| ORM | Prisma (parameterized queries) |
| Password Hashing | bcrypt |
| MFA | OTP (6-digit, bcrypt-hashed, 5-min expiry) |
| Session | JWT in HttpOnly Secure cookie |
| Authorization | RBAC — `CUSTOMER`, `ADMIN` |
| Validation | Zod |
| Security Middleware | helmet, cors, express-rate-limit, cookie-parser |
| Config | dotenv |
| Testing | Jest + Supertest |

---

## Installation

```bash
cd securefin-auth-module
npm install
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
npm run db:migrate
npm run seed
```

---

## Environment Variable Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | SQLite path | `file:./dev.db` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | *(generate random string)* |
| `JWT_EXPIRES_IN` | Token lifetime | `1h` |
| `BCRYPT_ROUNDS` | bcrypt cost factor | `12` |
| `OTP_EXPIRY_MINUTES` | OTP validity | `5` |
| `COOKIE_SECURE` | Secure cookie flag | `false` (dev), `true` (prod) |
| `COOKIE_NAME` | Auth cookie name | `securefin_token` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:3000` |
| `LOGIN_RATE_LIMIT_MAX` | Max login attempts per window | `5` |
| `MAX_FAILED_LOGIN_ATTEMPTS` | Failed login attempts before lockout | `5` |
| `ACCOUNT_LOCK_MINUTES` | Temporary lockout duration | `15` |
| `SMTP_HOST` | Outgoing SMTP server | `mail.spacemail.com` |
| `SMTP_PORT` | SMTP port | `465` or `587` |
| `SMTP_SECURE` | SSL/TLS for SMTP | `true` for port `465` |
| `SMTP_USER` | SMTP username | Set in local `.env` only |
| `SMTP_PASS` | SMTP password | Set in local `.env` only |
| `SMTP_FROM` | Sender address | `SecureFin <...>` |

> **Never commit `.env`** — only `.env.example` is tracked.

---

## Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations (creates SQLite database)
npm run db:migrate

# Seed admin account
npm run seed
```

**Seeded admin credentials:**

| Field | Value |
|-------|-------|
| Email | `admin@securefin.test` |
| Username | `admin` |
| Password | `Admin@12345` |
| Role | `ADMIN` |

---

## How to Run

```bash
# Development
npm run dev

# Production
npm start

# Run tests
npm test
```

Server starts at `http://localhost:3000`.

### Browser Demo Pages

| Page | Purpose |
|------|---------|
| `/` or `/login.html` | Email-only login, registration email OTP, forgot password, login OTP |
| `/profile.html` | Protected profile, 2FA enable, admin users/role management, logout |

For OTP login and registration, check the recipient email inbox. OTPs are not logged.

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/api/auth/register` | No | — | Register new customer |
| `POST` | `/api/auth/verify-registration` | No | — | Verify registration OTP and create account |
| `POST` | `/api/auth/login` | No | — | Step 1: verify password, send OTP |
| `POST` | `/api/auth/verify-otp` | No | — | Step 2: verify OTP, set JWT cookie |
| `POST` | `/api/auth/forgot-password` | No | — | Send password reset OTP |
| `POST` | `/api/auth/reset-password` | No | — | Verify reset OTP and update password |
| `POST` | `/api/auth/logout` | Yes | Any | Clear session cookie |
| `GET` | `/api/profile` | Yes | Any | View own profile |
| `POST` | `/api/profile/mfa/enable` | Yes | Any | Enable MFA flag for profile |
| `GET` | `/api/admin/users` | Yes | `ADMIN` | List all users |
| `PATCH` | `/api/admin/users/:userId/role` | Yes | `ADMIN` | Update user role |
| `GET` | `/health` | No | — | Health check |

---

## Example Request Bodies

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Secure@12345"
}
```

### Login (Step 1)

```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "john@example.com",
  "password": "Secure@12345"
}
```

**Response:** Returns `sessionId`. OTP is printed to **server console** (prototype only).

### Verify OTP (Step 2)

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "sessionId": "<uuid-from-login>",
  "otp": "123456"
}
```

**Response:** Sets `securefin_token` HttpOnly cookie. Use `credentials: 'include'` in browser fetch/axios.

### Get Profile

```http
GET /api/profile
Cookie: securefin_token=<jwt>
```

### Admin — List Users

```http
GET /api/admin/users
Cookie: securefin_token=<admin-jwt>
```

### Logout

```http
POST /api/auth/logout
Cookie: securefin_token=<jwt>
```

---

## Cookies — Why Are They Required?

**Yes, this prototype uses cookies** — it is a core assignment requirement:

| Requirement | Implementation |
|-------------|----------------|
| JWT in HttpOnly cookie | Token stored in `securefin_token` cookie, not localStorage |
| XSS mitigation | `HttpOnly` prevents JavaScript from reading the token |
| CSRF mitigation | `SameSite=strict` reduces cross-site cookie sending |
| Transport security | `Secure` flag enabled in production (HTTPS/TLS) |

**Browser/client usage:** Send requests with `credentials: 'include'` (fetch) or `withCredentials: true` (axios) so cookies are sent and received.

**Alternative (not used here):** Storing JWT in `Authorization: Bearer` header or localStorage is common but increases XSS risk. HttpOnly cookies are the chosen secure pattern for this assignment.

---

## Bot & Abuse Prevention

This prototype implements **rate limiting** as the primary automated-abuse control:

| Limiter | Default | Protects Against |
|---------|---------|------------------|
| Global API | 100 req / 15 min | General scraping, DoS |
| Login | 5 req / 15 min | Password brute-force |
| OTP verify | 5 req / 15 min | OTP brute-force |
| Register | 10 req / 15 min | Mass fake account creation |

**Not included (production recommendations):**

- CAPTCHA (reCAPTCHA, hCaptcha) on login/register
- Account lockout after N failed attempts
- IP reputation / WAF (Cloudflare, AWS WAF)
- Device fingerprinting

Rate limiting satisfies the assignment's brute-force protection requirement. Mention CAPTCHA as a limitation/enhancement in your report.

---

## Security Controls Implemented

| # | Control | Location |
|---|---------|----------|
| 1 | Input validation (Zod) | `src/validators/authValidator.js` |
| 2 | Parameterized queries (Prisma ORM) | `src/db/database.js`, all services |
| 3 | bcrypt password hashing | `src/services/authService.js` |
| 4 | bcrypt OTP hashing | `src/services/otpService.js` |
| 5 | JWT in HttpOnly Secure cookie | `src/controllers/authController.js` |
| 6 | RBAC middleware | `src/middleware/roleMiddleware.js` |
| 7 | Rate limiting | `src/middleware/rateLimiter.js` |
| 8 | Generic auth error messages | `src/services/authService.js` |
| 9 | Secure logging (no secrets) | `src/utils/logger.js` |
| 10 | Environment variables | `src/config/env.js`, `.env.example` |
| 11 | Security headers (Helmet) | `src/app.js` |
| 12 | CORS restriction | `src/app.js` |
| 13 | Centralised error handler | `src/middleware/errorHandler.js` |
| 14 | Strong password policy | `src/validators/authValidator.js` |
| 15 | OTP expiry & single-use | `src/services/otpService.js` |
| 16 | Email OTP delivery via SMTP | `src/services/mailService.js`, `src/config/mail.js` |
| 17 | Account lockout after failed logins | `src/services/authService.js` |
| 18 | Password reset OTP flow | `src/services/authService.js` |
| 19 | Admin role management | `src/controllers/adminController.js` |

---

## Threat-to-Control Mapping

| Threat | Security Control |
|--------|------------------|
| User account spoofing | MFA email OTP, strong password policy, bcrypt, account lockout |
| Administrator spoofing | MFA, RBAC, admin-only role management, PAM recommended for production |
| Database tampering | Prisma parameterized queries, input validation, least privilege DB access recommended |
| Repudiation | Secure audit logging with timestamps in `logs/error.logs`, NTP/time sync recommended |
| Information disclosure | TLS in production, bcrypt hashes, HttpOnly cookie, no secrets/OTPs in logs |
| Denial of Service | Rate limiting, request body limits, WAF/monitoring recommended |
| Privilege escalation | RBAC, strict authorization middleware, complete mediation on protected routes |
| Session hijacking | JWT in HttpOnly cookie, SameSite, HTTPS, expiry, token regenerated after OTP |

---

## OWASP ASVS / Secure Coding Mapping

| ASVS Area | Requirement (Summary) | Implementation |
|-----------|----------------------|----------------|
| V2.1 | Password security | bcrypt hashing, strong password policy |
| V2.2 | General authenticator security | Generic failure messages, rate limiting |
| V2.8 | Single-factor OTP | 6-digit OTP, hashed storage, expiry, single-use |
| V3.1 | Session management | JWT with expiry in HttpOnly cookie |
| V3.2 | Session binding | Cookie flags: HttpOnly, Secure, SameSite |
| V4.1 | Access control | RBAC middleware on protected routes |
| V4.2 | Operation level access | `/api/admin/users` restricted to ADMIN |
| V5.1 | Input validation | Zod schemas on all auth endpoints |
| V5.3 | Output encoding | JSON responses, no HTML rendering |
| V7.1 | Log content | Passwords, OTPs, JWTs never logged |
| V7.4 | Error handling | Generic 500 messages in production |
| V8.1 | Data protection | passwordHash excluded from API responses |
| V13.1 | Generic security | Helmet headers, CORS, rate limits |
| V14.1 | HTTP security headers | Helmet middleware |
| V14.4 | HTTP request validation | JSON body size limit (10kb) |

---

## Testing Instructions

```bash
npm test
```

Tests cover:

- Registration with password hashing verification
- Weak password rejection
- Duplicate email handling
- Generic login failure messages
- Full 2-step MFA flow with cookie verification
- Profile access (authenticated / unauthenticated)
- RBAC: ADMIN access vs CUSTOMER 403
- Logout

**Manual testing with curl:**

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@test.com","password":"Demo@12345"}'

# Login — check server console for OTP
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"demo@test.com","password":"Demo@12345"}'

# Verify OTP — save cookies to jar
curl -c cookies.txt -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","otp":"<OTP>"}'

# Profile
curl -b cookies.txt http://localhost:3000/api/profile
```

---

## Limitations of Prototype

1. **OTP delivery:** Sent by SMTP email; SMS is not implemented
2. **SQLite:** Not suitable for production concurrency; use PostgreSQL/MySQL
3. **No refresh tokens:** JWT expires after 1 hour; user must re-authenticate
4. **Account lockout:** Temporary lockout only; production should add risk scoring and support unlock process
5. **No CAPTCHA:** Bots mitigated by rate limits only
6. **Email verification:** Implemented for registration, but no full email-link verification UI
7. **Password reset flow:** Implemented with OTP; production should add stronger recovery monitoring
8. **Single server:** No distributed session invalidation

---

## TLS / HTTPS Notes

**Local development uses HTTP only** (`COOKIE_SECURE=false`).

**Production deployment must enable HTTPS/TLS** via:

- Reverse proxy (nginx, Caddy) with TLS termination
- Cloud platform (Render, Railway, AWS ALB, Azure App Gateway)
- Set `COOKIE_SECURE=true` in production `.env`

Without HTTPS, the `Secure` cookie flag cannot protect tokens in transit.

---

## Project Structure

```
securefin-auth-module/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/env.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── adminController.js
│   ├── services/
│   │   ├── authService.js
│   │   └── otpService.js
│   ├── validators/authValidator.js
│   ├── db/database.js
│   └── utils/logger.js
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── tests/auth.test.js
├── .env.example
├── package.json
├── README.md
└── REPORT_Q3_NOTES.md
```

---

## License

MIT — Educational prototype for ITS69405 assignment.
