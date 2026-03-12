import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [],
  templateUrl: './content-detail.html',
  styleUrl: './content-detail.css',
})
export class ContentDetail {
  id: string;

  constructor(route: ActivatedRoute) {
    this.id = route.snapshot.paramMap.get('id') ?? '';
  }
}