import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Content } from './pages/content/content';
import { ContentDetail } from './pages/content-detail/content-detail';
import { Store } from './pages/store/store';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'content/:id', component: ContentDetail },
  { path: 'content', component: Content },

  { path: 'store', component: Store },
  { path: 'about', component: About },

  { path: '**', redirectTo: '' },
];