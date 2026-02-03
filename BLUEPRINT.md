# Digital Mart POS - Blueprint

This blueprint outlines a secure, multi-tenant POS backend (Node.js + MongoDB)
with a Flutter frontend, designed for Docker deployment on a VPS.

## 1. Goals

- Multi-tenant isolation with per-tenant databases for easy backup/restore.
- Role-based access: `super_admin`, `shop_admin`, `staff`.
- "Dark API" behavior: no public docs or UI; `/` returns `Digital Mart POS Api`.
- Production-ready security posture and deployment on Docker/VPS.

## 2. Architecture Overview

- Edge/Proxy: `nginx` or `traefik` for TLS, rate limiting, IP rules.
- API: Node.js (single codebase, tenant-aware routing/DB selection).
- Database: MongoDB cluster with one database per tenant.
- Cache/Queue (optional): Redis for rate-limiting and token revocation.
- Frontend: Flutter app (mobile/web).

## 3. Tenant Isolation Strategy

Recommended: **One MongoDB database per tenant** inside a single MongoDB
cluster/container. This provides strong logical isolation and simple backups.

- Example databases:
  - `tenant_acme`
  - `tenant_foo`

Backup:

- `mongodump --db tenant_acme`
- Store per-tenant backups in object storage.

## 4. Roles & Permissions

- `super_admin`
  - Manage tenants: create, delete, suspend.
  - Set subscription plan and status.
- `shop_admin`
  - Manage products.
  - Manage staff accounts.
- `staff`
  - Create sales only (read-only on products).

Authorization is enforced at:

- Middleware level (RBAC guard).
- Service/use-case level (defense in depth).

## 5. Core Data Model (MongoDB)

### 5.1 Global/Core Database (shared)

- `tenants`
  - `tenantId`, `name`, `status`, `plan`, `dbName`, `createdAt`
- `users`
  - `userId`, `tenantId`, `role`, `email`, `passwordHash`

### 5.2 Per-Tenant Databases

- `products`
  - `name`, `sku`, `price`, `color`, `capacity`, `metadata`
- `sales`
  - `lineItems[]` with a price snapshot at time of sale
- `staff`
  - `name`, `role`, `status`, `createdBy` (super_admin or shop_admin)
- `audit_logs`
  - user actions, admin changes

### 5.3 Staff Account Management

- Staff accounts are created by `super_admin` when setting up a subscription for a `shop_admin`
- Alternatively, `shop_admin` can create additional staff accounts within their tenant
- Staff accounts are tied to a specific tenant and cannot access other tenants' data

## 6. API Design Notes

- Every request must resolve a tenant (by subdomain, header, or token claim).
- All queries must be scoped to that tenant database.
- Example endpoints:
  - `POST /auth/login`
  - `POST /tenants` (super_admin only)
  - `GET /products` (shop_admin, staff)
  - `POST /sales` (staff)

## 7. Dark-API Mode

- No public documentation routes in production.
- `/` returns plain text: `Digital Mart POS Api`
- `404` on any unknown route.
- Only authenticated requests can access business endpoints.

## 8. Security Guardrails

- JWT access tokens + refresh tokens with rotation.
- Token revocation list (Redis).
- Rate limiting by IP and user.
- Strict CORS (only frontend domain).
- Helmet headers, body size limits, no stack traces in prod.
- TLS everywhere + DB IP allowlisting.
- Per-tenant audit logs for admin actions.

## 9. Deployment (Docker/VPS)

- `nginx` (TLS termination, routing)
- `node-api`
- `mongo`
- `redis` (optional)

Use Docker Compose in production or Docker Swarm for scaling.

## 10. Operational Notes

- Monitor API latency, error rates, and DB connections.
- Backups scheduled nightly per tenant.
- Log rotation and retention policies.

## 11. Next Steps

- Define tenant resolution strategy (subdomain vs header).
- Implement RBAC middleware and tenant DB selector.
- Generate Docker Compose with secure defaults.
