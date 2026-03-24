import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavLayoutService, NavLayoutItem, NavZone } from '../../../services/nav-layout.service';

const ITEM_LABELS: Record<string, string> = {
  'logo':      'Logo',
  'live':      'Live Status',
  'nav-links': 'Nav Links',
  'schedule':  'Schedule',
  'search':    'Search',
  'cart':      'Cart',
  'signin':    'Sign In',
};

const ZONE_ORDER: Record<NavZone, number> = {
  'above-left': 0, 'above-center': 1, 'above-right': 2,
  'below-left': 3, 'below-center': 4, 'below-right': 5,
};

const ZONES: { value: NavZone; label: string }[] = [
  { value: 'above-left',   label: 'Above Left' },
  { value: 'above-center', label: 'Above Center' },
  { value: 'above-right',  label: 'Above Right' },
  { value: 'below-left',   label: 'Below Left' },
  { value: 'below-center', label: 'Below Center' },
  { value: 'below-right',  label: 'Below Right' },
];

const MAX_OFFSET_X = 500; // fallback; overridden at runtime by measured nav width
const MAX_OFFSET_Y = 26;
const MAX_HEIGHT   = 200;
const MAX_WIDTH    = 400;

@Component({
  selector: 'app-admin-nav-layout',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-nav-layout.html',
  styleUrl: './admin-nav-layout.css',
})
export class AdminNavLayout {
  private navLayoutService = inject(NavLayoutService);

  items  = signal<NavLayoutItem[]>([]);
  saving = signal(false);
  saved  = signal(false);

  zones = ZONES;

  logoItem = computed(() => this.items().find(i => i.itemKey === 'logo') ?? null);

  otherItems = computed(() =>
    [...this.items()]
      .filter(i => i.itemKey !== 'logo')
      .sort((a, b) => {
        const zo = ZONE_ORDER[a.zone as NavZone] - ZONE_ORDER[b.zone as NavZone];
        return zo !== 0 ? zo : a.sortOrder - b.sortOrder;
      })
  );

  constructor() {
    this.navLayoutService.getAdminNavLayout().subscribe({
      next: items => this.items.set(JSON.parse(JSON.stringify(items))),
      error: () => {},
    });
  }

  label(key: string): string { return ITEM_LABELS[key] ?? key; }

  // ── Zone ──────────────────────────────────────────────────────────────────

  setZone(item: NavLayoutItem, zone: NavZone) {
    const zoneItems = this.items().filter(i => i.zone === zone && i.itemKey !== item.itemKey);
    const maxOrder  = zoneItems.length > 0 ? Math.max(...zoneItems.map(i => i.sortOrder)) : -1;
    this.items.update(list =>
      list.map(i => i.itemKey === item.itemKey
        ? { ...i, zone, sortOrder: maxOrder + 1, offsetX: 0, offsetY: 0 }
        : i)
    );
  }

  // ── Order within zone ─────────────────────────────────────────────────────

  moveUp(item: NavLayoutItem) {
    const zoneItems = [...this.items()].filter(i => i.zone === item.zone).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = zoneItems.findIndex(i => i.itemKey === item.itemKey);
    if (idx <= 0) return;
    const prev = zoneItems[idx - 1];
    this.items.update(list => list.map(i => {
      if (i.itemKey === item.itemKey) return { ...i, sortOrder: prev.sortOrder };
      if (i.itemKey === prev.itemKey) return { ...i, sortOrder: item.sortOrder };
      return i;
    }));
  }

  moveDown(item: NavLayoutItem) {
    const zoneItems = [...this.items()].filter(i => i.zone === item.zone).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = zoneItems.findIndex(i => i.itemKey === item.itemKey);
    if (idx < 0 || idx >= zoneItems.length - 1) return;
    const next = zoneItems[idx + 1];
    this.items.update(list => list.map(i => {
      if (i.itemKey === item.itemKey) return { ...i, sortOrder: next.sortOrder };
      if (i.itemKey === next.itemKey) return { ...i, sortOrder: item.sortOrder };
      return i;
    }));
  }

