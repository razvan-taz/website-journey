import { Component, inject, signal, DestroyRef } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentService, Comment } from '../../../services/comment.service';

@Component({
  selector: 'app-admin-comments',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, FormsModule],
  templateUrl: './admin-comments.html',
  styleUrl: './admin-comments.css',
})
export class AdminCommentsComponent {
  private commentService = inject(CommentService);
  private destroyRef = inject(DestroyRef);

  comments = signal<Comment[]>([]);
  loading = signal(true);
  filterStatus = signal<string>('PENDING');

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.commentService.getAdminComments(this.filterStatus() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page: any) => { this.comments.set(page.content ?? page); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  approve(id: number) {
    this.commentService.approveComment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load() });
  }

  reject(id: number) {
    this.commentService.rejectComment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load() });
  }

  delete(id: number) {
    if (!confirm('Delete this comment permanently?')) return;
    this.commentService.deleteComment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.load() });
  }

  onFilterChange(status: string) {
    this.filterStatus.set(status);
    this.load();
  }
}
