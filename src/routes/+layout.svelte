<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import '../app.css';
  import { getCirctRuntimeConfig } from '../runtime/circt-config.js';
  import {
    OFFLINE_RUNTIME_CACHE,
    OFFLINE_STATE_KEY,
    buildConfiguredRuntimeUrls,
    joinBasePath,
    offlineReadySentinelUrl,
  } from '$lib/offline-cache.js';
  import { darkMode } from '$lib/stores/settings.js';
  import { completedSlugs } from '$lib/stores/completed.js';

  let { data, children } = $props();

  let navOpen = $state(true);
  let openChapters = $state(new Set());
  let installPrompt = $state(null);
  let offlineMode = $state('idle');
  let offlineDone = $state(0);
  let offlineTotal = $state(0);
  let offlineNote = $state('');
  const offlineEnabled = import.meta.env.PROD;

  let slug = $derived($page.params.part ? `${$page.params.part}/${$page.params.name}` : '');
  let index = $derived(data.lessons.findIndex((lesson) => lesson.slug === slug));
  let lesson = $derived(index >= 0 ? data.lessons[index] : null);

  $effect(() => {
    if (browser) document.documentElement.classList.toggle('dark', $darkMode);
  });

  $effect(() => {
    const title = lesson?.chapterTitle;
    if (!title || openChapters.has(title)) return;
    openChapters = new Set([...openChapters, title]);
  });

  function hrefFor(item) {
    const [part, name] = item.slug.split('/');
    return `${base}/lesson/${part}/${name}`;
  }

  function step(delta) {
    const next = data.lessons[index + delta];
    if (next) goto(hrefFor(next));
  }

  function toggleChapter(title) {
    const next = new Set(openChapters);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    openChapters = next;
  }

  function partProgress(part) {
    const items = part.chapters.flatMap((chapter) => chapter.lessons);
    const done = items.filter((item) => $completedSlugs.has(item.slug)).length;
    return { done, total: items.length };
  }

  async function registerWorker() {
    if (!offlineEnabled || !browser || !('serviceWorker' in navigator)) return;
    await navigator.serviceWorker.register(`${base || ''}/service-worker.js`, { type: 'module' });
    await navigator.serviceWorker.ready;
  }

  async function downloadBundle() {
    if (!offlineEnabled || offlineMode === 'downloading') return;
    offlineMode = 'downloading';
    offlineDone = 0;
    offlineNote = 'Preparing offline bundle...';
    try {
      await registerWorker();
      const urls = buildConfiguredRuntimeUrls({
        basePath: `${base || ''}/`,
        runtimeConfig: getCirctRuntimeConfig(),
      }).filter((url) => {
        try { return new URL(url, window.location.href).origin === window.location.origin; }
        catch { return false; }
      });
      urls.push(new URL(joinBasePath(`${base || ''}/`, '404.html'), window.location.href).href);
      offlineTotal = urls.length;
      const cache = await caches.open(OFFLINE_RUNTIME_CACHE);
      let failures = 0;
      let skipped = 0;
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            cache: 'reload',
            headers: { 'x-vb-offline-refresh': '1' },
          });
          if (response.status === 404) skipped += 1;
          else if (!response.ok) failures += 1;
          else await cache.put(url, response.clone());
        } catch {
          failures += 1;
        }
        offlineDone += 1;
      }
      if (failures > 0) {
        offlineMode = 'error';
        offlineNote = `Cached with ${failures} failures.`;
        localStorage.removeItem(OFFLINE_STATE_KEY);
        return;
      }
      await cache.put(offlineReadySentinelUrl(`${base || ''}/`), new Response('ready'));
      localStorage.setItem(OFFLINE_STATE_KEY, 'ready');
      offlineMode = 'ready';
      offlineNote = skipped ? `Offline ready. Skipped ${skipped} missing files.` : 'Offline ready';
    } catch (error) {
      offlineMode = 'error';
      offlineNote = String(error?.message || error);
      localStorage.removeItem(OFFLINE_STATE_KEY);
    }
  }

  async function resetBundle() {
    localStorage.removeItem(OFFLINE_STATE_KEY);
    offlineMode = 'idle';
    offlineNote = '';
    if ('caches' in window) await caches.delete(OFFLINE_RUNTIME_CACHE);
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  }

  onMount(() => {
    if (!window.matchMedia('(min-width: 980px)').matches) navOpen = false;
    const onPrompt = (event) => {
      event.preventDefault();
      installPrompt = event;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    registerWorker().catch(() => {});
    if (localStorage.getItem(OFFLINE_STATE_KEY) === 'ready') {
      offlineMode = 'ready';
      offlineNote = 'Offline ready';
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  });
</script>

<div class="flex h-dvh flex-col bg-bg text-ink">
  <header class="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm hover:bg-surface-2"
      aria-label="Toggle sidebar"
      onclick={() => { navOpen = !navOpen; }}
    >Menu</button>
    <a href="{base}/about" class="no-underline" aria-label="About VeriBench"><h1 class="m-0 text-base font-semibold text-ink">VeriBench</h1></a>
    <button type="button" class="rounded-md px-2 py-1 text-sm disabled:opacity-30" aria-label="Previous lesson" disabled={index <= 0} onclick={() => step(-1)}>Prev</button>
    <button type="button" class="rounded-md px-2 py-1 text-sm disabled:opacity-30" aria-label="Next lesson" disabled={index < 0 || index >= data.lessons.length - 1} onclick={() => step(1)}>Next</button>
    <span class="truncate text-sm text-muted-foreground">{lesson ? lesson.title : ''}</span>
    <span class="ml-auto flex items-center gap-2">
      {#if installPrompt}
        <button
          type="button"
          class="rounded-md border border-border px-2 py-1 text-xs"
          data-testid="pwa-install-button"
          onclick={async () => {
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
          }}
        >Install</button>
      {/if}
      <button
        type="button"
        class="rounded-md border border-border px-2 py-1 text-xs"
        data-testid="offline-download-button"
        aria-label={offlineMode === 'ready' ? 'Offline bundle ready' : 'Download offline bundle'}
        onclick={downloadBundle}
      >{offlineMode === 'ready' ? 'Offline ready' : 'Download offline bundle'}</button>
      {#if offlineMode !== 'idle'}
        <span data-testid="offline-download-status" class="text-xs text-muted-foreground">
          {offlineMode === 'downloading' ? (offlineTotal ? `${offlineDone}/${offlineTotal}` : 'preparing...') : offlineNote}
        </span>
        <button type="button" class="text-xs underline" data-testid="offline-reset-button" onclick={resetBundle}>Reset</button>
      {/if}
      <button
        type="button"
        class="rounded-md px-2 py-1 text-sm hover:bg-surface-2"
        aria-label={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onclick={() => darkMode.update((value) => !value)}
      >{$darkMode ? 'Light' : 'Dark'}</button>
    </span>
  </header>

  <div class="flex min-h-0 flex-1">
    <nav
      data-testid="course-nav"
      data-open={navOpen ? 'true' : 'false'}
      class="shrink-0 overflow-y-auto border-r border-border bg-surface {navOpen ? 'w-72' : 'w-0 border-r-0'}"
    >
      {#each data.parts as part, partIndex}
        <div class="px-3 pt-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
          {part.title}
          {#if partProgress(part).done > 0}
            <span class="float-right">{partProgress(part).done}/{partProgress(part).total}</span>
          {/if}
        </div>
        {#each part.chapters as chapter}
          <button type="button" class="block w-full px-3 py-1 text-left text-sm italic text-muted-foreground" onclick={() => toggleChapter(chapter.title)}>
            {chapter.title}
          </button>
          {#if openChapters.has(chapter.title)}
            {#each chapter.lessons as item}
              <a
                href={hrefFor(item)}
                class="block truncate px-5 py-1 text-sm no-underline {item.slug === slug ? 'bg-tab-selected-bg text-teal' : 'text-ink'}"
              >{item.title}{#if $completedSlugs.has(item.slug)} ✓{/if}</a>
            {/each}
          {/if}
        {/each}
        {#if partIndex < data.parts.length - 1}<div class="mx-3 mt-2 border-t border-border"></div>{/if}
      {/each}
    </nav>
    <main class="min-w-0 flex-1">
      {@render children()}
    </main>
  </div>
</div>
