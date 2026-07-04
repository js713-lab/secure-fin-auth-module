# Q3 Secure Coding Implementation — Report Notes

**Module:** User Authentication & Authorization  
**Project:** SecureFin Sdn. Bhd. Customer Portal  
**Course:** ITS69405 Software Secure Systems  

---

## Q3.1 — What Was Implemented

A working Node.js/Express prototype covering the full authentication and authorization lifecycle:

### Core Features

| # | Feature | Endpoint | Status |
|---|---------|----------|--------|
| 1 | User registration with validation & bcrypt hashing | `POST /api/auth/register` | ✅ |
| 2 | Login step 1 — password verification + OTP generation | `POST /api/auth/login` | ✅ |
| 3 | Login step 2 — OTP verification + JWT cookie issuance | `POST /api/auth/verify-otp` | ✅ |
| 4 | Protected profile route (own data only) | `GET /api/profile` | ✅ |
| 5 | Admin-only user listing (RBAC) | `GET /api/admin/users` | ✅ |
| 6 | Logout — cookie cleared | `POST /api/auth/logout` | ✅ |
| 7 | Admin seed script with hashed password | `npm run seed` | ✅ |
| 8 | Automated API tests | `npm test` | ✅ |
| 9 | Email OTP registration verification | `POST /api/auth/verify-registration` | ✅ |
| 10 | Forgot/reset password with email OTP | `POST /api/auth/forgot-password`, `/reset-password` | ✅ |
| 11 | Profile 2FA enable action | `POST /api/profile/mfa/enable` | ✅ |
| 12 | Admin role management | `PATCH /api/admin/users/:userId/role` | ✅ |

### Architecture

- **Layered design:** routes → controllers → services → database (Prisma)
- **Security middleware** applied globally (Helmet, CORS, rate limits) and per-route (auth, RBAC)
- **Environment-based configuration** via `dotenv` and `src/config/env.js`
- **Secure logging** to `logs/error.logs` with sensitive field redaction

### Authentication Flow

```
Register → Login (password) → OTP (console) → Verify OTP → JWT HttpOnly Cookie → Protected Routes
```

### Authorization Model

- **CUSTOMER** (default): Can access `/api/profile` only
- **ADMIN**: Can access `/api/profile` and `/api/admin/users`
- Enforced by `requireRole('ADMIN')` middleware

---

## Q3.2 — Secure Coding Controls (6+)

### 1. Input Validation (Zod)

- **File:** `src/validators/authValidator.js`
- **Control:** All request bodies validated before processing; rejects malformed username, email, password, OTP
- **Threat mitigated:** Injection, buffer overflow, business logic bypass

### 2. Parameterized Queries via Prisma ORM

- **File:** `src/db/database.js`, all service files
- **Control:** Prisma generates parameterized SQL — no string concatenation in queries
- **Threat mitigated:** SQL injection (OWASP A03)

### 3. Secure Password Storage (bcrypt)

- **File:** `src/services/authService.js`, `prisma/seed.js`
- **Control:** Passwords hashed with bcrypt (cost factor 12) before database storage; never stored or returned in plaintext
- **Threat mitigated:** Credential disclosure if database is compromised

### 4. Secure Session Handling (JWT in HttpOnly Cookie)

- **File:** `src/controllers/authController.js`, `src/middleware/authMiddleware.js`
- **Control:** JWT contains only `userId` and `role`; stored in HttpOnly, Secure (prod), SameSite=strict cookie
- **Threat mitigated:** XSS token theft, session hijacking

### 5. Role-Based Access Control (RBAC)

- **File:** `src/middleware/roleMiddleware.js`, `src/routes/adminRoutes.js`
- **Control:** `requireRole('ADMIN')` on admin routes; CUSTOMER receives HTTP 403
- **Threat mitigated:** Privilege escalation, unauthorized data access

### 6. Rate Limiting (Brute-Force & Bot Mitigation)

