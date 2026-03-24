import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages — prerender at build time
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'content', renderMode: RenderMode.Prerender },

  // Dynamic public pages — render on the server per request
  { path: 'content/:id', renderMode: RenderMode.Server },

  // Dynamic authenticated pages
  { path: 'orders', renderMode: RenderMode.Client },
  { path: 'orders/**', renderMode: RenderMode.Client },
  { path: 'notifications', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'wishlist', renderMode: RenderMode.Client },

  // Client-side only pages
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'contact', renderMode: RenderMode.Server },
  { path: 'faq', renderMode: RenderMode.Server },
  { path: 'tos', renderMode: RenderMode.Server },
  { path: 'privacy', renderMode: RenderMode.Server },
  { path: 'forgot-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  { path: 'unsubscribe', renderMode: RenderMode.Client },

  // Fallback
  { path: '**', renderMode: RenderMode.Server },
];
