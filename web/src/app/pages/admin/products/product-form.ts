import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, CreateProductRequest } from '../../../services/product.service';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private productService = inject(ProductService);
  private uploadService = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEdit = signal(false);
  loading = signal(false);
  loadingData = signal(false);
  uploading = signal(false);
  uploadError = signal<string | null>(null);
  error = signal<string | null>(null);
  private editId: number | null = null;

  name = signal('');
  description = signal('');
  price = signal(0);
  imageUrl = signal('');
  category = signal('');
  stock = signal(0);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.editId = Number(idParam);
      this.loadingData.set(true);
      this.productService.getProductById(this.editId)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (p) => {
            this.name.set(p.name);
            this.description.set(p.description);
            this.price.set(p.price);
            this.imageUrl.set(p.imageUrl ?? '');
            this.category.set(p.category);
            this.stock.set(p.stock);
            this.loadingData.set(false);
          },
          error: () => { this.error.set('Failed to load product.'); this.loadingData.set(false); }
        });
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const validationError = this.uploadService.validate(file);
    if (validationError) {
      this.uploadError.set(validationError);
      input.value = '';
      return;
    }
    this.uploadError.set(null);
    this.uploading.set(true);
    this.uploadService.uploadImage(file).subscribe({
      next: (res) => {
        this.imageUrl.set(res.url);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.uploadError.set('Upload failed. Please try again.');
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  save(): void {
    this.loading.set(true);
    this.error.set(null);
    const request: CreateProductRequest = {
      name: this.name(),
      description: this.description(),
      price: this.price(),
      imageUrl: this.imageUrl(),
      category: this.category(),
      stock: this.stock(),
    };
    const call = this.isEdit() && this.editId !== null
      ? this.productService.updateProduct(this.editId, request)
      : this.productService.createProduct(request);

    call.subscribe({
      next: () => this.router.navigate(['/admin/products']),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Save failed.');
        this.loading.set(false);
      }
    });
  }
}
