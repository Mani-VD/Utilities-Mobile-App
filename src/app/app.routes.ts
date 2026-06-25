import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'pdf-utility',
    loadComponent: () => import('./home/pdf-utility.component').then((m) => m.PdfUtilityComponent),
  },
  {
    path: 'image-utility',
    loadComponent: () => import('./image-utility/image-utility.component').then((m) => m.ImageUtilityComponent),
  },
];