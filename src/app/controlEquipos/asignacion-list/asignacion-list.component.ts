import { Component, OnInit,  ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsignacionService } from '../../services/asignacion.service';
import { EquipoService } from '../../services/equipo.service';
import { PersonalService } from '../../services/personal.service';
import { LicenciaService } from '../../services/licencia.service';
import { Asignacion } from '../../models/asignacion';
import { Equipo } from '../../models/equipo';
import { Personal } from '../../models/personal';
import { Licencia } from '../../models/licencia';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-asignacion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './asignacion-list.component.html',
  styleUrl: './asignacion-list.component.css',
})
export class AsignacionComponent implements OnInit {
  getLicenciaNames(asignacion: Asignacion): string {
    return asignacion.licencias && asignacion.licencias.length > 0
      ? asignacion.licencias.map(l => l.nombreLicencia).join(', ')
      : 'Sin asignar';
  }
  
getPersonalNames(asignacion: Asignacion): string {
  return asignacion.personal && asignacion.personal.length > 0
    ? asignacion.personal.map(p => p.nombre).join(', ')
    : 'Sin asignar';
}
  asignacionList: Asignacion[] = [];
  equipoList: Equipo[] = [];
  personalList: Personal[] = [];
  licenciaList: Licencia[] = [];
  selectedAsignacion: Asignacion | null = null;
  isModalVisible = false;
  isEditMode = false;
  searchEquipo: string = '';
  ordenDescendente: boolean = true;

  
  mensajeExito: string = '';
mensajeError: string = '';
isConfirmDeleteVisible: boolean = false;
idParaEliminar: string | null = null;

  constructor(
    private cd: ChangeDetectorRef,
    private asignacionService: AsignacionService,
    private equipoService: EquipoService,
    private personalService: PersonalService,
    private licenciaService: LicenciaService,
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
    this.cargarAsignaciones();
    this.cargarEquipos();
    this.cargarPersonal();
    this.cargarLicencias();
  }

  cargarAsignaciones(): void {
    this.asignacionService.obtenerTodasLasAsignaciones().subscribe(
      (data) => (this.asignacionList = data),
      (error) => console.error('Error al cargar asignaciones:', error)
    );
  }

  cargarEquipos(): void {
    this.equipoService.obtenerTodosLosEquipos().subscribe(
      (data) => (this.equipoList = data),
      (error) => console.error('Error al cargar equipos:', error)
    );
  }

  cargarPersonal(): void {
    this.personalService.obtenerTodoElPersonal().subscribe(
      (data) => (this.personalList = data),
      (error) => console.error('Error al cargar personal:', error)
    );
  }

  cargarLicencias(): void {
    this.licenciaService.obtenerTodasLasLicencias().subscribe(
      (data) => (this.licenciaList = data),
      (error) => console.error('Error al cargar licencias:', error)
    );
  }

  abrirModalAgregar(): void {
    this.selectedAsignacion = {
      equipo: null,
      personal: [],
      licencias: [],
      ubicacionFisica: '',
      nombreEquipo: '',
      contrasena: '',
      evidenciaAsignacion: '',
      fechaAsignacion: '',
      fechaFinAsignacion: '',
      comentarios: ''
    };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(asignacion: Asignacion): void {
    console.log('Asignación antes de abrir el modal:', asignacion); // Verifica qué valores tiene
    this.selectedAsignacion = JSON.parse(JSON.stringify(asignacion)); // Copia sin referencias
    this.isEditMode = true;
    this.isModalVisible = true;
  }
  

  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedAsignacion = null;
  }

  guardarAsignacion(): void {
    if (this.selectedAsignacion) {
      if (this.isEditMode && this.selectedAsignacion.id) {
        this.asignacionService.actualizarAsignacion(this.selectedAsignacion.id, this.selectedAsignacion).subscribe(
          () => {
            this.cargarAsignaciones();
            this.cerrarModal();
            this.cd.detectChanges();
            this.mostrarNotificacion('Asignación actualizada con éxito', 'success');
          },
          (error) => {console.error('Error al actualizar asignación:', error);
          this.mostrarNotificacion('Error al actualizar asignación', 'error');
          }
        );
      } else {
        this.asignacionService.crearAsignacion(this.selectedAsignacion).subscribe(
          () => {
            this.cargarAsignaciones();
            this.cerrarModal();
            this.mostrarNotificacion('Asignación agregada con éxito', 'success');
          },
          (error) =>{ console.error('Error al crear asignación:', error);
          this.mostrarNotificacion('Error al crear asignación', 'error'); 
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
    this.asignacionService.eliminarAsignacion(this.idParaEliminar).subscribe(
      () => {
        this.cargarAsignaciones();
        this.mostrarNotificacion('Asignación eliminada con éxito', 'success');
        this.isConfirmDeleteVisible = false; // Oculta el modal
        this.idParaEliminar = null; // Limpia el ID
      },
      (error) => {
        console.error('Error al eliminar personal:', error);
        this.mostrarNotificacion('Error al eliminar personal', 'error');
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
eliminarAsignacion(id: any): void {
  this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
}

buscarPorEquipo(): void {
}

  
  isViewModalVisible = false;

  abrirModalVer(asignacion:Asignacion): void {
    this.selectedAsignacion = { ...asignacion };
    this.isViewModalVisible = true;
  }
  
  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedAsignacion = null;
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
  this.asignacionList.reverse(); // invierte el orden actual del array
}

descargarPdf() {
  this.pdfService.downloadAsignacionesPdf().subscribe(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asignaciones.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  }, error => {
    console.error('Error al descargar el PDF:', error);
  });
}
}