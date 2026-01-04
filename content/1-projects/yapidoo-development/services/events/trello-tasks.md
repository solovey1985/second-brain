# Trello Import — Yapidoo Events Service (.NET 9)

Source docs:
- Migration guide: [migration-guide.md](migration-guide.md)
- Diagrams: [diagrams.md](diagrams.md)

Import tip: Each `##` section below is intended to be one Trello card. Checklists use ``.

---

## 1) Scaffold solution + repo structure

Description
- Follow: [1. Project Structure](migration-guide.md#1-project-structure)
- Validate architecture against: [Component Diagram](diagrams.md#component-diagram)

Checklist
 Create solution `Yapidoo.Service.Events` and projects (`.Api`, `.UseCases`, `.Domain`, `.Data`, `.Infrastructure`)
 Add project references per guide (Api -> UseCases/Data/Infrastructure, UseCases -> Domain, etc.)
 Set target framework to `net9.0` for all projects
 Add baseline folders/namespaces to match the guide

---

## 2) Implement Domain layer (aggregate + enums + events)

Description
- Follow: [2. Domain Layer](migration-guide.md#2-domain-layer-yapidooserviceeventsdomain)
- Use as reference: [Class Diagram](diagrams.md#class-diagram)

Checklist
 Add SeedWork (`Entity`, `AuditableEntity`, `ValueObject`, `IAggregateRoot`, `IRepository`, `IUnitOfWork`)
 Add enums (`PrivacyTypeEnum`, `EventStatusEnum`, `ConditionValueEnum`, `LogicEnum`, `LocationTypeEnum`)
 Add common entities (`Location`, `Venue`)
 Implement `Event` aggregate (core fields + status/date semantics)
 Implement related entities: `Participation`, `Following`, `Condition`, `EventTimeline`, `EventHashtag`, `Hashtag`, `Category`
 Add domain events (`EventCreatedDomainEvent`, etc.)
 Add repository interfaces (`IEventRepository`, `IVenueRepository`, `IEventHashtagRepository`)
 Add domain exceptions (`EventDomainException`)

---

## 3) Data layer (EF Core model + migrations)

Description
content\1-projects\yapidoo-development\services\events\
- Follow: [3. Data & Infrastructure Layers](migration-guide.md#3-data--infrastructure-layers-yapidooserviceeventsdata--yapidooserviceeventsinfrastructure)
- DbContext: [3.2 DbContext](migration-guide.md#32-dbcontext)

Checklist
 Add EF Core packages to `.Data`
 Implement `EventDbContext : DbContext, IUnitOfWork`
 Add entity configurations (at least `EventEntityTypeConfiguration` and any required relationships)
 Ensure relationships match the diagram (Event ↔ Venue/Location, participations, followers, etc.)
 Create initial migrations and verify DB updates locally

---

## 4) Infrastructure layer (repositories + outbox publisher)

Description
- Follow: [3.2.1 Outbox & Integration Events](migration-guide.md#321-outbox--integration-events-recommended)
- Keep in mind: [Component Diagram](diagrams.md#component-diagram)

Checklist
 Implement base `Repository<T>`
 Implement `EventRepository`, `VenueRepository`, `EventHashtagRepository`
 Add Outbox table + model (persist integration events in same transaction)
 Add publisher/background worker to dispatch outbox rows to the bus
 Define integration event contracts/payloads (as per guide suggestions)
 Ensure idempotency strategy for consumers (dedupe key/event id)

---

## 5) UseCases layer (CQRS handlers, validators, mapping)

Description
- Follow: [4. UseCases Layer](migration-guide.md#4-usecases-layer-yapidooserviceeventsusecases)
- Validate flows against: [Use Case Diagram](diagrams.md#use-case-diagram)

Checklist
 Add package refs (MediatR, FluentValidation, AutoMapper)
 Implement commands/queries (Create, Update, Join, Leave; plus read/search if needed)
 Implement handlers (`CreateEventCommandHandler`, `UpdateEventCommandHandler`, participation handlers)
 Implement validators (`CreateEventCommandValidator`, etc.)
 Implement DTOs/ViewModels and mapping profile
 Wire domain event handlers (e.g., `NotifyInvitedOnEventCreatedHandler`) if applicable

---

## 6) API layer (routes + authN/Z + health + Swagger)

Description
- Follow: [5. API Layer](migration-guide.md#5-api-layer-yapidooserviceeventsapi)
- Controller: [5.2 Controller](migration-guide.md#52-controller)
- Startup: [5.3 Program.cs](migration-guide.md#53-programcs-startup-configuration)

Checklist
 Implement `EventsController` at route `api/events`
 Add endpoints for join/leave participation (per guide)
 Configure JWT bearer validation via OIDC discovery + JWKS
 Add authorization policies/scopes (`events.read`, `events.write`) and apply to endpoints
 Add Swagger/OpenAPI with correct title/version
 Add `/healthz` and `/readyz`
 Register repositories, DbContext, MediatR, AutoMapper, validators

---

## 7) Ops/observability + readiness to deploy

Description
- Follow: [0. How This Service Fits Yapidoo](migration-guide.md#0-how-this-service-fits-yapidoo)
- Consider: [9. Deployment Checklist](migration-guide.md#9-deployment-checklist)

Checklist
 Add structured logging (Serilog) consistent with platform conventions
 Add OpenTelemetry traces/metrics (at least wiring points + exporters per environment)
 Validate readiness checks reflect DB/bus dependencies appropriately
 Verify configuration keys: connection strings, Auth authority, etc.
 Confirm CORS handled at Gateway (not service) as per guide

---

## 8) Testing + acceptance checklist

Description
- Follow: [8. Testing Strategy](migration-guide.md#8-testing-strategy)

Checklist
 Unit tests for domain logic + validators
 Integration tests for handlers/repositories (DB)
 Smoke test API endpoints (create/update/join/leave)
 Verify integration events are written to outbox and published
 Verify diagrams still render (Mermaid) after doc changes
