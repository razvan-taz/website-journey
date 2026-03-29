import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, CreateProductRequest, ProductDetail, ProductImage, ProductVariant, VariantRequest } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { UploadService } from '../../../services/upload.service';

interface AttrPair { key: string; value: string; }

interface VariantDraft {
  id: number | null;
  name: string;
  sku: string;
  stock: number;
  priceModifier: number;
  attrs: AttrPair[];
}

function emptyDraft(): VariantDraft {
  return { id: null, name: '', sku: '', stock: 0, priceModifier: 0, attrs: [{ key: '', value: '' }] };
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private uploadService = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  availableCategories = signal<string[]>([]);

  isEdit = signal(false);
  loading = signal(false);
  loadingData = signal(false);
  uploading = signal(false);
  uploadError = signal<string | null>(null);
  error = signal<string | null>(null);
  private editId: number | null = null;

  // Holds the full product in edit mode — used for gallery management
  currentProduct = signal<ProductDetail | null>(null);

  // ── Gallery ───────────────────────────────────────
  galleryUploading = signal(false);
  galleryError = signal<string | null>(null);

  name = signal('');
  description = signal('');
  price = signal(0);
  imageUrl = signal('');
  category = signal('');
  stock = signal(0);

  // ── Variants ─────────────────────────────────────
  variants = signal<ProductVariant[]>([]);
  showVariantForm = signal(false);
  variantDraft = signal<VariantDraft>(emptyDraft());
  variantSaving = signal(false);
  variantError = signal<string | null>(null);
  deletingVariantId = signal<number | null>(null);

  constructor() {
    this.categoryService.getAll().pipe(takeUntilDestroyed()).subscribe({
      next: (cats) => this.availableCategories.set(cats.map(c => c.name).sort()),
      error: () => {},
    });

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
            this.variants.set(p.variants ?? []);
            this.currentProduct.set(p);
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

  // ── Variant form ──────────────────────────────────

  openAddVariant(): void {
    this.variantDraft.set(emptyDraft());
    this.variantError.set(null);
    this.showVariantForm.set(true);
  }

  openEditVariant(v: ProductVariant): void {
    this.variantDraft.set({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.stock,
      priceModifier: v.priceModifier,
      attrs: Object.entries(v.attributes).map(([key, value]) => ({ key, value })),
    });
    this.variantError.set(null);
    this.showVariantForm.set(true);
  }

  cancelVariantForm(): void {
    this.showVariantForm.set(false);
    this.variantError.set(null);
  }

  addAttrRow(): void {
    this.variantDraft.update(d => ({ ...d, attrs: [...d.attrs, { key: '', value: '' }] }));
  }

  removeAttrRow(index: number): void {
    this.variantDraft.update(d => ({ ...d, attrs: d.attrs.filter((_, i) => i !== index) }));
  }

  updateAttr(index: number, field: 'key' | 'value', val: string): void {
    this.variantDraft.update(d => {
      const attrs = [...d.attrs];
      attrs[index] = { ...attrs[index], [field]: val };
      return { ...d, attrs };
    });
  }

  saveVariant(): void {
    const draft = this.variantDraft();
    if (!draft.name.trim()) {
      this.variantError.set('Variant name is required.');
      return;
    }
    const productId = this.editId;
    if (!productId) return;

    const attributes: Record<string, string> = {};
    draft.attrs.filter(a => a.key.trim()).forEach(a => { attributes[a.key.trim()] = a.value.trim(); });

    const request: VariantRequest = {
      name: draft.name,
      sku: draft.sku,
      stock: draft.stock,
      priceModifier: draft.priceModifier,
      attributes,
    };

    this.variantSaving.set(true);
    this.variantError.set(null);

    const call = draft.id !== null
      ? this.productService.updateVariant(productId, draft.id, request)
      : this.productService.createVariant(productId, request);

    call.subscribe({
      next: (saved) => {
        if (draft.id !== null) {
          this.variants.update(list => list.map(v => v.id === saved.id ? saved : v));
        } else {
          this.variants.update(list => [...list, saved]);
        }
        this.showVariantForm.set(false);
        this.variantSaving.set(false);
      },
      error: (err) => {
        this.variantError.set(err?.error?.message ?? 'Failed to save variant.');
        this.variantSaving.set(false);
      },
    });
  }

  deleteVariant(v: ProductVariant): void {
    const productId = this.editId;
    if (!productId || !confirm(`Delete variant "${v.name}"?`)) return;
    this.deletingVariantId.set(v.id);
    this.productService.deleteVariant(productId, v.id).subscribe({
      next: () => {
        this.variants.update(list => list.filter(x => x.id !== v.id));
        this.deletingVariantId.set(null);
      },
      error: () => {
        alert('Failed to delete variant.');
        this.deletingVariantId.set(null);
      },
    });
  }

  attrSummary(v: ProductVariant): string {
    return Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ');
  }

  // ── Gallery management ────────────────────────────

  additionalImages(): ProductImage[] {
    return this.currentProduct()?.additionalImages ?? [];
  }

  onGalleryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = this.uploadService.validate(file);
    if (validationError) {
      this.galleryError.set(validationError);
      input.value = '';
      return;
    }

    const productId = this.editId;
    if (!productId) return;

    if ((this.additionalImages().length) >= 7) {
      this.galleryError.set('Maximum 7 additional images allowed.');
      input.value = '';
      return;
    }

    this.galleryError.set(null);
    this.galleryUploading.set(true);

    this.uploadService.uploadImage(file).subscribe({
      next: (res) => {
        this.productService.addProductImage(productId, res.url).subscribe({
          next: (updated) => {
            this.currentProduct.set(updated);
            this.galleryUploading.set(false);
            input.value = '';
          },
          error: () => {
            this.galleryError.set('Failed to add image. Please try again.');
            this.galleryUploading.set(false);
            input.value = '';
          },
        });
      },
      error: () => {
        this.galleryError.set('Upload failed. Please try again.');
        this.galleryUploading.set(false);
        input.value = '';
      },
    });
  }

  deleteGalleryImage(imageId: number): void {
    const productId = this.editId;
    if (!productId) return;
    if (!confirm('Delete this gallery image?')) return;

    this.productService.deleteProductImage(productId, imageId).subscribe({
      next: (updated) => {
        this.currentProduct.set(updated);
      },
      error: () => {
        this.galleryError.set('Failed to delete image. Please try again.');
      },
    });
  }
}
