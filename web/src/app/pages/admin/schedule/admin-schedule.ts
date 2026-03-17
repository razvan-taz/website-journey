import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, ScheduleEntry } from '../../../services/site.service';

interface EditableEntry {
  dayOfWeek: number;
  dayName: string;
  content: string;
}

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-schedule.html',
  styleUrl: './admin-schedule.css',
})
export class AdminSchedule {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  entries = signal<ScheduleEntry[]>([]);
  editableEntries = signal<EditableEntry[]>([]);
  loading = signal(true);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.siteService.getAdminSchedule()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.editableEntries.set(data.map(e => ({ dayOfWeek: e.dayOfWeek, dayName: e.dayName, content: e.content })));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load schedule.');
          this.loading.set(false);
        },
      });
  }

  updateContent(dayOfWeek: number, content: string): void {
    this.editableEntries.update(entries =>
      entries.map(e => e.dayOfWeek === dayOfWeek ? { ...e, content } : e)
    );
  }

  save(): void {
    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);

    const rows = this.editableEntries().map(e => ({ dayOfWeek: e.dayOfWeek, content: e.content }));

    this.siteService.updateSchedule({ rows })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.editableEntries.set(data.map(e => ({ dayOfWeek: e.dayOfWeek, dayName: e.dayName, content: e.content })));
          this.saving.set(false);
          this.success.set(true);
          setTimeout(() => this.success.set(false), 3000);
        },
        error: () => {
          this.error.set('Failed to save schedule.');
          this.saving.set(false);
        },
      });
  }
}