- **File:** `src/middleware/rateLimiter.js`
- **Control:** Separate limits for global API, login, OTP verification, and registration
- **Threat mitigated:** Brute-force password guessing, OTP enumeration, automated bot registration

### 7. Secure Error Handling

- **File:** `src/middleware/errorHandler.js`, `src/services/authService.js`
- **Control:** Generic "Invalid credentials" message; no stack traces in production; no user enumeration
- **Threat mitigated:** Information disclosure, account enumeration

### 8. Secure Logging

- **File:** `src/utils/logger.js`
- **Control:** Logs written to `logs/error.logs`; passwords, OTPs, JWTs, and hashes redacted by key name
- **Threat mitigated:** Sensitive data leakage via log files

### 9. Environment Variable Configuration

- **File:** `src/config/env.js`, `.env.example`
- **Control:** Secrets (JWT_SECRET) loaded from environment; `.env` gitignored
- **Threat mitigated:** Hard-coded credentials in source code

### 10. Security HTTP Headers (Helmet)

- **File:** `src/app.js`
- **Control:** Helmet sets X-Content-Type-Options, X-Frame-Options, and related headers
- **Threat mitigated:** Clickjacking, MIME sniffing attacks

### 11. OTP Security

- **File:** `src/services/otpService.js`
- **Control:** OTP bcrypt-hashed in database; 5-minute expiry; single-use; invalidated on re-login
- **Threat mitigated:** OTP replay, offline OTP cracking

### 12. CORS Restriction

- **File:** `src/app.js`
- **Control:** Only configured origins allowed; credentials enabled for cookie auth
- **Threat mitigated:** Unauthorized cross-origin API access

### 13. Email OTP Delivery

- **File:** `src/services/mailService.js`, `src/config/mail.js`
- **Control:** Registration, login MFA, and password reset OTPs are sent using SMTP; OTPs are not logged
- **Threat mitigated:** Account spoofing, unauthorized password reset

### 14. Account Lockout

- **File:** `src/services/authService.js`
- **Control:** Failed password attempts temporarily lock accounts after configured threshold
- **Threat mitigated:** Password brute-force and credential stuffing

---

## Q3.3 — README Contents Summary

The `README.md` includes all required sections:

| Section | Included |
|---------|----------|
| Project title & description | ✅ |
| Security objective | ✅ |
| Features list | ✅ |
| Technology stack | ✅ |
| Installation steps | ✅ |
| Environment variable setup | ✅ |
| Database setup & seed | ✅ |
| How to run (dev, prod, test) | ✅ |
| API endpoint table | ✅ |
| Example request bodies | ✅ |
| Security controls implemented | ✅ |
| OWASP ASVS mapping table | ✅ |
| Testing instructions | ✅ |
| Prototype limitations | ✅ |
| TLS/HTTPS production notes | ✅ |
| Cookies explanation | ✅ |
| Bot prevention (rate limiting) | ✅ |

---

## OWASP ASVS Mapping Table

