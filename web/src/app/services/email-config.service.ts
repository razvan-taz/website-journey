import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  fromName: string;
  fromAddress: string;
  password: string;
  sslEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmailConfigService {
  private http = inject(HttpClient);

  getConfig(): Observable<EmailConfig> {
    return this.http.get<EmailConfig>('/api/admin/email-config');
  }

  updateConfig(config: EmailConfig): Observable<EmailConfig> {
    return this.http.put<EmailConfig>('/api/admin/email-config', config);
  }
}
