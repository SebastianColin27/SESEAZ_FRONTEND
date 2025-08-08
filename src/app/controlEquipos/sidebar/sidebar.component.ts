import { Component, Input } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../auth/login.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})


export class SidebarComponent {
  
collapsed = true;

  modules = [
    {
      title: 'Dashboard',
      icon: 'bi bi-house',
      routerLink: '/dashboard',
      color: '#4e73df'
    },
    {
      title: 'Personal',
      icon: 'bi bi-people',
      routerLink: '/personal',
      color: '#4e73df'
    },
    {
      title: 'Licencias',
      icon: 'bi bi-card-checklist',
      routerLink: '/licencias',
      color: '#1cc88a'
    },
    {
      title: 'Equipos',
      icon: 'bi bi-laptop',
      routerLink: '/equipos',
      color: '#36b9cc'
    },
    {
      title: 'Asignaciones',
      icon: 'bi bi-arrow-left-right',
      routerLink: '/asignaciones',
      color: '#f6c23e'
    },
    {
      title: 'Mantenimientos',
      icon: 'bi bi-tools',
      routerLink: '/mantenimientos',
      color: '#e74a3b'
    }
  ];

   isAdmin: boolean = false;
  
    constructor(private loginService: LoginService, private router: Router) { }
  
  
    ngOnInit(): void {
     
      this.checkIfAdmin();
    }
  
    
    checkIfAdmin(): void {
      this.loginService.userRole$.subscribe((role) => {
        if (role.includes('ADMIN')) {
          this.isAdmin = true;
          this.addRegisterModule(); 
        } else {
          this.isAdmin = false;
        }
      });
    }
  
    // Agrega el módulo de "Registrar Usuario" si es admin
    addRegisterModule(): void {
      this.modules.push({
        title: 'Registrar Usuario', 
        icon: 'bi bi-person-plus',
        color: '#858796',
        routerLink: '/register'
      });
    }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
  }
}
