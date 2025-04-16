import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dash-board.component.html',
  styleUrl: './dash-board.component.css'
})
export class DashboardComponent {
  modules = [
    {
      title: 'Personal',
      description: 'Gestión de personal',
      icon: 'bi bi-people',
      routerLink: '/personal',
      color: '#4e73df'
    },
    {
      title: 'Licencias',
      description: 'Control de licencias',
      icon: 'bi bi-card-checklist',
      routerLink: '/licencias',
      color: '#1cc88a'
    },
    {
      title: 'Equipos',
      description: 'Inventario de equipos',
      icon: 'bi bi-laptop',
      routerLink: '/equipos',
      color: '#36b9cc'
    },
    {
      title: 'Asignaciones',
      description: 'Gestión de asignaciones de equipos',
      icon: 'bi bi-arrow-left-right',
      routerLink: '/asignaciones',
      color: '#f6c23e'
    },
    {
      title: 'Mantenimientos',
      description: 'Registro de mantenimientos',
      icon: 'bi bi-tools',
      routerLink: '/mantenimientos',
      color: '#e74a3b'
    },
  

  ];
  isAdmin: boolean = false;

constructor(private loginService: LoginService, private router: Router) {}


ngOnInit(): void {
  this.checkIfAdmin();
}

// Verifica si el usuario tiene el rol de admin
checkIfAdmin(): void {
  this.loginService.userRole$.subscribe((role) => {
    if (role.includes('ADMIN')) {
      this.isAdmin = true;
      this.addRegisterModule(); // Agrega la opción de "Registrar Usuario" si es admin
    } else {
      this.isAdmin = false;
    }
  });
}

// Agrega el módulo de "Registrar Usuario" si es admin
addRegisterModule(): void {
  this.modules.push({
    title: 'Registrar Usuario',
    description: 'Crea un nuevo perfil',
    icon: 'bi bi-person-plus',
    color: '#858796',
    routerLink: '/register'
  });
}

// Método para cerrar sesión
cerrarSesion(): void {
  this.loginService.logout(); // Llama al método de logout de tu servicio
  this.router.navigate(['/login']); // Redirige al login después del logout
}
}
