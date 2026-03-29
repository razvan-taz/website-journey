import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appLazyImages]',
  standalone: true,
})
export class LazyImagesDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const images = this.el.nativeElement.querySelectorAll<HTMLImageElement>('img');
    images.forEach((img) => {
      img.setAttribute('loading', 'lazy');
    });
  }
}
