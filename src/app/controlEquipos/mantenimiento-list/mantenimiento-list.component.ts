import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MantenimientoService } from '../../services/mantenimiento.service';
import { AsignacionService } from '../../services/asignacion.service';
import { Mantenimiento } from '../../models/mantenimiento';
import { Asignacion } from '../../models/asignacion';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginService } from '../../auth/login.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-mantenimiento-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './mantenimiento-list.component.html',
  styleUrl: './mantenimiento-list.component.css',
})
export class MantenimientoListComponent implements OnInit {
  
  protected Array = Array;
  
  asignaciones: Asignacion[] = []; 
  asignacionList: Asignacion[] = []; 
  searchEquipo: string = '';
  mantenimientos: Mantenimiento[] = [];
  selectedMantenimiento: Mantenimiento | null = null;
  isModalVisible = false;
  isEditMode = false;
  ordenDescendente: boolean = true;

  mensajeExito: string = '';
  mensajeError: string = '';
  isConfirmDeleteVisible: boolean = false;
  idParaEliminar: string | null = null;

  constructor(
    private mantenimientoService: MantenimientoService,
    private asignacionService: AsignacionService,
    private loginService: LoginService, public authService: AuthService,
        private router: Router,
        private pdfService: PdfService
  ) {}


  get isAdmin(): boolean {
    return this.authService.hasRole('ROLE_ADMIN');
  }
  
  get isAdminOrModerador(): boolean {
    return this.authService.hasRole('ROLE_ADMIN') || this.authService.hasRole('ROLE_MODERADOR');
  }
  
  get isLector(): boolean {
    return this.authService.hasRole('ROLE_LECTOR');
  }




  ngOnInit(): void {
    this.cargarMantenimientos();
    this.cargarAsignaciones();
  }

  cargarAsignaciones(): void {
    this.asignacionService.obtenerTodasLasAsignaciones().subscribe(
      (data) => {
        this.asignacionList = data;
        this.asignaciones = data; 
      },
      (error) => console.error('Error al cargar asignaciones:', error)
    );
  }

  buscarPorEquipo(): void {
    if (this.searchEquipo.trim() !== '') {
      // Opcional: Añadir un indicador de carga
      // this.isLoading = true;
      
      this.mantenimientoService.getMantenimientosByEquipo(this.searchEquipo).subscribe({
        next: (data: Mantenimiento[]) => {
          this.mantenimientos = data;
          console.log('Resultados encontrados:', data.length);
          // this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al buscar mantenimientos por equipo:', error);
          
          alert('Error al buscar. Por favor intente nuevamente.');
          // this.isLoading = false;
        }
      });
    } else {
      this.cargarMantenimientos();
    }
  }

  cargarMantenimientos(): void {
    this.mantenimientoService.getMantenimientos().subscribe(
      (data: Mantenimiento[]) => {
        this.mantenimientos = data;
        console.log('Lista de mantenimientos cargada:', this.mantenimientos);
      },
      (error) => {
        console.error('Error cargando mantenimientos:', error);
      }
    );
  }

