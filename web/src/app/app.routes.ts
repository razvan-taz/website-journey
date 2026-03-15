import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Content } from './pages/content/content';
import { ContentDetail } from './pages/content-detail/content-detail';
import { Store } from './pages/store/store';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'content/:id', component: ContentDetail },
  { path: 'content', component: Content },

  { path: 'store/:id', loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetail) },
  { path: 'store', component: Store },
  { path: 'about', component: About },

  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout) },
  { path: 'order-confirmation', loadComponent: () => import('./pages/order-confirmation/order-confirmation').then(m => m.OrderConfirmation) },

  { path: 'subscribe', loadComponent: () => import('./pages/subscribe/subscribe').then(m => m.Subscribe) },

  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
    children: [
      { path: '', redirectTo: 'articles', pathMatch: 'full' },
      { path: 'articles', loadComponent: () => import('./pages/admin/articles/admin-articles').then(m => m.AdminArticles) },
      { path: 'articles/new', loadComponent: () => import('./pages/admin/articles/article-form').then(m => m.ArticleForm) },
      { path: 'articles/edit/:slug', loadComponent: () => import('./pages/admin/articles/article-form').then(m => m.ArticleForm) },
      { path: 'products', loadComponent: () => import('./pages/admin/products/admin-products').then(m => m.AdminProducts) },
      { path: 'products/new', loadComponent: () => import('./pages/admin/products/product-form').then(m => m.ProductForm) },
      { path: 'products/edit/:id', loadComponent: () => import('./pages/admin/products/product-form').then(m => m.ProductForm) },
    ]
  },

  { path: '**', redirectTo: '' },
];