  isFirst(item: NavLayoutItem): boolean {
    const z = [...this.items()].filter(i => i.zone === item.zone).sort((a, b) => a.sortOrder - b.sortOrder);
    return z[0]?.itemKey === item.itemKey;
  }

  isLast(item: NavLayoutItem): boolean {
    const z = [...this.items()].filter(i => i.zone === item.zone).sort((a, b) => a.sortOrder - b.sortOrder);
    return z[z.length - 1]?.itemKey === item.itemKey;
  }

  // ── Offset X ──────────────────────────────────────────────────────────────

  private get maxX(): number { return this.navLayoutService.navWidth(); }

  private clampX(zone: string, value: number): number {
    return Math.max(-this.maxX, Math.min(this.maxX, value));
  }

  adjustOffsetX(item: NavLayoutItem, delta: number) {
    const next = this.clampX(item.zone, (item.offsetX ?? 0) + delta);
    this.items.update(list => list.map(i => i.itemKey === item.itemKey ? { ...i, offsetX: next } : i));
  }

  setOffsetX(item: NavLayoutItem, raw: number) {
    const next = this.clampX(item.zone, Math.round(raw) || 0);
    this.items.update(list => list.map(i => i.itemKey === item.itemKey ? { ...i, offsetX: next } : i));
  }

  canNudgeLeft(item: NavLayoutItem):  boolean { return (item.offsetX ?? 0) > -MAX_OFFSET_X; }
  canNudgeRight(item: NavLayoutItem): boolean { return (item.offsetX ?? 0) < MAX_OFFSET_X; }

  // ── Offset Y ──────────────────────────────────────────────────────────────

  adjustOffsetY(item: NavLayoutItem, delta: number) {
    const next = Math.max(-MAX_OFFSET_Y, Math.min(MAX_OFFSET_Y, (item.offsetY ?? 0) + delta));
    this.items.update(list => list.map(i => i.itemKey === item.itemKey ? { ...i, offsetY: next } : i));
  }

  setOffsetY(item: NavLayoutItem, raw: number) {
    const next = Math.max(-MAX_OFFSET_Y, Math.min(MAX_OFFSET_Y, Math.round(raw) || 0));
    this.items.update(list => list.map(i => i.itemKey === item.itemKey ? { ...i, offsetY: next } : i));
  }

  canNudgeUp(item: NavLayoutItem):   boolean { return (item.offsetY ?? 0) < MAX_OFFSET_Y; }
  canNudgeDown(item: NavLayoutItem): boolean { return (item.offsetY ?? 0) > -MAX_OFFSET_Y; }

  // ── Height / Width (logo only) ────────────────────────────────────────────

  adjustHeight(item: NavLayoutItem, delta: number) {
    const next = Math.max(0, Math.min(MAX_HEIGHT, (item.heightPx ?? 0) + delta));
    this.items.update(list => list.map(i =>
      i.itemKey === item.itemKey ? { ...i, heightPx: next === 0 ? null : next } : i
    ));
  }

  setHeight(item: NavLayoutItem, raw: number) {
    const next = Math.max(0, Math.min(MAX_HEIGHT, Math.round(raw) || 0));
    this.items.update(list => list.map(i =>
      i.itemKey === item.itemKey ? { ...i, heightPx: next === 0 ? null : next } : i
    ));
  }

  adjustWidth(item: NavLayoutItem, delta: number) {
    const next = Math.max(0, Math.min(MAX_WIDTH, (item.widthPx ?? 0) + delta));
    this.items.update(list => list.map(i =>
      i.itemKey === item.itemKey ? { ...i, widthPx: next === 0 ? null : next } : i
    ));
  }

  setWidth(item: NavLayoutItem, raw: number) {
    const next = Math.max(0, Math.min(MAX_WIDTH, Math.round(raw) || 0));
    this.items.update(list => list.map(i =>
      i.itemKey === item.itemKey ? { ...i, widthPx: next === 0 ? null : next } : i
    ));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  save() {
    this.saving.set(true);
    this.navLayoutService.saveNavLayout(this.items()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
      error: () => this.saving.set(false),
    });
  }
}
