import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginService } from '../../auth/login.service';
import { map, take } from 'rxjs';

export const loginRedirectGuard: CanActivateFn = () => {
  const authService = inject(LoginService);
  const router = inject(Router);

  return authService.userLoginOn.pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn) {
        router.navigate(['/dashboard']); 
        return false;
      }
      return true; 
    })
  );
};
