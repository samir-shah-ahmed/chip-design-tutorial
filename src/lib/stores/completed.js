import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const KEY = 'vb:done';
let initial = [];
if (browser) {
  try { initial = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { initial = []; }
}
export const completedSlugs = writable(new Set(initial));
if (browser) {
  completedSlugs.subscribe((slugs) => {
    try { localStorage.setItem(KEY, JSON.stringify([...slugs])); } catch { /* private mode */ }
  });
}
