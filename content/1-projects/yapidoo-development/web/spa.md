Here’s a step-by-step guide to implement an Angular SPA that uses Yapidoo.Service.Auth as an OpenIdDict service:

### 1. Install Angular CLI and Create the App

```powershell
npm install -g @angular/cli
ng new yapidoo-spa --routing --style=scss
cd yapidoo-spa
```

### 2. Install Required Packages

- For OpenID Connect authentication, use `@auth0/angular-jwt` and `angular-oauth2-oidc`:

```powershell
npm install angular-oauth2-oidc @auth0/angular-jwt
```

### 3. Configure OAuth2 in Angular

- In `app.module.ts`, import and configure `OAuthModule`:

```typescript
import { OAuthModule } from 'angular-oauth2-oidc';

@NgModule({
  imports: [
    // ...existing code...
    OAuthModule.forRoot()
  ],
  // ...existing code...
})
export class AppModule { }
```

### 4. Set Up OpenIdDict Configuration

- In `app.component.ts` or a dedicated `auth.service.ts`, configure the OAuthService:

```typescript
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';

const authConfig: AuthConfig = {
  issuer: 'https://<Yapidoo.Service.Auth-URL>',
  redirectUri: window.location.origin,
  clientId: '<client_id>',
  responseType: 'code',
  scope: 'openid profile email',
  requireHttps: true,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private oauthService: OAuthService) {
    this.oauthService.configure(authConfig);
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }
}
```

### 5. Protect Routes

- Use Angular route guards to protect routes:

```typescript
import { CanActivate } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private oauthService: OAuthService) {}
  canActivate(): boolean {
    return this.oauthService.hasValidAccessToken();
  }
}
```

- Add the guard to your routes in `app-routing.module.ts`.

### 6. Add Login/Logout Buttons

- In your components, use `OAuthService` methods:

```typescript
login() {
  this.oauthService.initLoginFlow();
}
logout() {
  this.oauthService.logOut();
}
```

### 7. Test Authentication Flow

- Run the app:

```powershell
ng serve
```

- Open in browser and test login/logout.

---

**Summary of Packages:**
- `angular-oauth2-oidc` (main OpenID Connect integration)
- `@auth0/angular-jwt` (optional, for JWT handling)

**Other Steps:**
- Register your SPA client in Yapidoo.Service.Auth/OpenIdDict.
- Set up CORS in Yapidoo.Service.Auth for your SPA’s URL.
- Use HTTPS in production.

Let me know if you need code samples for specific files or further details!
