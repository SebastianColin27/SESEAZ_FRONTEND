import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent implements OnInit {
  
  ngOnInit(): void {
    console.error(' Error 404: Ruta no encontrada');
  }

  constructor(private router: Router) {}

 
 // Método para redirigir al Dashboard
  irAlDashboard(): void {
    this.router.navigate(['/dashboard']); 
  }
}
