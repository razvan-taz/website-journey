import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Content } from './pages/content/content';
import { ContentDetail } from './pages/content-detail/content-detail';
import { Store } from './pages/store/store';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'content/category/:cat', component: Content },
  { path: 'content/tag/:tag', component: Content },
  { path: 'content/:id', component: ContentDetail },
  { path: 'content', component: Content },

  { path: 'store/:id', loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetail) },
  { path: 'store', component: Store },
  { path: 'search', loadComponent: () => import('./pages/search/search').then(m => m.SearchPage) },
  { path: 'about', component: About },

  { path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.Contact) },
  { path: 'faq', loadComponent: () => import('./pages/faq/faq').then(m => m.Faq) },
  { path: 'tos', loadComponent: () => import('./pages/tos/tos').then(m => m.Tos) },
  { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy').then(m => m.Privacy) },

  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout) },
  { path: 'order-confirmation', loadComponent: () => import('./pages/order-confirmation/order-confirmation').then(m => m.OrderConfirmation) },

  { path: 'orders/:id/invoice', canActivate: [authGuard], loadComponent: () => import('./pages/orders/order-invoice/order-invoice').then(m => m.OrderInvoiceComponent) },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./pages/orders/order-detail/order-detail').then(m => m.OrderDetailComponent) },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./pages/orders/orders').then(m => m.Orders) },

  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./pages/notifications/notifications').then(m => m.NotificationsComponent) },

  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
  { path: 'wishlist', canActivate: [authGuard], loadComponent: () => import('./pages/wishlist/wishlist').then(m => m.Wishlist) },

  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword) },
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email').then(m => m.VerifyEmail) },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
    children: [
      { path: '', redirectTo: 'articles', pathMatch: 'full' },
      { path: 'articles/analytics', loadComponent: () => import('./pages/admin/articles/admin-articles-analytics').then(m => m.AdminArticlesAnalytics) },
      { path: 'articles/new', loadComponent: () => import('./pages/admin/articles/article-form').then(m => m.ArticleForm) },
      { path: 'articles/edit/:slug', loadComponent: () => import('./pages/admin/articles/article-form').then(m => m.ArticleForm) },
      { path: 'articles', loadComponent: () => import('./pages/admin/articles/admin-articles').then(m => m.AdminArticles) },
      { path: 'products', loadComponent: () => import('./pages/admin/products/admin-products').then(m => m.AdminProducts) },
      { path: 'products/new', loadComponent: () => import('./pages/admin/products/product-form').then(m => m.ProductForm) },
      { path: 'products/edit/:id', loadComponent: () => import('./pages/admin/products/product-form').then(m => m.ProductForm) },
      { path: 'social-links', loadComponent: () => import('./pages/admin/social-links/admin-social-links').then(m => m.AdminSocialLinks) },
      { path: 'schedule', loadComponent: () => import('./pages/admin/schedule/admin-schedule').then(m => m.AdminSchedule) },
      { path: 'contact', loadComponent: () => import('./pages/admin/contact/admin-contact').then(m => m.AdminContact) },
      { path: 'faq', loadComponent: () => import('./pages/admin/faq/admin-faq').then(m => m.AdminFaq) },
      { path: 'site-pages', loadComponent: () => import('./pages/admin/site-pages/admin-site-pages').then(m => m.AdminSitePages) },
      { path: 'live', loadComponent: () => import('./pages/admin/live/admin-live').then(m => m.AdminLive) },
      { path: 'nav-layout', loadComponent: () => import('./pages/admin/nav-layout/admin-nav-layout').then(m => m.AdminNavLayout) },
      { path: 'email-settings', loadComponent: () => import('./pages/admin/email-settings/admin-email-settings').then(m => m.AdminEmailSettings) },
      { path: 'refunds', loadComponent: () => import('./pages/admin/refunds/admin-refunds').then(m => m.AdminRefunds) },
      { path: 'orders', loadComponent: () => import('./pages/admin/orders/admin-orders').then(m => m.AdminOrders) },
      { path: 'newsletter', loadComponent: () => import('./pages/admin/newsletter-send/admin-newsletter-send').then(m => m.AdminNewsletterSend) },
      { path: 'newsletter-subscribers', loadComponent: () => import('./pages/admin/newsletter/admin-newsletter').then(m => m.AdminNewsletter) },
      { path: 'analytics', loadComponent: () => import('./pages/admin/analytics/admin-analytics').then(m => m.AdminAnalyticsComponent) },
      { path: 'comments', loadComponent: () => import('./pages/admin/comments/admin-comments').then(m => m.AdminCommentsComponent) },
      { path: 'reviews', loadComponent: () => import('./pages/admin/reviews/admin-reviews').then(m => m.AdminReviews) },
      { path: 'coupons', loadComponent: () => import('./pages/admin/coupons/admin-coupons').then(m => m.AdminCoupons) },
      { path: 'users', loadComponent: () => import('./pages/admin/users/admin-users').then(m => m.AdminUsers) },
      { path: 'shipping', loadComponent: () => import('./pages/admin/shipping/admin-shipping').then(m => m.AdminShipping) },
      { path: 'categories', loadComponent: () => import('./pages/admin/categories/admin-categories').then(m => m.AdminCategories) },
    ]
  },

  { path: 'unsubscribe', loadComponent: () => import('./pages/unsubscribe/unsubscribe').then(m => m.Unsubscribe) },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
];
