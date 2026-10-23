import { browser } from '$app/environment';
import { writable } from 'svelte/store';

function savedFlag(key, fallback) {
  if (!browser) return writable(fallback);
  const raw = localStorage.getItem(key);
  let value = fallback;
  if (raw !== null) {
    try { value = JSON.parse(raw); } catch { value = fallback; }
  }
  const store = writable(value);
  store.subscribe((next) => {
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
  });
  return store;
}

export const darkMode = savedFlag('vb:dark', false);
