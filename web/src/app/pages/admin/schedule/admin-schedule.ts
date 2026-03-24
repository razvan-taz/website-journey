import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, ScheduleEntry } from '../../../services/site.service';

interface EditableEntry {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  description: string;
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
          this.editableEntries.set(data.map(e => ({
            dayOfWeek: e.dayOfWeek,
            dayName: e.dayName,
            startTime: e.startTime,
            endTime: e.endTime,
            description: e.description,
          })));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load schedule.');
          this.loading.set(false);
        },
      });
  }

  updateField(dayOfWeek: number, field: 'startTime' | 'endTime' | 'description', value: string): void {
    this.editableEntries.update(entries =>
      entries.map(e => e.dayOfWeek === dayOfWeek ? { ...e, [field]: value } : e)
    );
  }

  private formatAsTime(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    let clamped = '';
    for (let i = 0; i < digits.length; i++) {
      let d = parseInt(digits[i], 10);
      if (i === 0) d = Math.min(d, 2);
      else if (i === 1 && clamped[0] === '2') d = Math.min(d, 3);
      else if (i === 2) d = Math.min(d, 5);
      clamped += d;
    }
    if (clamped.length <= 2) return clamped;
    return clamped.slice(0, 2) + ':' + clamped.slice(2);
  }

  filterStartTime(event: Event, dayOfWeek: number): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatAsTime(input.value);
    input.value = formatted;
    this.updateField(dayOfWeek, 'startTime', formatted);
  }

  filterEndTime(event: Event, dayOfWeek: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const isNumeric = /^[0-9]*$/.test(value.replace(/:/g, ''));
    if (isNumeric && /^[0-9:]*$/.test(value)) {
      const formatted = this.formatAsTime(value);
      input.value = formatted;
      this.updateField(dayOfWeek, 'endTime', formatted);
    } else {
      this.updateField(dayOfWeek, 'endTime', value);
    }
  }

  save(): void {
    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);

    const rows = this.editableEntries().map(e => ({
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      description: e.description,
    }));

    this.siteService.updateSchedule({ rows })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.editableEntries.set(data.map(e => ({
            dayOfWeek: e.dayOfWeek,
            dayName: e.dayName,
            startTime: e.startTime,
            endTime: e.endTime,
            description: e.description,
          })));
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
