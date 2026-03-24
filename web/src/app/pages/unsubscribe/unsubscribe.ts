import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-unsubscribe',
  standalone: true,
  templateUrl: './unsubscribe.html',
  styleUrl: './unsubscribe.css',
})
export class Unsubscribe implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  loading = signal(true);
  success = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.loading.set(false); return; }
    this.http.get(`/api/newsletter/unsubscribe`, { params: { token } }).subscribe({
      next: () => { this.success.set(true); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
