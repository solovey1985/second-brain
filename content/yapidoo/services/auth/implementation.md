Awesome — let’s wire up **OpenIddict** in your **Auth** microservice on **.NET 8** with **ASP.NET Core Identity + EF Core**, using the **Authorization Code + PKCE** flow for the Angular SPA, plus a **Client Credentials** client for service-to-service calls.

I’ll keep it tight and copy-pasteable.

---

# 0) Project shape (suggested)

```
AuthService/
  src/
    Auth.Api/             // ASP.NET Core Web API (hosts OpenIddict server endpoints)
    Auth.Infrastructure/   // EF Core, Identity stores, migrations
    Auth.Domain/           // (optional) domain models
  docker/
  build/
```

---

# 1) NuGet packages

In `Auth.Api` (web) and `Auth.Infrastructure` (data):

```bash
dotnet add src/Auth.Api package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add src/Auth.Api package Microsoft.EntityFrameworkCore
dotnet add src/Auth.Api package Microsoft.EntityFrameworkCore.Design
dotnet add src/Auth.Api package Npgsql.EntityFrameworkCore.PostgreSQL   # or SqlServer

# OpenIddict core bits
dotnet add src/Auth.Api package OpenIddict.AspNetCore
dotnet add src/Auth.Api package OpenIddict.Server.AspNetCore
dotnet add src/Auth.Api package OpenIddict.Validation.AspNetCore
dotnet add src/Auth.Api package OpenIddict.EntityFrameworkCore

# (Optional) external providers later
dotnet add src/Auth.Api package Microsoft.AspNetCore.Authentication.Google
dotnet add src/Auth.Api package Microsoft.AspNetCore.Authentication.Facebook
```

---

# 2 Identity + EF Core DbContext

In `Auth.Infrastructure/AuthDbContext.cs`:

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OpenIddict.EntityFrameworkCore.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    // add profile linkage fields if needed (not business profile)
}

public class ApplicationRole : IdentityRole<Guid> { }

// OpenIddict EF models: you can use the default ones (recommended)
public class AuthDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) {}

    // OpenIddict entities (don’t declare DbSet<T> unless you need; OpenIddict will register them)
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.UseOpenIddict();
    }
}
```

---

# 3 Program.cs – services

```csharp
var builder = WebApplication.CreateBuilder(args);

var services = builder.Services;
var config   = builder.Configuration;

// 3.1 EF Core
services.AddDbContext<AuthDbContext>(opt =>
{
    opt.UseNpgsql(config.GetConnectionString("AuthDb")); // or UseSqlServer
    // OpenIddict needs relational features
    opt.UseOpenIddict();
});

// 3.2 Identity
services
    .AddIdentityCore<ApplicationUser>(o =>
    {
        o.Password.RequireDigit = false;
        o.Password.RequireNonAlphanumeric = false;
        o.Password.RequireUppercase = false;
        o.Password.RequiredLength = 6;
        o.User.RequireUniqueEmail = true;
        o.SignIn.RequireConfirmedEmail = false; // enable later in prod
    })
    .AddRoles<ApplicationRole>()
    .AddEntityFrameworkStores<AuthDbContext>()
    .AddSignInManager();

// 3.3 Authentication (cookies for interactive login, bearer for APIs)
services.AddAuthentication()
    .AddCookie(IdentityConstants.ApplicationScheme);

services.AddAuthorization();

// 3.4 OpenIddict
services.AddOpenIddict()
    .AddCore(opt =>
    {
        opt.UseEntityFrameworkCore()
           .UseDbContext<AuthDbContext>();
    })
    .AddServer(opt =>
    {
        // Endpoints exposed by your Auth service
        opt.SetAuthorizationEndpointUris("/connect/authorize")
           .SetTokenEndpointUris("/connect/token")
           .SetUserinfoEndpointUris("/connect/userinfo")
           .SetIntrospectionEndpointUris("/connect/introspect")
           .SetLogoutEndpointUris("/connect/logout");

        // Flows
        opt.AllowAuthorizationCodeFlow()     // SPA/mobile (with PKCE)
           .RequireProofKeyForCodeExchange()
           .AllowRefreshTokenFlow()
           .AllowClientCredentialsFlow();    // M2M

        // Scopes (adjust to your domains)
        opt.RegisterScopes("openid", "profile", "email", "yapidoo.api");

        // Token formats & signing
        opt.AddEphemeralEncryptionKey()
           .AddEphemeralSigningKey(); // for dev only; replace with persisted keys/cert in prod

        // ASP.NET Core host integration
        opt.UseAspNetCore()
           .EnableAuthorizationEndpointPassthrough()
           .EnableTokenEndpointPassthrough()
           .EnableUserinfoEndpointPassthrough()
           .EnableLogoutEndpointPassthrough();

        // Access token as JWT
        opt.DisableAccessTokenEncryption();
    })
    .AddValidation(opt =>
    {
        // Local validation: the same app that issues tokens also validates
        opt.UseLocalServer();
        opt.UseAspNetCore();
    });

