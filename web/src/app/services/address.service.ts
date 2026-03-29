import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Address {
  id: number;
  label: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AddressRequest {
  label: string;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);

  getAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>('/api/addresses');
  }

  createAddress(data: AddressRequest): Observable<Address> {
    return this.http.post<Address>('/api/addresses', data);
  }

  updateAddress(id: number, data: AddressRequest): Observable<Address> {
    return this.http.put<Address>(`/api/addresses/${id}`, data);
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`/api/addresses/${id}`);
  }

  setDefault(id: number): Observable<Address> {
    return this.http.put<Address>(`/api/addresses/${id}/default`, {});
  }
}
