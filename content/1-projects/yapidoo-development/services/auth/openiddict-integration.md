# OpenIddict Integration Guide

This note explains how to integrate OpenIddict into the Yapidoo Auth Service, with context, recommended architecture, and actionable code snippets for .NET 9 + ASP.NET Core Identity + EF Core.

[Index](index.md)

---

## References

- [OpenIdDict Documentation](https://documentation.openiddict.com/)
- [Samples](https://github.com/openiddict/openiddict-samples)

## Context & Goals

- Provide a standards-compliant OIDC/OAuth2 authorization server for first‑party clients (SPA, mobile) and machine clients (M2M).
- Support Authorization Code + PKCE, Refresh Tokens, and Client Credentials flows.
- Use ASP.NET Core Identity for user management and EF Core for persistence.
- Publish JWKS for inter-service JWT validation.

---

## Required packages

- OpenIddict.AspNetCore
- OpenIddict.EntityFrameworkCore
- OpenIddict.Validation.AspNetCore (resource APIs)
- Microsoft.AspNetCore.Authentication.JwtBearer (optional for resource APIs)
- Microsoft.AspNetCore.Identity.EntityFrameworkCore
- Npgsql.EntityFrameworkCore.PostgreSQL or Microsoft.EntityFrameworkCore.SqlServer

Install via NuGet or Directory.Packages.props.

---

## Data model & DbContext

- Keep Identity entities (ApplicationUser : IdentityUser<Guid>) and OpenIddict schema in the same DbContext (AuthDbContext) to simplify migrations and transactions.

Sample DbContext registration (Program.cs):

```csharp

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .UseOpenIddict());

builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AuthDbContext>()
    .AddDefaultTokenProviders();

```

Notes:
- Call `.UseOpenIddict()` on options to let EF model include OpenIddict tables.

---

## OpenIddict server configuration (core parts)

Register OpenIddict in DI and configure core/server/auth flows:

```csharp
public async Task Main(string[] args)
{
  builder.Services.AddOpenIddict()
      .AddCore(options =>
      {
          options.UseEntityFrameworkCore()
                .UseDbContext<AuthDbContext>();
      })
      .AddServer(options =>
      {
          options.SetTokenEndpointUris("/connect/token")
                .SetAuthorizationEndpointUris("/connect/authorize")
                .SetUserinfoEndpointUris("/connect/userinfo");

          options.AllowAuthorizationCodeFlow().RequireProofKeyForCodeExchange();
          options.AllowRefreshTokenFlow();
          options.AllowClientCredentialsFlow();

          options.RegisterScopes("openid", "profile", "email", "yapidoo.api", "users.read", "users.write");

          // Use ASP.NET Core integration
          options.UseAspNetCore()
                .EnableTokenEndpointPassthrough()
                .EnableAuthorizationEndpointPassthrough()
                .EnableUserinfoEndpointPassthrough();

          // Signing/encryption keys - dev ephemeral by default
          options.AddDevelopmentEncryptionCertificate()
                .AddDevelopmentSigningCertificate();
      })
      .AddValidation(options =>
      {
          options.UseLocalServer();
          options.UseAspNetCore();
    });
}
```

Production keys:
- Replace dev certificates with an RSA or X.509 certificate from KeyVault/SecretManager.
- Configure OpenIddict to load the certificate via AddSigningCertificate/FromCertificate.
- Ensure JWKS is discoverable at `/.well-known/jwks.json`. OpenIddict exposes it automatically.

---

## Seeding clients and scopes

Seed initial clients via a hosted service or startup task using `OpenIddictApplicationManager`:

```csharp
async Task SeedAsync(IServiceProvider sp) {
  using var scope = sp.CreateScope();
  var mgr = scope.ServiceProvider.GetRequiredService<OpenIddictApplicationManager<OpenIddictEntityFrameworkCoreApplication>>();

  if (!await mgr.FindByClientIdAsync("yapidoo-spa") is object) {
    await mgr.CreateAsync(new OpenIddictApplicationDescriptor {
      ClientId = "yapidoo-spa",
      DisplayName = "Yapidoo SPA",
      RedirectUris = { new Uri("http://localhost:4200/auth/callback") },
      Permissions = {
        OpenIddictConstants.Permissions.Endpoints.Authorization,
        OpenIddictConstants.Permissions.Endpoints.Token,
        OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
        OpenIddictConstants.Permissions.ResponseTypes.Code
      }
    });
  }
}
```

Also seed M2M client (`yapidoo-m2m`) with Client Credentials grant and appropriate scopes.

---

## Migrations & DB

- Add migrations for `AuthDbContext` and update DB:

```ps1
dotnet ef migrations add Init -p Yapidoo.Service.Auth.Data -s Yapidoo.Service.Auth.Api
dotnet ef database update -p Yapidoo.Service.Auth.Data -s Yapidoo.Service.Auth.Api
```

- Verify OpenIddict tables (Applications, Authorizations, Tokens, Scopes) are created.

---

## External Identity Providers

Configure external IdPs (Google, Microsoft):

```csharp
builder.Services.AddAuthentication()
    .AddGoogle(options => {
       options.ClientId = config["ExternalProviders:Google:ClientId"];
       options.ClientSecret = config["ExternalProviders:Google:ClientSecret"];
       options.SignInScheme = IdentityConstants.ExternalScheme;
    });
```

On external callback, map external login to local `ApplicationUser` and continue OIDC flow (issue tokens / create local account and sign-in).

---

## Testing the server

Client credentials (curl):

```bash
curl -X POST https://auth.local/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=yapidoo-m2m&client_secret=SECRET&scope=yapidoo.api"
```

Authorization code (manual):
- Browser: GET /connect/authorize?client_id=yapidoo-spa&response_type=code&scope=openid%20profile&redirect_uri=...
- Complete login, receive code, exchange for token at /connect/token with code+PKCE verifier.

---

## Operational notes & security

- Enforce HTTPS in all environments.
- Use short access token TTLs and rotating refresh tokens.
- Consider reference tokens + introspection for immediate revocation.
- Rate-limit `/connect/token` and monitor failed attempts.
- Store signing keys in KMS/KeyVault; enable key rotation and ensure JWKS reflects current keys.
- Lock down allowed redirect URIs and CORS origins per environment.
- Audit and log important auth events (token issuance, failed logins, client creation).

---

## Integration with resource APIs

- Resource APIs should validate tokens using JWKS; prefer offline validation using cached keys.
- Use OpenIddict.Validation or JwtBearer with `MetadataAddress` pointing to `https://auth/.well-known/openid-configuration`.

---

*Last updated: 2025-08-16*
