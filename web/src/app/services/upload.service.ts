import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);

  /** Validates file size client-side. Returns an error message or null if valid. */
  validate(file: File): string | null {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
    }
    return null;
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>('/api/admin/upload', form);
  }
}
