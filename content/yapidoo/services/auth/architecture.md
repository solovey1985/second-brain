# Auth Service Architecture

## Overview

Includes next fetuares:

- **Logging** - Centralized logging with Serilog
- **CQRS** - with Yapidoo.Coommon.Mediator
- **Message Broker** - RabbitMQ with event publishing
- Domain Driven Design (DDD) principles
- **OpenTelemetry** - for observability and metrics
- Clustered deployment with Kubernetes
- **OpenIddict** - Implements OAuth2 and OpenID Connect standards

## Project Structure

- **Api** - ASP.NET Core Web API
- **UseCases** - Application logic (Commands/Queries)
- **Data** - EF Core DbContext and migrations
- **Infrastructure** - Cross-cutting concerns (OpenIddict, Messaging, External IdPs)

### Api

- **Controllers** - Handles HTTP requests
- **Endpoints** - OpenIddict endpoints for token issuance
- **Health Checks** - `/healthz` and `/readyz` endpoints
- **Configuration** - OpenIddict and Identity setup

### UseCases

- **Commands** - Actions like RegisterUser, Login, etc.
  - RegisterUserCommand
  - Login Command
  - Logout Command
  - UpdateUserCommand
  - DeleteUserCommand
  - VerifyEmailCommand
  - ResetPasswordCommand
  - ExternalLoginCommand

- **Queries** - Read operations like GetUserInfo
  - GetUserInfoQuery
  - GetUserRolesQuery
  - GetExternalProvidersQuery

- **Events** - Domain events for user actions
  - UserRegisteredEvent
  - UserDeletedEvent
  - UserUpdatedEvent

### Data

- **DbContext** - AuthDbContext for EF Core
- **Models** - Identity models like ApplicationUser, ApplicationRole
- **Migrations** - EF Core migrations for database schema
- **Seed Data** - Initial data for development/testing
- **Repositories** - Data access layer for user and role management

### Infrastructure

- **OpenIddict** - Configuration for OAuth2/OIDC
- **External IdPs** - Integration with Google, Facebook, etc.
- **Messaging** - Event publishing with RabbitMQ
- **Keys** - Signing keys management
- **Configuration** - App settings and environment variables
- **Security** - TLS, CORS, and security policies
- **Logging** - Serilog setup for structured logging
- **Telemetry** - OpenTelemetry for metrics and tracing
- **Health Checks** - Custom health checks for service readiness
- **Dependency Injection** - Service registrations for DI container
