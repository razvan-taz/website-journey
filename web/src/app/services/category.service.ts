import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoryDto {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private base = '/api/product-categories';

  getAll(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.base);
  }

  create(name: string): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.base, { name });
  }

  update(id: number, name: string): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.base}/${id}`, { name });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
