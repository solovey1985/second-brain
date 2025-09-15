# Copilot Instructions: .NET 9 Telegram Bot MVP (English)

## Project Overview
Build a Telegram bot for English learning using .NET 9. The MVP includes onboarding, lessons, and quizzes.

---

## 1. Preparation
- Register your bot with BotFather and get `BOT_TOKEN`.
- Choose a domain or use ngrok/cloudflared for local development (HTTPS URL required).
- Set a `WEBHOOK_SECRET` for webhook security.

---

## 2. Solution and Project Setup
- Create solution and projects:
  ```bash
  md EnglishBot && cd EnglishBot
  dotnet new sln -n EnglishBot
  dotnet new web -n EnglishBot.Api
  dotnet new classlib -n EnglishBot.Domain
  dotnet new classlib -n EnglishBot.Application
  dotnet new classlib -n EnglishBot.Infrastructure
  dotnet sln add **/*.csproj
  dotnet add EnglishBot.Api/EnglishBot.Api.csproj reference EnglishBot.Application/EnglishBot.Application.csproj EnglishBot.Infrastructure/EnglishBot.Infrastructure.csproj EnglishBot.Domain/EnglishBot.Domain.csproj
  dotnet add EnglishBot.Application/EnglishBot.Application.csproj reference EnglishBot.Domain/EnglishBot.Domain.csproj EnglishBot.Infrastructure/EnglishBot.Infrastructure.csproj
  dotnet add EnglishBot.Infrastructure/EnglishBot.Infrastructure.csproj reference EnglishBot.Domain/EnglishBot.Domain.csproj
  ```
- Install packages:
  ```bash
  # API
  dotnet add EnglishBot.Api package Telegram.Bot
  dotnet add EnglishBot.Api package Serilog.AspNetCore
  dotnet add EnglishBot.Api package Microsoft.Extensions.Http.Polly
  # Infrastructure / EF Core (PostgreSQL)
  dotnet add EnglishBot.Infrastructure package Microsoft.EntityFrameworkCore
  dotnet add EnglishBot.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
  dotnet add EnglishBot.Infrastructure package Microsoft.EntityFrameworkCore.Design
  # (Optional) Validation
  dotnet add EnglishBot.Application package FluentValidation
  ```

---

## 3. Configuration
- Update `EnglishBot.Api/appsettings.json`:
  - Add your bot token, webhook secret, public base URL, and PostgreSQL connection string.

---

## 4. Data Model
- Define entities: `BotUser`, `UserState`, `QuizItem`, `UserQuizResult` in `EnglishBot.Domain`.
- Configure EF Core context in `EnglishBot.Infrastructure/BotDb.cs`.
- Add seeding logic in `EnglishBot.Infrastructure/Seed.cs` for initial quiz questions.

---

## 5. Scenes and Scene Manager
- Implement scene interface and manager in `EnglishBot.Application.Scenes`.
- Create scenes: `IdleScene`, `OnboardingScene`, `LessonScene`.

---

## 6. Program.cs (API, DI, Webhook)
- Configure services and DI in `EnglishBot.Api/Program.cs`.
- Use PostgreSQL with EF Core.
- Set up webhook endpoint and health check.

---

## 7. Migrations and Running
- Create and apply migrations:
  ```bash
  dotnet tool install --global dotnet-ef
  dotnet ef migrations add Init --project EnglishBot.Infrastructure --startup-project EnglishBot.Api
  dotnet ef database update --project EnglishBot.Infrastructure --startup-project EnglishBot.Api
  dotnet run --project EnglishBot.Api
  ```
- For local development, use ngrok/cloudflared and update `PublicBaseUrl`.

---

## 8. Manual MVP Testing
- Send `/start` to the bot, select level (A1/A2), bot confirms.
- Send `/lesson`, bot sends intro and first quiz question.
- Answer all 3 quizzes, see score summary.

---

## 9. Next Steps
- Add word list scene (SRS), import content from CSV/Google Sheets, implement `/stats`, add environment sections, Docker support.

---

## Production Notes
- Store secrets securely (User Secrets/KeyVault).
- Use Serilog for logging.
- Validate webhook secret header.
- Ensure idempotency for updates.

---

Ready: Instructions and code skeleton for a .NET 9 Telegram bot MVP.