// CORS for SPA
services.AddCors(opt =>
{
    opt.AddPolicy("spa", p => p
        .WithOrigins(config["Spa:Origin"] ?? "http://localhost:4200")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

services.AddControllers();

var app = builder.Build();
app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

> **Prod keys**: replace `.AddEphemeral*()` with X.509 certificate or a persisted RSA key. Store via KMS/KeyVault/Secret Manager and mount to the pod.

---

# 4 Database & migrations

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitAuth -p src/Auth.Api -s src/Auth.Api
dotnet ef database update -p src/Auth.Api -s src/Auth.Api
```

This creates tables for ASP.NET Identity **and** OpenIddict (applications/authorizations/tokens/scopes).

---

# 5 Seed OpenIddict clients (SPA + M2M)

Create a startup seed (e.g., `OpenIddictSeeder.cs`) and call it once on boot.

```csharp
using OpenIddict.Abstractions;
using static OpenIddict.Abstractions.OpenIddictConstants;

public static class OpenIddictSeeder
{
    public static async Task SeedAsync(IServiceProvider sp, IConfiguration config)
    {
        using var scope = sp.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();
        var scopeMgr = scope.ServiceProvider.GetRequiredService<IOpenIddictScopeManager>();

        var spaOrigin = config["Spa:Origin"] ?? "http://localhost:4200";
        var spaRedirect = $"{spaOrigin}/auth/callback";
        var spaLogout   = $"{spaOrigin}/auth/logout-callback";

        // 5.1 SPA public client (PKCE)
        if (await manager.FindByClientIdAsync("yapidoo-spa") is null)
        {
            await manager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = "yapidoo-spa",
                ConsentType = ConsentTypes.Explicit, // or External if only first-party
                DisplayName = "Yapidoo Angular SPA",
                Type = ClientTypes.Public, // no client secret for browser apps
                RedirectUris =
                {
                    new Uri(spaRedirect)
                },
                PostLogoutRedirectUris =
                {
                    new Uri(spaLogout)
                },
                Permissions =
                {
                    // endpoints
                    Permissions.Endpoints.Authorization,
                    Permissions.Endpoints.Token,
                    Permissions.Endpoints.Logout,
                    Permissions.Endpoints.Userinfo,

                    // grant types
                    Permissions.GrantTypes.AuthorizationCode,
                    Permissions.GrantTypes.RefreshToken,

                    // response types
                    Permissions.ResponseTypes.Code,

                    // scopes
                    Permissions.Scopes.OpenId,
                    Permissions.Scopes.Profile,
                    Permissions.Scopes.Email,
                    "yapidoo.api"
                },
                Requirements =
                {
                    Requirements.Features.ProofKeyForCodeExchange
                }
            });
        }

        // 5.2 Machine-to-machine client (service to service)
        if (await manager.FindByClientIdAsync("yapidoo-m2m") is null)
        {
            await manager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = "yapidoo-m2m",
                ClientSecret = "super-secret-change-me", // store securely
                DisplayName = "Yapidoo Backend Client",
                Permissions =
                {
                    Permissions.Endpoints.Token,
                    Permissions.GrantTypes.ClientCredentials,
                    "yapidoo.api"
                }
            });
        }

        // 5.3 Scopes
        if (await scopeMgr.FindByNameAsync("yapidoo.api") is null)
        {
            await scopeMgr.CreateAsync(new OpenIddictScopeDescriptor
            {
                Name = "yapidoo.api",
                DisplayName = "Access to Yapidoo APIs"
            });
        }
    }
}
```

Call it in `Program.cs` after `app = builder.Build()`:

```csharp
await OpenIddictSeeder.SeedAsync(app.Services, app.Configuration);
```

---

# 6 Minimal auth UI/API for interactive sign-in

For **authorization code** you need a user session. Easiest is a tiny Razor Pages area or controller to show a login form and sign the user into the cookie scheme. Example controller:

```csharp
[Route("account")]
public class AccountController : Controller
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;

    public AccountController(SignInManager<ApplicationUser> s, UserManager<ApplicationUser> u)
    {
        _signInManager = s; _userManager = u;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new ApplicationUser { UserName = dto.Email, Email = dto.Email };
        var res = await _userManager.CreateAsync(user, dto.Password);
        if (!res.Succeeded) return BadRequest(res.Errors);

        // Optional: emit UserRegistered event for Users service here

        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user is null) return Unauthorized();

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (!result.Succeeded) return Unauthorized();

        // create auth cookie session for interactive flows
        await _signInManager.SignInAsync(user, isPersistent: false);
        return Ok();
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok();
    }
}

