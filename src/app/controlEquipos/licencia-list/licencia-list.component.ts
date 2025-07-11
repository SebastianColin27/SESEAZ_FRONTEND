import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LicenciaService } from '../../services/licencia.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Licencia } from '../../models/licencia';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { catchError, debounceTime, distinctUntilChanged, of, Subscription, switchMap } from 'rxjs';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-licencia-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, LoadingComponent],
  templateUrl: './licencia-list.component.html',
  styleUrl: './licencia-list.component.css',
})
export class LicenciaListComponent implements OnInit {
  loading = true;
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
  ultimaFechaVencimiento: string | null = null;
  searchControl = new FormControl('');

  private searchSubscription?: Subscription;

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
    setTimeout(() => this.loading = false, 500); 
    this.cargarLicencias();

    this.searchSubscription = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value || !value.trim()) {
            this.cargarLicencias();
            return of(null);
          }
          return this.licenciaService.buscarLicenciasPorNombre(value.trim()).pipe(
            catchError(err => {
              console.error('Error al buscar licencia:', err);
              this.mensajeError = 'No se encontró la licencia con la serie ingresada.';
              return of(null);
            })
          );
        })
      )
      .subscribe((licencia) => {
        if (licencia) {
          this.licenciaList = licencia || [];
          this.mensajeError = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
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
    this.selectedLicencia = { tipoSw: '', nombreLicencia: '', numeroSerie: '', numeroUsuarios: 0, subcripcion: '', fechaVencimiento: '', usuario: '', contrasena: '', esPermanente: false };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(licencia: Licencia): void {
    this.selectedLicencia = JSON.parse(JSON.stringify(licencia));
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
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null;
        },
        (error) => {
          console.error('Error al eliminar licencial:', error);
          this.mostrarNotificacion('Error al eliminar licencia', 'error');
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null; 
        }
      );
    }
  }

  // Método para cancelar la eliminación
  cancelarEliminacion(): void {
    this.isConfirmDeleteVisible = false; 
    this.idParaEliminar = null; 
  }

  // Método para eliminar personal (actualizado para usar el modal de confirmación)
  eliminarLicencia(id: any): void {
    this.abrirModalConfirmacionEliminar(id); 
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
    this.selectedLicencia = JSON.parse(JSON.stringify(licencia));
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
      setTimeout(() => this.mensajeExito = '', 3000); 
    } else if (tipo === 'error') {
      this.mensajeError = mensaje;
      setTimeout(() => this.mensajeError = '', 3000); 
    }
  }

  // Método para redirigir al Dashboard
  irAlDashboard(): void {
    this.router.navigate(['/dashboard']); 
  }

  // Método para cerrar sesión
  cerrarSesion(): void {
    this.loginService.logout(); 
    this.router.navigate(['/login']); 
  }


  // Método para alternar el orden de la tabla
  alternarOrden(): void {
    this.ordenDescendente = !this.ordenDescendente;
    this.licenciaList.reverse(); // invierte el orden actual del array
  }

  // Método llamado cuando cambia la selección de suscripción
  onSubscriptionChange(): void {
    if (this.selectedLicencia && this.selectedLicencia.subcripcion === 'PERMANENTE') {
      
      this.selectedLicencia.fechaVencimiento = undefined; // O null
    }
    // Si la suscripción NO es permanente, no hacemos nada aquí.
    // El input de fecha se habilita automáticamente y el usuario puede ingresar una fecha.
  }
}
