// app.component.ts (CORREGIDO)
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// QUITA HttpClientModule si ya lo provees en main.ts (provideHttpClient)
// import { HttpClientModule } from '@angular/common/http';
import { PersonalListComponent } from "./controlEquipos/personal-list/personal-list.component";
import { EquipoListComponent } from "./controlEquipos/equipo-list/equipo-list.component";
import { LicenciaListComponent } from "./controlEquipos/licencia-list/licencia-list.component";
import { AsignacionComponent } from "./controlEquipos/asignacion-list/asignacion-list.component";
import { MantenimientoListComponent } from "./controlEquipos/mantenimiento-list/mantenimiento-list.component";
import { DashboardComponent } from './controlEquipos/dash-board/dash-board.component';
// QUITA JwtModule de aquí
// import { JwtModule } from "@auth0/angular-jwt";

@Component({
  selector: 'app-root',
  standalone: true,
  // QUITA JwtModule y HttpClientModule de imports si se proveen en main.ts
  imports: [RouterOutlet, DashboardComponent, PersonalListComponent, EquipoListComponent, LicenciaListComponent, AsignacionComponent, MantenimientoListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Control de Equipos - SESEAZ';
}