  abrirModalAgregar(): void {
   
    this.selectedMantenimiento = { 
      fecha: '', 
      actividadRealizada: '', 
      evidencia: '', 
      asignacion: [] as Asignacion[] 
    };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(mantenimiento: Mantenimiento): void {
   
    this.selectedMantenimiento = { 
      ...mantenimiento,
      
      asignacion: Array.isArray(mantenimiento.asignacion) ? 
        [...mantenimiento.asignacion] as Asignacion[] : 
        (mantenimiento.asignacion ? [mantenimiento.asignacion] as Asignacion[] : [] as Asignacion[])
    };
    this.isEditMode = true;
    this.isModalVisible = true;
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedMantenimiento = null;
  }

  guardarMantenimiento(): void {
    if (this.selectedMantenimiento) {
      if (this.isEditMode && this.selectedMantenimiento.id) {
        this.mantenimientoService.updateMantenimiento(this.selectedMantenimiento.id, this.selectedMantenimiento).subscribe(
          () => {
            this.cargarMantenimientos();
            this.cerrarModal();
            this.mostrarNotificacion('Mantenimiento actualizado con éxito', 'success');
          },
          (error) => {
            console.error('Error al actualizar mantenimiento:', error);
            this.mostrarNotificacion('Error al actualizar mantenimiento', 'error');
          }
        );
      } else {
        this.mantenimientoService.createMantenimiento(this.selectedMantenimiento).subscribe(
          () => {
            this.cargarMantenimientos();
            this.cerrarModal();
            this.mostrarNotificacion('Mantenimineto agregado con éxito', 'success');
          },
          (error) => {
            console.error('Error al crear mantenimiento:', error);
            this.mostrarNotificacion('Error al crear mantenimiento', 'error'); 
          }
        );
      }
    }
  }

  // Método para abrir el modal de confirmación
 abrirModalConfirmacionEliminar(id: any): void {
  if (typeof id === 'object') {
    this.idParaEliminar = id.timestamp || JSON.stringify(id);
  } else {
    this.idParaEliminar = id.toString();
  }
  this.isConfirmDeleteVisible = true; // Muestra el modal
}

// Método para confirmar la eliminación
confirmarEliminacion(): void {
  if (this.idParaEliminar) {
    this.mantenimientoService.deleteMantenimiento(this.idParaEliminar).subscribe(
      () => {
        this.cargarMantenimientos();
        this.mostrarNotificacion('Mantenimiento eliminado con éxito', 'success');
        this.isConfirmDeleteVisible = false; // Oculta el modal
        this.idParaEliminar = null; // Limpia el ID
      },
      (error) => {
        console.error('Error al eliminar mantenimiento:', error);
        this.mostrarNotificacion('Error al eliminar mantenimiento', 'error');
        this.isConfirmDeleteVisible = false; // Oculta el modal
        this.idParaEliminar = null; // Limpia el ID
      }
    );
  }
}

// Método para cancelar la eliminación
cancelarEliminacion(): void {
  this.isConfirmDeleteVisible = false; // Oculta el modal
  this.idParaEliminar = null; // Limpia el ID
}

// Método para eliminar (actualizado para usar el modal de confirmación)
eliminarMantenimiento(id: any): void {
  this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
}

  
  getAsignacionInfo(asignacion: Asignacion | null | undefined): string {
    if (!asignacion || !asignacion.equipo) return '';
    
    const nombre = asignacion.nombreEquipo || 'Sin nombre';
    const modelo = asignacion.equipo.modelo || 'Sin modelo';
    
    return `${nombre} (${modelo})`;
  }
  

   isViewModalVisible = false;
  
  abrirModalVer(mantenimiento: Mantenimiento): void {
    this.selectedMantenimiento = { ...mantenimiento };
    this.isViewModalVisible = true;
  }
  
  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedMantenimiento = null;
  }

  getAsignacionText(asignacion: Asignacion[] | Asignacion | null | undefined): string {
    if (!asignacion) return 'No asignado';
  
    if (Array.isArray(asignacion)) {
      return asignacion.map(asig => this.getAsignacionInfo(asig)).join(', ');
    }
  
    return this.getAsignacionInfo(asignacion);
  }

  // Método para mostrar notificaciones
 mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
  if (tipo === 'success') {
    this.mensajeExito = mensaje;
    setTimeout(() => this.mensajeExito = '', 3000); // Oculta el mensaje después de 3 segundos
  } else if (tipo === 'error') {
    this.mensajeError = mensaje;
    setTimeout(() => this.mensajeError = '', 3000); // Oculta el mensaje después de 3 segundos
  }
}
  
// Método para redirigir al Dashboard
irAlDashboard(): void {
  this.router.navigate(['/dashboard']); // Cambia la ruta según tu configuración de rutas
}

// Método para cerrar sesión
cerrarSesion(): void {
  this.loginService.logout(); // Llama al método de logout de tu servicio
  this.router.navigate(['/login']); // Redirige al login después del logout
}

// Método para alternar el orden de la tabla
alternarOrden(): void {
  this.ordenDescendente = !this.ordenDescendente;
  this.mantenimientos.reverse(); // invierte el orden actual del array
}


// Método para descargar PDF
descargarPdfMantenimiento() {
  this.pdfService.downloadBitacoraPdf().subscribe(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mantenimientos.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  }, error => {
    console.error('Error al descargar el PDF:', error);
  });
}
}