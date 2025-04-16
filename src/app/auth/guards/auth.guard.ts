import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from '../../auth/login.service';
import { inject } from '@angular/core';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(LoginService)
  const router = inject(Router)

  return authService.userLoginOn.pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
}
