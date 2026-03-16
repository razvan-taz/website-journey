import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  showSignIn = signal(false);
  openSignIn() { this.showSignIn.set(true); }
}