| ID | ASVS Requirement | Implementation | Evidence File |
|----|------------------|----------------|---------------|
| V2.1.1 | Passwords stored using approved one-way hash | bcrypt with cost 12 | `authService.js` |
| V2.1.7 | Password length and complexity enforced | Zod: 8+ chars, upper, lower, digit, special | `authValidator.js` |
| V2.2.1 | Anti-automation controls on auth | Rate limiters on login/register/OTP | `rateLimiter.js` |
| V2.2.2 | Generic auth failure messages | "Invalid credentials" for all login failures | `authService.js` |
| V2.8.1 | Time-limited OTP | 5-minute expiry in `OtpSession` | `otpService.js` |
| V2.8.2 | OTP single use | `used` flag set after verification | `otpService.js` |
| V3.1.1 | Session tokens use approved crypto | JWT signed with HS256 + secret | `authService.js` |
| V3.2.1 | Session token not in URL | JWT in HttpOnly cookie only | `authController.js` |
| V3.2.2 | Cookie Secure flag | `COOKIE_SECURE=true` in production | `authController.js` |
| V4.1.1 | Access control enforced server-side | `authMiddleware` on all protected routes | `authMiddleware.js` |
| V4.1.2 | Least privilege | RBAC: CUSTOMER vs ADMIN | `roleMiddleware.js` |
| V4.1.3 | Deny by default | Routes require explicit auth + role | All route files |
| V5.1.1 | Input validation | Zod schemas on all POST endpoints | `authValidator.js` |
| V7.1.1 | No credentials in logs | Redaction in logger utility | `logger.js` |
| V7.4.1 | Generic error handling | Production hides stack traces | `errorHandler.js` |
| V8.2.1 | Sensitive data not in responses | passwordHash excluded from selects | All controllers |
| V13.2.1 | RESTful HTTP methods | Correct verbs per endpoint | Route files |
| V14.4.1 | HTTP security headers | Helmet middleware | `app.js` |
| V14.5.1 | CORS policy | Origin whitelist | `app.js` |

---

## Threat-to-Control Mapping

| Threat | Security Control |
|--------|------------------|
| User account spoofing | MFA email OTP, strong password policy, bcrypt, account lockout |
| Administrator spoofing | MFA, RBAC, admin-only role management, PAM recommended for production |
| Database tampering | Parameterized Prisma queries, Zod validation, least privilege DB access recommended |
| Repudiation | Secure audit logging with timestamps in `logs/error.logs`; NTP/time synchronization recommended |
| Information disclosure | TLS in production, bcrypt, HttpOnly cookies, no OTP/password/JWT logging |
| Denial of Service | Rate limiting, request size limit, WAF/monitoring recommended |
| Privilege escalation | RBAC, strict authorization middleware, complete mediation |
| Session hijacking | JWT in HttpOnly cookie, SameSite, HTTPS in production, expiration after configured time |

---

## Cookies — Assignment Requirement

**Yes, cookies are required** for this module. The assignment specification states:

> Session management: JWT stored in HttpOnly Secure cookie

Cookies are used because:

1. **HttpOnly** prevents JavaScript access (XSS protection)
2. **Secure** ensures transmission only over HTTPS in production
3. **SameSite=strict** reduces CSRF risk

Clients must send `credentials: 'include'` when calling the API from a browser.

---

## Bot Prevention — What Is Implemented

| Control | Status | Notes |
|---------|--------|-------|
| Rate limiting (global) | ✅ Implemented | 100 req / 15 min |
| Rate limiting (login) | ✅ Implemented | 5 attempts / 15 min |
| Rate limiting (OTP) | ✅ Implemented | 5 attempts / 15 min |
| Rate limiting (register) | ✅ Implemented | 10 attempts / 15 min |
| CAPTCHA | ❌ Not in prototype | Recommend for production |
| Account lockout | ❌ Not in prototype | Rate limit is temporary |
| WAF / IP blocking | ❌ Not in prototype | Infrastructure-level control |

For the assignment report, state that **express-rate-limit** provides brute-force and bot mitigation aligned with ASVS V2.2.1, with CAPTCHA noted as a production enhancement in limitations.

---

## Quick Demo Script for Presentation

```bash
npm install && cp .env.example .env
npm run db:migrate && npm run seed
npm run dev

# Terminal 2:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@securefin.test","password":"Admin@12345"}'
# Copy OTP from server console

curl -c c.txt -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<ID>","otp":"<OTP>"}'

curl -b c.txt http://localhost:3000/api/admin/users
```

---

## Files Delivered

- Full source code under `securefin-auth-module/src/`
- `README.md` — complete documentation
- `.env.example` — sample environment configuration
- `REPORT_Q3_NOTES.md` — this file
- `tests/auth.test.js` — automated test suite
- `prisma/seed.js` — admin account seeder
