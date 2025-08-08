import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginService } from '../../auth/login.service';
import { map, take } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  return loginService.userRole$.pipe(
    take(1),
    map(role => {
      if (role === 'ROLE_ADMIN') {
        return true;
      } else {
        router.navigate(['/dashboard']); 
        return false;
      }
    })
  );
};
