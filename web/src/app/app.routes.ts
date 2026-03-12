import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Content } from './pages/content/content';
import { Store } from './pages/store/store';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'content', component: Content },
  { path: 'store', component: Store },
  { path: '**', redirectTo: '' },
];