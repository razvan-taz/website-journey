import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem } from '../../services/article.service';
import { ProductService, ProductListItem } from '../../services/product.service';
import { NewsletterSignup } from '../../components/newsletter-signup/newsletter-signup';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CurrencyPipe, DatePipe, NewsletterSignup],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  articles = signal<ArticleListItem[]>([]);
  products = signal<ProductListItem[]>([]);
  articlesLoading = signal(true);
  productsLoading = signal(true);

  constructor() {
    const articleService = inject(ArticleService);
    const productService = inject(ProductService);
    const titleService = inject(Title);
    const metaService = inject(Meta);

    titleService.setTitle('Journey | Premium Content & Store');
    metaService.updateTag({
      name: 'description',
      content: 'Premium, insightful content and curated products — built to serve you, not the algorithm.',
    });

    articleService
      .getArticles(0, 6)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.articles.set(response.content);
          this.articlesLoading.set(false);
        },
        error: () => {
          this.articlesLoading.set(false);
        },
      });

    productService
      .getProducts(0, 4)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.products.set(response.content);
          this.productsLoading.set(false);
        },
        error: () => {
          this.productsLoading.set(false);
        },
      });
  }
}
