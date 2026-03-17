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

  { path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.Contact) },
  { path: 'faq', loadComponent: () => import('./pages/faq/faq').then(m => m.Faq) },
  { path: 'tos', loadComponent: () => import('./pages/tos/tos').then(m => m.Tos) },
  { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy').then(m => m.Privacy) },

  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout) },
  { path: 'order-confirmation', loadComponent: () => import('./pages/order-confirmation/order-confirmation').then(m => m.OrderConfirmation) },

  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
  { path: 'wishlist', loadComponent: () => import('./pages/wishlist/wishlist').then(m => m.Wishlist) },

  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword) },

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
      { path: 'social-links', loadComponent: () => import('./pages/admin/social-links/admin-social-links').then(m => m.AdminSocialLinks) },
      { path: 'schedule', loadComponent: () => import('./pages/admin/schedule/admin-schedule').then(m => m.AdminSchedule) },
      { path: 'contact', loadComponent: () => import('./pages/admin/contact/admin-contact').then(m => m.AdminContact) },
      { path: 'faq', loadComponent: () => import('./pages/admin/faq/admin-faq').then(m => m.AdminFaq) },
      { path: 'site-pages', loadComponent: () => import('./pages/admin/site-pages/admin-site-pages').then(m => m.AdminSitePages) },
      { path: 'twitch', loadComponent: () => import('./pages/admin/twitch/admin-twitch').then(m => m.AdminTwitch) },
    ]
  },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
];