public record RegisterDto(string Email, string Password);
public record LoginDto(string Email, string Password);
```

> For production UX, you’ll typically show a login form, then redirect back to `/connect/authorize` with the original parameters. During development you can: (1) call `/account/login` to establish the cookie session, then (2) start the OIDC authorize flow from the SPA.

---

# 7 Angular SPA (Auth Code + PKCE) quick notes

* Use an OIDC client (e.g., `angular-auth-oidc-client` or `oidc-client-ts`).
* Configure:

  * `authority` → `https://auth.<your-domain>` (your Auth service)
  * `client_id` → `yapidoo-spa`
  * `response_type` → `code`
  * `scope` → `openid profile email yapidoo.api`
  * `redirect_uri` → `http://localhost:4200/auth/callback`
  * `post_logout_redirect_uri` → `http://localhost:4200/auth/logout-callback`
  * Enable **PKCE** (default in modern libs).

The SPA obtains an access token and calls your resource APIs (Users, Events) with `Authorization: Bearer <token>`.

---

# 8 Resource APIs (Users, Events) token validation

In each API (e.g., Users service):

```csharp
services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", o =>
    {
        o.Authority = builder.Configuration["Auth:Authority"]; // https://auth.<domain>
        o.TokenValidationParameters.ValidAudience = "yapidoo.api"; // or use audience validation mapping
        o.RequireHttpsMetadata = true;
    });

services.AddAuthorization();
app.UseAuthentication();
app.UseAuthorization();
```

Expose audience/scope checks with policies if you like.

---

# 9 Local testing (quick)

**Auth code (SPA):**

1. Run Auth service and Angular app.
2. Hit SPA → login form → you post to `/account/login` → SPA triggers OIDC authorize → consent/page → token arrives on callback.

**Client credentials (M2M):**

```bash
curl -X POST https://auth.local/connect/token \
 -H "Content-Type: application/x-www-form-urlencoded" \
 -d "grant_type=client_credentials&client_id=yapidoo-m2m&client_secret=super-secret-change-me&scope=yapidoo.api"
```

---

# 10 Production hardening checklist

* Replace ephemeral keys with **persisted RSA/X.509**, enable **automatic rotation**.
* Turn on **email confirmation**, **2FA** (optional), **lockout** policies.
* Enforce **short-lived access tokens** (e.g., 5–15 min) and **refresh rotation**.
* Lock down **CORS** and **redirect URIs** to known hosts.
* Add **/connect/.well-known/openid-configuration** (OpenIddict publishes discovery automatically).
* Centralized logging of auth events; rate-limit `/connect/token`.

---

# 11 Optional extras (when ready)

* External providers (Google/Facebook): add `.AddAuthentication().AddGoogle(...).AddFacebook(...)` and map external sign-in to Identity user; then rely on standard OIDC flow for tokens.
* Reference tokens + **/connect/introspect** if you need instant revocation at API gateway.
* Emit **domain events** to Users service on registration/deletion (`UserRegistered`, `UserDeleted`).
* JWKS caching at the API gateway.

---

## TL;DR

1. Add **Identity + EF + OpenIddict** as above.
2. **Seed clients**: `yapidoo-spa` (public+PKCE), `yapidoo-m2m` (secret).
3. Provide a **minimal login endpoint** to create a cookie session for interactive code flow.
4. Configure **Angular OIDC client**.
5. Configure **resource APIs** to validate JWT via your Auth authority.

If you want, I can drop in a tiny sample repo layout (solution files + ready Program.cs, DbContext, seeder, and a Postman collection) for your exact stack (Postgres/GKE).
