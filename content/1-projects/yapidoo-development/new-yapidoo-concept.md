Here’s a structured step-by-step guide for each suggested .NET backend microservice in Yapidoo, aligned with the **new architecture concepts used in this folder** (DDD boundaries, CQRS/use-cases, event bus integration events, and an API Gateway front door).

---

# Step-by-Step Development Plan per .NET Microservice

---

# Shared Conventions (Applies to All Services)

Use these conventions consistently so services compose cleanly:

1. **Runtime & Framework**
   * Target **.NET 9**.
   * Prefer clean separation of responsibilities (presentation vs application vs data vs infrastructure).

2. **Service Structure (recommended default)**
   * `*.Api` — HTTP endpoints/controllers, authZ policies, validation, health endpoints.
   * `*.UseCases` (or `*.Application`) — CQRS commands/queries + handlers (via `Yapidoo.Common.Mediator` or MediatR).
   * `*.Domain` — entities/aggregates/value objects + domain events (where DDD is used).
   * `*.Data` — EF Core `DbContext`, migrations, persistence models.
   * `*.Infrastructure` — messaging, external integrations, cross-cutting concerns.

3. **Messaging & Integration**
   * Prefer **integration events** on a message broker (e.g., RabbitMQ) over direct service-to-service calls for cross-domain side effects.
   * Use an **Outbox** pattern where publishing needs to be atomic with DB writes.
   * Make consumer handlers **idempotent**.

4. **Security**
   * The Auth service is the system source for tokens/keys; APIs validate JWTs **offline** using JWKS.
   * Apply **scope/policy-based authorization** at the API boundary.
   * Only the API Gateway is public-facing by default.

5. **Observability & Ops**
   * Structured logs (e.g., Serilog), OpenTelemetry traces/metrics.
   * Standard endpoints: `/healthz` and `/readyz`.

---

## 1. `Yapidoo.Service.Users`

**Purpose:** Manage user profiles, preferences, and personal data.

### Steps

1. **Project Setup:**

   * Create `Yapidoo.Service.Users` with the shared structure (`Users.Api`, `Users.UseCases`, `Users.Domain` (optional), `Users.Data`, `Users.Infrastructure`).
   * Add EF Core for data access with PostgreSQL or MS SQL.
   * Define the **business profile** model (owned by Users), e.g.: Id, IdentityUserId (from Auth), DisplayName, Country, City, Interests, ProfilePhotoId/Url, LanguagePreference, etc.
   * Avoid duplicating Auth-owned identity concerns (passwords, external providers, OIDC clients).

2. **Database Schema & Migrations:**

   * Implement migrations and seed minimal test data.
   * Ensure Unicode support for multilingual content.
   * Consider a unique index on `IdentityUserId`.

3. **API Endpoints:**

   * `GET /api/users/me` – Retrieve current user profile (from token subject).
   * `GET /api/users/{id}` – Retrieve public profile (as allowed by privacy rules).
   * `PUT /api/users/me` – Update current user profile.
   * `PUT /api/users/me/preferences` – Update interests/preferences.
   * Keep friend graph/social features in a dedicated service if/when it exists.

4. **Authentication Integration:**

   * Validate JWTs issued by Auth (JWKS-based offline validation).
   * Use policies/scopes (e.g., `users.read`, `users.write`) for authorization.

5. **Image Handling Integration:**

   * Integrate with Media service for profile photo uploads; store a `MediaId` (preferred) or URL.

6. **Localization:**

   * Respect user’s language preference in response formatting and data.

7. **Eventing (Integration Events):**

   * Consume `UserRegistered` / `UserDeleted` from Auth to provision/cleanup profiles.
   * Publish `UserProfileUpdated` (optional) if other services need to react.

8. **Testing:**

   * Unit tests for business logic, API integration tests.

9. **Documentation:**

   * Swagger/OpenAPI documentation for endpoints.

---

## 2. `Yapidoo.Service.Auth`

**Purpose:** Authentication, user registration, JWT token issuance, password management, social login integration.

### Steps

1. **Project Setup:**

   * Implement Auth as the single OIDC/OAuth2.1 authority (recommended: **OpenIddict + ASP.NET Core Identity**, .NET 9).
   * Organize into `Auth.Api`, `Auth.UseCases`, `Auth.Data`, `Auth.Infrastructure` (matches existing docs in this folder).
   * Expose discovery + keys: `/.well-known/openid-configuration` and `/.well-known/jwks.json`.

