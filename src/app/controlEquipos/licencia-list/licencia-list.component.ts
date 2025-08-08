import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LicenciaService } from '../../services/licencia.service';
import { FormControl, FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { Licencia } from '../../models/licencia';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { catchError, debounceTime, distinctUntilChanged, of, Subscription, switchMap, tap } from 'rxjs';
import { LoadingComponent } from '../loading/loading.component';
import { evitarNegativos } from '../../input-utils';  
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-licencia-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, LoadingComponent, SidebarComponent],
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
  fechaLimite: Date = new Date();
  evitarNegativos = evitarNegativos;

  private searchSubscription?: Subscription;

  paginatedList: any[] = [];
  itemsPerPage = 10;
  currentPage = 1;

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
          const trimmedValue = value?.trim();
          if (!trimmedValue) {
            this.cargarLicencias();
            return of(null);
          }

          return this.licenciaService.buscarLicenciasPorNombre(trimmedValue).pipe(
            tap((licencias: Licencia[]) => {
              this.licenciaList = licencias;
              this.currentPage = 1;
              this.updatePaginatedList();
              this.mensajeError = '';
            }),
            catchError(err => {
              console.error('Error al buscar licencia:', err);
              this.mensajeError = 'No se encontró la licencia con la serie ingresada.';
              this.licenciaList = [];
              this.updatePaginatedList();
              return of(null);
            })
          );
        })
      )
      .subscribe((licencias) => {
        if (!licencias && this.searchControl.value?.trim()) {
          this.mensajeError = 'No se encontró la licencia con la serie ingresada.';
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  cargarLicencias(): void {
    this.searchControl.setValue('');
    this.licenciaService.obtenerTodasLasLicencias().subscribe(
      (data: Licencia[]) => {
        this.licenciaList = data;
        this.currentPage = 1;
        this.updatePaginatedList();
        // console.log('Lista de licencias cargada:', this.licenciaList);
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


  guardarLicencia(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched(); // Para que se muestren los errores si hay campos vacíos
      this.mostrarNotificacion('Completa todos los campos obligatorios', 'error');
      return;
    }
    this.loading = true;

    const fecha = new Date(this.selectedLicencia?.fechaVencimiento || '');
    const anio = fecha.getFullYear();
    const hoy = new Date();
    this.fechaLimite.setFullYear(hoy.getFullYear() + 10);
    const limite = this.fechaLimite.getFullYear();

    if (anio < 2017 || anio > limite) {
      this.mostrarNotificacion('El año de vencimineto debe ser coherente', 'error');
      this.loading = false;
      return;
    }
    
    if (this.selectedLicencia) {
      const numeroSerie = (this.selectedLicencia.numeroSerie ?? '').trim();

      // Validar que el número de serie no contenga caracteres especiales
      const regex = /^[a-zA-Z0-9 _-]+$/;
      if (!regex.test(numeroSerie)) {
        this.mostrarNotificacion('El número de serie solo puede contener letras, números, guiones o guiones bajos', 'error');
        this.loading = false;
        return;
      }

      // Validar que no se duplique el número de serie (ignorando si es edición del mismo objeto)
      const yaExiste = this.licenciaList.some(lic =>
        lic.numeroSerie === numeroSerie &&
        (!this.isEditMode || (this.selectedLicencia && lic.id !== this.selectedLicencia.id)) // evitar conflicto si es la misma licencia en edición
      );

      if (yaExiste) {
        this.mostrarNotificacion('El número de serie ya existe', 'error');
        this.loading = false;
        return;
      }

      if (this.isEditMode && this.selectedLicencia.id) {
        this.licenciaService.actualizarLicencia(this.selectedLicencia.id, this.selectedLicencia).subscribe(
          (licenciaActualizada) => {
            this.cargarLicencias();
            this.cerrarModal();
            this.mostrarNotificacion('Licencia actualizada con éxito', 'success');
            this.loading = false;
          },
          (error) => {
            console.error('Error al actualizar licencia:', error);
            this.mostrarNotificacion('Error al actualizar licencia', 'error');
            this.loading = false;
          }
        );
      } else {
        this.licenciaService.crearLicencia(this.selectedLicencia).subscribe(
          (nuevaLicencia) => {
            this.cargarLicencias();
            this.cerrarModal();
            this.mostrarNotificacion('Licencia agregada con éxito', 'success');
            this.loading = false;
          },
          (error) => {
            console.error('Error al crear licencia:', error);
            this.mostrarNotificacion('Error al crear licencia', 'error');
            this.loading = false;
          }
        );
      }
    }
    if (!this.selectedLicencia || this.selectedLicencia.numeroUsuarios == null || this.selectedLicencia.numeroUsuarios <= 0) {
      this.mostrarNotificacion('El número de usuarios soportados debe ser mayor a cero', 'error');
      this.loading = false;
      return;
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
          this.currentPage = 1;
          this.updatePaginatedList();
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



  // Método llamado cuando cambia la selección de suscripción
  onSubscriptionChange(): void {
    if (this.selectedLicencia && this.selectedLicencia.subcripcion === 'PERMANENTE') {

      this.selectedLicencia.fechaVencimiento = undefined; // O null
    }
    // Si la suscripción NO es permanente, no hacemos nada aquí.
    // El input de fecha se habilita automáticamente y el usuario puede ingresar una fecha.
  }

  updatePaginatedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedList = this.licenciaList.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedList();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedList();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.licenciaList.length / this.itemsPerPage);
  }

  get startIndex(): number {
  return (this.currentPage - 1) * this.itemsPerPage + 1;
}

get endIndex(): number {
  const end = this.startIndex + this.paginatedList.length - 1;
  return end > this.licenciaList.length ? this.licenciaList.length : end;
}

onItemsPerPageChange() {
  this.currentPage = 1; // reiniciar a la primera página
  this.updatePaginatedList();
}

 
}

