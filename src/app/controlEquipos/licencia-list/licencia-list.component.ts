import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LicenciaService } from '../../services/licencia.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Licencia } from '../../models/licencia';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';

@Component({
  selector: 'app-licencia-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './licencia-list.component.html',
  styleUrl: './licencia-list.component.css',
})
export class LicenciaListComponent implements OnInit {

  licenciaList: Licencia[] = [];
  selectedLicencia: Licencia | null = null;
  isModalVisible = false;
  isFechaDeshabilitada = false;
  isEditMode = false;
  searchNombre: string = ''; 
  ordenDescendente: boolean = true;

  mensajeExito: string = '';
  mensajeError: string = '';
  isConfirmDeleteVisible: boolean = false;
  idParaEliminar: string | null = null;
  

  constructor(private licenciaService: LicenciaService,
    private loginService: LoginService, public authService: AuthService,
        private router: Router,
  ) { }


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
    this.cargarLicencias();
  }

  cargarLicencias(): void { 
    this.licenciaService.obtenerTodasLasLicencias().subscribe( 
      (data: Licencia[]) => {
        this.licenciaList = data;
        console.log('Lista de licencias cargada:', this.licenciaList);
      },
      (error) => {
        console.error('Error al cargar licencias:', error);
      }
    );
  }

  abrirModalAgregar(): void { 
    this.selectedLicencia = { tipoSw:'', nombreLicencia:'', numeroSerie:'', numeroUsuarios:0, subcripcion:'', fechaVencimiento:'', usuario:'', contrasena:'',   esPermanente: false };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(licencia: Licencia): void {
    this.selectedLicencia = { ...licencia };
    this.isFechaDeshabilitada = licencia.esPermanente || false;
    this.isEditMode = true;
    this.isModalVisible = true;
  }

  cerrarModal(): void { 
    this.isModalVisible = false;
    this.selectedLicencia = null;
  }

  guardarLicencia(): void { 
    if (this.selectedLicencia) {
      // Si la licencia es permanente, eliminamos la fecha para evitar errores
      if (this.selectedLicencia.esPermanente) {
        this.selectedLicencia.fechaVencimiento = undefined;
      }
  
      if (this.isEditMode && this.selectedLicencia.id) {
        this.licenciaService.actualizarLicencia(this.selectedLicencia.id, this.selectedLicencia).subscribe(
          (licenciaActualizada) => {
            this.cargarLicencias();
            this.cerrarModal();
            console.log('Licencia actualizada:', licenciaActualizada);
            this.mostrarNotificacion('Licencia actualizada con éxito', 'success');
          },
          (error) => {
            console.error('Error al actualizar licencia:', error);
            this.mostrarNotificacion('Error al actualizar licencia', 'error');
          }
        );
      } else {
        this.licenciaService.crearLicencia(this.selectedLicencia).subscribe( 
          (nuevaLicencia) => { 
            console.log('Licencia creada:', nuevaLicencia);
            this.cargarLicencias();
            this.cerrarModal();
            this.mostrarNotificacion('Licencia agregada con éxito', 'success');
          },
          (error) => {
            console.error('Error al crear licencia:', error);
            this.mostrarNotificacion('Error al crear licencia', 'error'); 
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

  toggleFechaExpiracion(): void {
    if (this.isFechaDeshabilitada) {
      this.selectedLicencia!.fechaVencimiento = 'Permanente';
    }
  }

  
  cancelarEdicion(): void { 
    this.cerrarModal(); 
  }

 // Método para confirmar la eliminación
confirmarEliminacion(): void {
  if (this.idParaEliminar) {
    this.licenciaService.eliminarLicencia(this.idParaEliminar).subscribe(
      () => {
        this.cargarLicencias();
        this.mostrarNotificacion('Licencia eliminada con éxito', 'success');
        this.isConfirmDeleteVisible = false; // Oculta el modal
        this.idParaEliminar = null; // Limpia el ID
      },
      (error) => {
        console.error('Error al eliminar licencial:', error);
        this.mostrarNotificacion('Error al eliminar licencia', 'error');
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

// Método para eliminar personal (actualizado para usar el modal de confirmación)
eliminarLicencia(id: any): void {
  this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
}

  buscarPorNombre(): void { 
    if (this.searchNombre.trim() !== '') {
      this.licenciaService.buscarLicenciasPorNombre(this.searchNombre).subscribe(
        (data: Licencia[]) => {
          this.licenciaList = data; 
        },
        (error) => {
          console.error('Error al buscar licencias:', error);
        }
      );
    } else {
      this.cargarLicencias(); 
    }
  }

  isViewModalVisible = false;

  abrirModalVer(licencia: Licencia): void {
    this.selectedLicencia = { ...licencia };
    this.isViewModalVisible = true;
  }
  
  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedLicencia = null;
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
  this.licenciaList.reverse(); // invierte el orden actual del array
}
}