2. **Endpoints:**

    * Prefer standard OpenIddict endpoints:
       * `GET /connect/authorize` – Authorization endpoint (SPA code + PKCE).
       * `POST /connect/token` – Token endpoint (code exchange, refresh, client credentials).
       * `GET /connect/userinfo` – User info.
    * Keep any `/api/auth/*` endpoints only for first-party UX helpers (e.g., account pages), not as the primary token interface.

3. **Email Verification & Password Reset:**

   * Implement email confirmation flows with tokenized links.
   * Password reset endpoints sending email/SMS codes.

4. **Social Login Integration:**

   * Integrate with Google and Facebook OAuth2.
   * On success, issue app-specific JWT tokens.

5. **Security:**

   * Secure password storage (ASP.NET Identity hashing).
   * JWT signing with strong asymmetric keys (RSA/X.509); rotate keys and publish via JWKS.
   * Enforce HTTPS, strict CORS, redirect URI allowlists.

6. **Token Handling:**

   * Implement access and refresh token flows.
   * Configure token expiration and revocation strategies.

7. **Eventing (Integration Events):**

   * Publish `UserRegistered { IdentityUserId, Email, DisplayName }` and `UserDeleted { IdentityUserId }` for Users.

8. **Testing:**

   * Authentication workflows, token issuance, failure cases.

9. **Documentation:**

   * Swagger docs for all endpoints.

---

## 3. `Yapidoo.Service.Events`

**Purpose:** Event creation, browsing, joining, status updates, and event participant management.

### Steps

1. **Project Setup (DDD + CQRS):**

   * Create `Yapidoo.Service.Events` as a multi-project service (mirrors the migration guide in `services/events`):
     * `Events.Domain` — Event aggregate, value objects, domain events.
     * `Events.UseCases` (or `Events.Application`) — CQRS commands/queries + handlers.
     * `Events.Data` / `Events.Infrastructure` — EF Core, repositories, messaging/outbox.
     * `Events.Api` — HTTP endpoints, authZ policies, validation, health.
   * Model an **Event aggregate** with invariants:
     * Identity: `Id`, `CreatorUserId`
     * Content: `Title`, `Description`, `Tags`
     * Time: `StartTime`, `EndTime`
     * Location: coordinates + display fields as a value object
     * Privacy: `Public` / `Friends` / `Hidden`
     * Status: at minimum `Planned` / `Cancelled` / `Completed` (or `Active` if needed)
     * Participation: participant list + constraints (max participants, rules)

2. **Persistence & Read Models:**

   * Store participants as a relational association (e.g., `EventParticipants(EventId, UserId, JoinedAt)`), but enforce rules in the aggregate.
   * Add indexes for common queries: time range, geo/region fields, tags (if stored), creator, status.
   * If search becomes complex, introduce a read model / projection (CQRS) rather than overloading the write model.

3. **CQRS Use Cases (commands/queries):**

   * Commands:
     * `CreateEvent`
     * `UpdateEvent` (creator-only)
     * `CancelEvent` (creator-only)
     * `JoinEvent` / `LeaveEvent` (idempotent)
   * Queries:
     * `GetEventById`
     * `SearchEvents` (filters: date range, location, tags, status)

4. **HTTP Endpoints (external contract):**

   * Keep the public surface simple (typically exposed via the API Gateway):
     * `POST /api/events` – Create event.
     * `GET /api/events` – Search/list events with filters.
     * `GET /api/events/{id}` – Get event details.
     * `POST /api/events/{id}/join` – Join an event.
     * `POST /api/events/{id}/leave` – Leave an event.
     * `PUT /api/events/{id}` – Edit event (creator-only).
     * `POST /api/events/{id}/cancel` – Cancel event (creator-only).
   * Apply optimistic concurrency where appropriate (ETag/rowversion) to avoid lost updates.

5. **Authorization & Privacy:**

   * Enforce JWT auth for event creation and participation endpoints.
   * Validate permissions: only creator can update/cancel.
   * Privacy rules:
     * `Public` visible to all authenticated users (or public if product requires).
     * `Hidden` visible only to creator/invited participants.
     * `Friends` requires a “social graph” authority (future Social service or Users extension). Until that exists, keep `Friends` behavior explicitly “not implemented” or treated as `Hidden`.

6. **Domain & Integration Events:**

   * Raise domain events inside the aggregate (e.g., `EventCreated`, `EventCancelled`, `ParticipantJoined`).
   * Publish integration events via outbox to the message broker so other services can react:
     * Notifications can notify on join/cancel.
     * Users can update activity feeds (if applicable).

