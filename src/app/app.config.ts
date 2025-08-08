import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Provider } from '@angular/core'; 


import { routes } from './app.routes';
export const FECHA_HOY = new Date().toISOString().slice(0, 10);
export const appConfigProviders: Provider[] = [
  { provide: 'FECHA_HOY', useValue: FECHA_HOY }
];
export  const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(CommonModule), 
    provideRouter(routes),
    provideHttpClient()
  ]
};

