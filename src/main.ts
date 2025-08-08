import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig, appConfigProviders } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';
import { environment } from './environments/environment'; 

import { JwtInterceptor } from './app/auth/jwt.interceptor'; 
import { HTTP_INTERCEPTORS } from '@angular/common/http';


export function tokenGetter() {
  
  return sessionStorage.getItem("token");
}

bootstrapApplication(AppComponent, {
  
  ...appConfig,
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    {
      provide: JWT_OPTIONS,
      useValue: {
        tokenGetter: tokenGetter,
        
      }
    },
    JwtHelperService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    ...appConfigProviders
  ]
})
  .then(() => console.log('Application started'))
  .catch((err) => console.error(err));