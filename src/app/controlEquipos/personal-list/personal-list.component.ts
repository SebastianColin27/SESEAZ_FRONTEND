import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonalService } from '../../services/personal.service';
import { Personal } from '../../models/personal';
import { FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { LoginService } from '../../auth/login.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { LoadingComponent } from "../loading/loading.component";
import { Inject } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';


@Component({
  selector: 'app-personal-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, LoadingComponent,  SidebarComponent],
  templateUrl: './personal-list.component.html',
  styleUrl: './personal-list.component.css',
})


export class PersonalListComponent implements OnInit {

  personalList: Personal[] = [];
  selectedPersonal: Personal | null = null;
  isModalVisible = false;
  isEditMode = false;
  searchNombre: string = '';
  userRole: string = '';
  ordenDescendente: boolean = true;
  mensajeExito: string = '';
  mensajeError: string = '';
  isConfirmDeleteVisible: boolean = false;
  idParaEliminar: string | null = null;
  loading = true;
  fechaLimite: Date = new Date();

  itemsPerPage = 10;
  currentPage = 1;
   paginatedList: any[] = [];


  constructor(private personalService: PersonalService, private cdr: ChangeDetectorRef,
    private loginService: LoginService, public authService: AuthService,
    private router: Router, @Inject('FECHA_HOY') public fechaHoy: String) { }
  ngAfterViewInit(): void {
    throw new Error('Method not implemented.');
  }

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
    setTimeout(() => this.loading = false, 500); // Simula carga
    this.cargarPersonal();

  }

  cargarPersonal(): void {
    this.personalService.obtenerTodoElPersonal().subscribe(
      (data: Personal[]) => {

        this.personalList = data.map(item => {
          if (item._id) {

            item.id = item._id;
          }
          return item;
        });
        this.currentPage = 1
        this.updatePaginatedList();
        // console.log('Lista de personal cargada:', this.personalList);
      },
      (error) => {
        console.error('Error loading personal:', error);
      }
    );
  }

  abrirModalAgregar(): void {

    this.selectedPersonal = { nombre: '', cargo: '', fechaIngreso: '', fechaEgreso: '' };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(personal: Personal): void {
    this.selectedPersonal = { ...personal };


    if (this.selectedPersonal.id && typeof this.selectedPersonal.id === 'object') {
      if (personal._id) {
        this.selectedPersonal.id = personal._id;
      } else if (personal.id.$oid) {
        this.selectedPersonal.id = personal.id.$oid;
      } else {
        console.error('No se pudo determinar el ID correcto del personal', personal);
        return;
      }
    }

    // console.log('ID procesado para edición:', this.selectedPersonal.id);
    this.isEditMode = true;
    this.isModalVisible = true;
  }


  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedPersonal = null;
  }



  guardarPersonal(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched(); // Para que se muestren los errores si hay campos vacíos
      this.mostrarNotificacion('Completa todos los campos obligatorios', 'error');
      return;
    }
    this.loading = true;

    const fechaIngreso = new Date(this.selectedPersonal?.fechaIngreso || '');
    const fechaEgreso = new Date(this.selectedPersonal?.fechaEgreso || '');
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setFullYear(hoy.getFullYear() + 10);
    const anioIngreso = fechaIngreso.getFullYear();
    const anioEgreso = fechaEgreso.getFullYear();
      const limite = this.fechaLimite.getFullYear();


    if (anioIngreso < 2017 || anioIngreso > limite) {
      this.mostrarNotificacion('El año de ingreso debe ser coherente', 'error');
      this.loading = false;
      return;
    }

    if (anioEgreso < 2017 || anioEgreso > limite) {
      this.mostrarNotificacion('El año de egreso debe ser coherente', 'error');
      this.loading = false;
      return;
    }

    if (fechaEgreso < fechaIngreso) {
      this.mostrarNotificacion('La fecha de egreso no puede ser anterior a la fecha de ingreso', 'error');
      this.loading = false;
      return;
    }

    if (this.selectedPersonal) {
      const nombre = this.selectedPersonal.nombre?.trim();

      // Validar caracteres permitidos en el nombre
      const regex = /^[a-zA-Z ]+$/;
      if (!regex.test(nombre)) {
        this.mostrarNotificacion(
          'El nombre solo puede contener letras',
          'error'
        );
        this.loading = false;
        return;
      }

      // Validar duplicados (ignorando el mismo registro si se está editando)
      const yaExiste = this.personalList.some(p =>
        p.nombre?.trim().toLowerCase() === nombre.toLowerCase() &&
        (!this.isEditMode || (this.selectedPersonal && p.id !== this.selectedPersonal.id))
      );

      if (yaExiste) {
        this.mostrarNotificacion('El nombre ya está registrado para otro personal', 'error');
        this.loading = false;
        return;
      }

      if (this.isEditMode && this.selectedPersonal.id) {
        const idValido = typeof this.selectedPersonal.id === 'string'
          ? this.selectedPersonal.id
          : this.selectedPersonal.id.$oid;

        if (!idValido) {
          console.error('Error: ID inválido para actualización');
          this.loading = false;
          return;
        }

        this.personalService.actualizarPersonal(idValido, this.selectedPersonal).subscribe(
          (personalActualizado) => {
            this.cargarPersonal();
            this.cerrarModal();
            this.mostrarNotificacion('Personal actualizado con éxito', 'success');
            this.loading = false;
          },
          (error) => {
            console.error('Error al actualizar personal:', error);
            this.mostrarNotificacion('Error al actualizar personal', 'error');
            this.loading = false;
          }
        );
      } else {
        const nuevoPersonal = { ...this.selectedPersonal };
        delete nuevoPersonal.id;

        this.personalService.crearPersonal(nuevoPersonal).subscribe(
          (nuevoPersonalCreado) => {
            this.cargarPersonal();
            this.cerrarModal();
            this.mostrarNotificacion('Personal agregado con éxito', 'success');
            this.loading = false;
          },
          (error) => {
            console.error('Error al crear personal:', error);
            this.mostrarNotificacion('Error al crear personal', 'error');
            this.loading = false;
          }
        );
      }
    }
  }

  cancelarEdicion(): void {
    this.cerrarModal();
  }

  // Método para abrir el modal de confirmación
  abrirModalConfirmacionEliminar(id: any): void {
    if (typeof id === 'object') {
      this.idParaEliminar = id.timestamp || JSON.stringify(id);
    } else {
      this.idParaEliminar = id.toString();
    }
    this.isConfirmDeleteVisible = true;
  }

  // Método para confirmar la eliminación
  confirmarEliminacion(): void {
    if (this.idParaEliminar) {
      this.personalService.eliminarPersonal(this.idParaEliminar).subscribe(
        () => {
          this.cargarPersonal();
          this.mostrarNotificacion('Personal eliminado con éxito', 'success');
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null;
        },
        (error) => {
          console.error('Error al eliminar personal:', error);
          this.mostrarNotificacion('Error al eliminar personal', 'error');
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
  eliminarPersonal(id: any): void {
    this.abrirModalConfirmacionEliminar(id);
  }




  buscarPorNombre(): void {
    const nombre = this.searchNombre.trim();
    if (nombre) {
      this.personalService.buscarPersonalPorNombre(nombre).subscribe({
        next: (data: Personal[]) => {
          this.personalList = data;
          this.currentPage = 1;
          this.updatePaginatedList();
        },
        error: (err) => {
          console.error('Error al buscar personal por nombre:', err);
        }
      });
    } else {
      this.cargarPersonal();
    }
  }

  limpiarYMostrarTodo(): void {
    this.searchNombre = '';
    this.cargarPersonal();
  }


  isViewModalVisible = false;

  abrirModalVer(personal: Personal): void {
    this.selectedPersonal = { ...personal };
    this.isViewModalVisible = true;
  }

  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedPersonal = null;
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


  // Paginación


  updatePaginatedList() {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  this.paginatedList = this.personalList.slice(start, end);
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
    return Math.ceil(this.personalList.length / this.itemsPerPage);
  }

  get startIndex(): number {
  return (this.currentPage - 1) * this.itemsPerPage + 1;
}

get endIndex(): number {
  const end = this.startIndex + this.paginatedList.length - 1;
  return end > this.personalList.length ? this.personalList.length : end;
} 
onItemsPerPageChange() {
  this.currentPage = 1; // reiniciar a la primera página
  this.updatePaginatedList();
}

}

