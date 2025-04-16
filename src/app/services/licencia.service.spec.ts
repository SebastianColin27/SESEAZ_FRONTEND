import { TestBed } from '@angular/core/testing';

import { LicenciaService } from './licencia.service';

describe('LicenciaService', () => {
  let service: LicenciaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LicenciaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
