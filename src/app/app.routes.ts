import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from '../app/controlEquipos/dash-board/dash-board.component';
import { LoginComponent } from '../app/login/login.component';   
import { authGuard } from './auth/guards/auth.guard';


export const routes: Routes = [
  { path: '', component: LoginComponent }, // Asegurar que el dashboard sea una ruta válida
  { path: 'personal', loadComponent: () => import('../app/controlEquipos/personal-list/personal-list.component').then(m => m.PersonalListComponent) , canActivate: [authGuard] },
  { path: 'licencias', loadComponent: () => import('../app/controlEquipos/licencia-list/licencia-list.component').then(m => m.LicenciaListComponent), canActivate: [authGuard]  },
  { path: 'equipos', loadComponent: () => import('../app/controlEquipos/equipo-list/equipo-list.component').then(m => m.EquipoListComponent), canActivate: [authGuard]  },
  { path: 'asignaciones', loadComponent: () => import('../app/controlEquipos/asignacion-list/asignacion-list.component').then(m => m.AsignacionComponent), canActivate: [authGuard]  },
  { path: 'mantenimientos', loadComponent: () => import('../app/controlEquipos/mantenimiento-list/mantenimiento-list.component').then(m => m.MantenimientoListComponent),  canActivate: [authGuard]  },
  {path: 'register', loadComponent: () => import('../app/register/register.component').then(m => m.RegisterComponent), canActivate: [authGuard]  },
  {path: 'login', loadComponent: () => import('../app/login/login.component').then(m => m.LoginComponent) },
  {path: 'dashboard', loadComponent: () => import('../app/controlEquipos/dash-board/dash-board.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }