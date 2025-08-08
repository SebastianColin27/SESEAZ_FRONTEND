import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { RegisterRequest } from '../models/RegisterRequest';
import { LoginService } from '../auth/login.service';
import { LoadingComponent } from '../controlEquipos/loading/loading.component';
import { User } from '../auth/user';
import { SidebarComponent } from '../controlEquipos/sidebar/sidebar.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingComponent, SidebarComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {


  usersList: User[] = [];
  loading = true;
  form: FormGroup;
  roles = ['LECTOR', 'MODERADOR', 'ADMIN'];
  successMessage = '';
  errorMessage = '';
  mensajeExito: string = '';
  mensajeError: string = '';

  modoEdicion: boolean = false;
  usuarioEnEdicion: User | null = null;


  paginatedList: any[] = [];
  itemsPerPage = 10;
  currentPage = 1;
  idParaEliminar: any;
  isConfirmDeleteVisible: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loginService: LoginService,
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      password: [''],
      role: ['', [Validators.required]]
    });
  }
  ngOnInit(): void {
    setTimeout(() => this.loading = false, 500);
    this.cargarUsuarios();
    this.actualizarValidacionPassword();
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
   

  register(): void {
  this.loading = true;
  if (this.form.invalid) return;

  const request: RegisterRequest = this.form.value;

  // Si estamos en modo edición, actualizar
  if (this.modoEdicion && this.usuarioEnEdicion) {
    this.authService.updateUser(this.usuarioEnEdicion.id!, request).subscribe({
      next: () => {
        this.mostrarNotificacion('Usuario actualizado con éxito', 'success');
        this.loading = false;
        this.form.reset();
        this.modoEdicion = false;
        this.usuarioEnEdicion = null;
        this.cargarUsuarios();
      },
      error: (err) => {
        this.mostrarNotificacion('Error al actualizar el usuario', 'error');
        this.loading = false;
        console.error(err);
      }
    });
  } else {
    // Si no estamos en modo edición, registrar normalmente
    this.authService.register(request).subscribe({
      next: () => {
        this.mostrarNotificacion('Usuario creado con éxito', 'success');
        this.loading = false;
        this.cargarUsuarios();
        setTimeout(() => this.form.reset(), 1500);
      },
      error: (err) => {
        this.mostrarNotificacion('Error al crear un usuario', 'error');
        this.loading = false;
        console.error(err);
      }
    });
  }
}



  // Método para redirigir al Dashboard
  irAlDashboard(): void {
    this.router.navigate(['/dashboard']);
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


  updatePaginatedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedList = this.usersList.slice(start, end);
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
    return Math.ceil(this.usersList.length / this.itemsPerPage);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    const end = this.startIndex + this.paginatedList.length - 1;
    return end > this.usersList.length ? this.usersList.length : end;
  }

  onItemsPerPageChange() {
    this.currentPage = 1; // reiniciar a la primera página
    this.updatePaginatedList();
  }



  cargarUsuarios(): void {
    this.authService.getAllUsers().subscribe(data => {
      this.usersList = data;
      this.updatePaginatedList()
    });
  }

  // Método para abrir el modal de confirmación
  abrirModalConfirmacionEliminarUsuario(id: any): void {
    if (typeof id === 'object') {
      this.idParaEliminar = id.timestamp || JSON.stringify(id);
    } else {
      this.idParaEliminar = id.toString();
    }
    this.isConfirmDeleteVisible = true;
  }

  // Método para confirmar la eliminación
  confirmarEliminacionUsuario(): void {
    if (this.idParaEliminar) {
      this.authService.deleteUser(this.idParaEliminar).subscribe(
        () => {
          this.mostrarNotificacion('Usuario eliminado con éxito', 'success');
          this.cargarUsuarios();
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null;
        },
        (error) => {
          console.error('Error al eliminar el usuario:', error);
          this.mostrarNotificacion('Error al eliminar el usuario', 'error');
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null;
        }
      );
    }
  }

  // Método para cancelar la eliminación
  cancelarEliminacionUsuario(): void {
    this.isConfirmDeleteVisible = false;
    this.idParaEliminar = null;
  }

  // Método para eliminar usuario (abre el modal de confirmación)
  eliminarUsuario(id: any): void {
    this.abrirModalConfirmacionEliminarUsuario(id);
  }

editarUsuario(usuario: User): void {
  this.modoEdicion = true;
  this.usuarioEnEdicion = usuario;
  this.form.patchValue({
    username: usuario.username,
    firstName: usuario.firstName,
    lastName: usuario.lastName,
    role: usuario.role,
    password: '' 
  });
  this.actualizarValidacionPassword();
}

cancelarEdicion(): void {
  this.modoEdicion = false;
  this.usuarioEnEdicion = null;
  this.form.reset();
  this.actualizarValidacionPassword();
}

private actualizarValidacionPassword(): void {
  const passwordControl = this.form.get('password');
  if (!passwordControl) return;

  if (!this.modoEdicion) {
    passwordControl.setValidators([Validators.required, Validators.minLength(6)]);
  } else {
    passwordControl.clearValidators(); // no obligatoria si estás editando
  }

  passwordControl.updateValueAndValidity();
}


}