7. **Media & Location Integration:**

   * Store a `CoverMediaId` (preferred) or URL; Media service owns storage details.
   * Keep optional geocoding (Google Maps) at the edge (Gateway/BFF) or as an infrastructure adapter; persist canonical coordinates + display address.

8. **Testing:**

   * Unit tests for domain invariants and state transitions.
   * API tests for contracts, authZ, idempotency (join/leave), and concurrency scenarios.

9. **Documentation:**

   * OpenAPI spec with examples (create/update, join/leave, privacy).
   * Document emitted integration events and their schemas.

---

## 4. `Yapidoo.Service.Media`

**Purpose:** Image upload, processing (resizing, thumbnailing), storage, and retrieval.

### Steps

1. **Project Setup:**

   * Create `Yapidoo.Service.Media` using the shared structure (`Media.Api`, `Media.UseCases`, `Media.Data`, `Media.Infrastructure`).
   * Integrate Google Cloud Storage or Firebase Storage (or equivalent) SDK.

2. **Endpoints:**

   * `POST /api/media/upload-url` – Return a signed upload URL for direct client upload.
   * `POST /api/media/process` – Trigger image processing tasks (resize, format conversion).
   * `GET /api/media/{id}` – Return metadata and/or a signed download URL (prefer redirect to CDN/storage).

3. **Image Processing:**

   * Use .NET image processing libraries (ImageSharp or SkiaSharp).
   * Optionally, implement serverless cloud functions for offloaded processing.

4. **Security:**

   * Generate signed URLs with expiration for secure upload/download.
   * Support access control on images if required.

5. **Eventing (Integration Events):**

   * Publish `MediaUploaded` / `MediaProcessed` so domain services can update their records safely.

6. **CDN Integration:**

   * Configure CDN for fast global delivery of images.

7. **Testing:**

   * Upload/download flows, processing correctness, security of signed URLs.

8. **Documentation:**

   * API contract describing upload/download procedures.

---

## 5. `Yapidoo.Service.Notifications`

**Purpose:** Manage user notifications and push messages.

### Steps

1. **Project Setup:**

   * Create `Yapidoo.Service.Notifications` using the shared structure (`Notifications.Api`, `Notifications.UseCases`, `Notifications.Data`, `Notifications.Infrastructure`).
   * Integrate Firebase Cloud Messaging (FCM) or similar push notification provider.
   * Add a background worker/consumer for message broker subscriptions (event-driven notifications).

2. **Endpoints:**

   * `POST /api/notifications/register` – Register device tokens for push notifications.
   * `POST /api/notifications/send` – (Optional/admin) send notification to user/device.

3. **Notification Types:**

   * Support event-related notifications (invites, join alerts, cancel alerts) driven by integration events.
   * Support friend-related notifications if/when a Social/Friends domain exists.

4. **Scheduling & Delivery:**

   * Implement immediate and scheduled notifications.
   * Handle delivery failures and retries.

5. **Security:**

   * Authenticate requests to notification APIs.
   * Secure storage of device tokens.

6. **Testing:**

   * Verify notification delivery on multiple devices/platforms.

7. **Documentation:**

   * Document API usage and expected payloads.

8. **Event Subscriptions:**

   * Subscribe to Events service integration events (e.g., `EventCancelled`, `ParticipantJoined`) and translate them into push notifications.

---

## 6. `Yapidoo.ApiGateway`

**Purpose:** Single API gateway fronting all backend microservices, handling routing, authentication, and rate limiting.

### Steps

1. **Project Setup:**

   * Create an ASP.NET Core gateway using a reverse proxy (recommended: **YARP**) or Ocelot.
   * Keep it as the primary public entrypoint; route to backend microservices.

2. **Authentication:**

   * Validate JWT tokens for incoming requests (keys via Auth JWKS).
   * Enforce scopes/policies at the edge where appropriate.
   * Forward identity/claims to downstream services via standard headers (Authorization bearer) only.

3. **Cross-cutting Concerns:**

   * Implement rate limiting and throttling.
   * Add centralized logging and metrics collection (request tracing).
   * Handle CORS and response caching.
   * Add correlation IDs and consistent error mapping.

4. **Security:**

   * Enforce HTTPS.
   * Protect against common attack vectors (e.g., injection, DoS).

5. **Testing:**

   * Test routing and authentication under various scenarios.

6. **Documentation:**

   * Describe public API surface exposed by the gateway.

---

Next: if you want, we can generate a consistent starter template for each service that matches the structures described above.
