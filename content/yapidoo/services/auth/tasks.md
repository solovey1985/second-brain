# Implementation Tasks — Yapidoo.Service.Auth

## Milestone 1: Identity & Data

- [ ] **Design EF Core schema for Identity and OpenIddict tables**
  - Define tables for users, roles, claims, external logins, and OpenIddict entities (applications, tokens, authorizations, scopes).
- [ ] **Implement Identity models and migrations**
  - Create C# models and configure EF Core migrations for initial schema setup.
- [ ] **Provision and test database**
  - Deploy the database, run migrations, and verify schema correctness.

## Milestone 2: OpenIddict Online

- [ ] **Integrate OpenIddict with ASP.NET Core Identity**
  - Configure OpenIddict to use Identity for authentication and token issuance.
- [ ] **Implement OIDC endpoints: /authorize, /token, /userinfo, discovery, JWKS**
  - Expose endpoints for OAuth2/OIDC flows and key discovery.
- [ ] **Seed clients (SPA, M2M)**
  - Register initial client applications for SPA and machine-to-machine scenarios.

## Milestone 3: CQRS Accounts

- [ ] **Implement Register, Login, Logout commands using Yapidoo.Common.Mediator**
  - Use CQRS pattern for account operations, wiring up commands and queries.
- [ ] **Enable cookie session for interactive OIDC flow**
  - Configure session management for browser-based authentication.

## Milestone 4: Clients Integrated

- [ ] **Integrate Angular SPA via Auth Code + PKCE**
  - Set up SPA to use Authorization Code flow with PKCE for secure login.
- [ ] **Integrate M2M via Client Credentials**
  - Enable backend jobs/services to authenticate using client credentials.
- [ ] **Validate JWT via JWKS in resource APIs**
  - Ensure resource APIs can validate JWTs using JWKS endpoint.

## Milestone 5: Claims & Scopes

- [ ] **Define minimal claims in tokens**
  - Decide which claims are included in access and ID tokens.
- [ ] **Enforce users.read/users.write policies in resource APIs**
  - Implement scope-based authorization in downstream APIs.

## Milestone 6: Keys & Hardening

- [ ] **Persist signing keys**
  - Store RSA/X.509 keys securely for token signing and rotation.
- [ ] **Implement rate limits, strict CORS/redirects**
  - Protect endpoints from abuse and restrict allowed origins/redirects.
- [ ] **Configure short TTLs and refresh rotation**
  - Set token lifetimes and enable refresh token rotation for security.

## Milestone 7: External IdPs

- [ ] **Add Google/Facebook login and account linking**
  - Integrate external identity providers and support account linking.
- [ ] **Continue OIDC flow after external login**
  - Ensure users can complete OIDC authentication after external login.

## Milestone 8: Eventing

- [ ] **Publish UserRegistered/UserDeleted events**
  - Emit events to the bus when users register or are deleted.
- [ ] **Ensure Users service provisions/cleans profiles**
  - Confirm Users service reacts to events and manages profiles accordingly.

## Milestone 9: Operate & Scale

- [ ] **Set up dashboards/alerts**
  - Monitor Auth service health, usage, and errors with dashboards and alerts.
- [ ] **Autoscale stateless Auth pods**
  - Configure Kubernetes or platform to scale Auth service as needed.
- [ ] **Enable blue/green or canary deployments via Helm**
  - Implement safe deployment strategies for updates and rollbacks.
