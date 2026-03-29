import { Component, inject, signal } from '@angular/core';
import { CategoryService, CategoryDto } from '../../../services/category.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.css',
})
export class AdminCategories {
  private categoryService = inject(CategoryService);

  categories = signal<CategoryDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  editingId = signal<number | null>(null);
  formName = signal('');
  formError = signal<string | null>(null);
  saving = signal(false);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (data) => {
        this.categories.set(data.sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load categories.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEdit(cat: CategoryDto): void {
    this.editingId.set(cat.id);
    this.formName.set(cat.name);
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    const name = this.formName().trim();
    if (!name) {
      this.formError.set('Category name is required.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    const id = this.editingId();
    const op = id
      ? this.categoryService.update(id, name)
      : this.categoryService.create(name);

    op.subscribe({
      next: (saved) => {
        if (id) {
          this.categories.update(list => list.map(c => c.id === id ? saved : c).sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          this.categories.update(list => [...list, saved].sort((a, b) => a.name.localeCompare(b.name)));
        }
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err) => {
        this.formError.set(err?.error?.message ?? 'Failed to save category.');
        this.saving.set(false);
      },
    });
  }

  deleteCategory(cat: CategoryDto): void {
    if (!confirm(`Delete category "${cat.name}"? Products assigned to it will keep their category label.`)) return;
    this.categoryService.delete(cat.id).subscribe({
      next: () => this.categories.update(list => list.filter(c => c.id !== cat.id)),
      error: () => alert('Failed to delete category.'),
    });
  }
}
