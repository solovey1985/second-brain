Angular SPA plan (Angular 17–20, standalone by default) using Yapidoo.Service.Auth (OpenIddict) with OIDC login/logout.

### 1) Create the app (standalone)

```powershell
npm install -g @angular/cli
ng new yapidoo-spa --routing --style=scss --standalone
cd yapidoo-spa
```

> Angular 20 removes implicit NgModule registration. Use `bootstrapApplication` with providers instead of `AppModule`.

### 2) Install auth deps

```powershell
npm install angular-oauth2-oidc @auth0/angular-jwt
```

### 3) Auth config (OIDC server details)

Create `src/app/auth.config.ts`:

```typescript
import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://<Yapidoo.Service.Auth-URL>',
  clientId: '<client_id>',
  responseType: 'code',
  scope: 'openid profile email api',
  redirectUri: window.location.origin + '/index.html',
  postLogoutRedirectUri: window.location.origin + '/index.html',
  showDebugInformation: false,
  requireHttps: true,
  useSilentRefresh: true,
  silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
  strictDiscoveryDocumentValidation: true,
};
```

Add `public/silent-refresh.html` as a blank page that runs the OAuth silent refresh script (see library docs).

### 4) Bootstrap providers (no AppModule)

In `src/main.ts` register Angular and OAuth providers explicitly:

```typescript
import { bootstrapApplication, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { OAuthModule, provideOAuthClient } from 'angular-oauth2-oidc';
import { authConfig } from './app/auth.config';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(
      OAuthModule.forRoot({
        resourceServer: {
          allowedUrls: ['https://api.yapidoo.local'],
          sendAccessToken: true,
        },
      })
    ),
    provideOAuthClient({ config: authConfig }),
  ],
}).catch(err => console.error(err));
```

### 5) Auth service (login/logout wiring)

`src/app/auth.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private oauth: OAuthService) {}

  async init(): Promise<void> {
    this.oauth.configure(authConfig);
    await this.oauth.loadDiscoveryDocument();
    await this.oauth.tryLoginCodeFlow();
    this.oauth.setupAutomaticSilentRefresh();
  }

  login(): void {
    this.oauth.initCodeFlow();
  }

  logout(): void {
    this.oauth.logOut();
  }

  isAuthenticated(): boolean {
    return this.oauth.hasValidAccessToken();
  }
}
```

Call `authService.init()` during app startup (e.g., in `AppComponent` constructor or via an `APP_INITIALIZER`).

### 6) Route protection without NgModules

Use a standalone `CanMatch` guard:

```typescript
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  auth.login();
  return false;
};
```

Attach to protected routes in `app.routes.ts`:

```typescript
export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  {
    path: 'secure',
    canMatch: [authGuard],
    loadComponent: () => import('./secure/secure.component').then(m => m.SecureComponent),
  },
];
```

### 7) UI hooks for login/logout

In a header component:

```typescript
import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <button (click)="auth.login()">Login</button>
    <button (click)="auth.logout()" *ngIf="auth.isAuthenticated()">Logout</button>
  `,
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}
}
```

### 8) OIDC server setup checklist

- Register SPA client in Yapidoo.Service.Auth/OpenIddict with `redirectUri` and `postLogoutRedirectUri` above.
- Enable CORS for SPA origin.
- Allow PKCE (authorization code with proof key) and refresh tokens if needed.
- Publish discovery document at `/.well-known/openid-configuration`.

### 9) Quick test

```powershell
ng serve --open
```

Log in, verify token presence (network tab), hit a protected API with the bearer token, then log out and ensure the SPA returns to public state.
