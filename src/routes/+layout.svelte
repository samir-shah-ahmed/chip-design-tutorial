<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { onMount, untrack } from 'svelte';
  import '../app.css';
  import { getCirctRuntimeConfig, Z3_SCRIPT_URL } from '../runtime/circt-config.js';
  import {
    OFFLINE_APP_CACHE_PREFIX,
    OFFLINE_RUNTIME_CACHE,
    OFFLINE_STATE_KEY,
    offlineReadySentinelUrl,
    PYODIDE_MANIFEST_RELATIVE_PATH,
    UVM_MANIFEST_RELATIVE_PATH,
    buildConfiguredRuntimeUrls,
    dedupeStrings,
    joinBasePath,
  } from '$lib/offline-cache.js';
  import { darkMode } from '$lib/stores/settings.js';
  import { completedSlugs } from '$lib/stores/completed.js';
  import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarTrigger,
  } from '$lib/components/ui/sidebar/index.js';

  let { data, children } = $props();

  let currentSlug = $derived(
    $page.params.part ? `${$page.params.part}/${$page.params.name}` : null
  );
  let lessonIndex = $derived(data.lessons.findIndex(l => l.slug === currentSlug));
  let lesson = $derived(data.lessons[lessonIndex]);
  let breadcrumbs = $derived(lesson ? `${lesson.partTitle} / ${lesson.chapterTitle} / ${lesson.title}` : '');

  let sidebarOpen = $state(true);
  let expandedChapters = $state(new Set());
  let sidebarInnerEl = $state(null);
  let offlineMode = $state('idle');
  let offlineDone = $state(0);
  let offlineTotal = $state(0);
  let offlineMessage = $state('');
  let offlineCurrentAsset = $state('');
  let installPrompt = $state(null);
  const offlineFeatureEnabled = import.meta.env.PROD;
  const LEGACY_COI_CLEANUP_ONCE_KEY = 'svt:legacy-coi-cleanup-once';

  function runtimeBasePath() {
    return base ? `${base}/` : '/';
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isSameOriginAssetUrl(url) {
    try {
      return new URL(url, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function toAbsolute(url) {
    return new URL(String(url), window.location.href).href;
  }

  function basenameFromUrl(url) {
    try {
      const pathname = new URL(String(url), window.location.href).pathname;
      const base = pathname.split('/').filter(Boolean).pop() || pathname;
      return decodeURIComponent(base);
    } catch {
      return String(url || '');
    }
  }

  function compactAssetLabel(text, max = 18) {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(1, max - 1))}...`;
  }

  function offlineReadyMarkerUrl() {
    return toAbsolute(offlineReadySentinelUrl(runtimeBasePath()));
  }

  async function hasOfflineReadyMarker() {
    if (!browser || !('caches' in window)) return false;
    try {
      const cache = await caches.open(OFFLINE_RUNTIME_CACHE);
      const marker = await cache.match(offlineReadyMarkerUrl());
      return Boolean(marker);
    } catch {
      return false;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function ensureOfflineServiceWorker() {
    if (!offlineFeatureEnabled) return null;
    if (!browser || !('serviceWorker' in navigator)) return null;
    const swUrl = `${base || ''}/service-worker.js`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      type: 'module',
      updateViaCache: 'none'
    });
    await navigator.serviceWorker.ready;
    return registration;
  }

  async function cleanupLegacyCoiServiceWorker() {
    if (!browser || !('serviceWorker' in navigator)) return { removed: 0, controlledByLegacy: false };

    const isLegacyCoi = (scriptUrl) => String(scriptUrl || '').includes('coi-serviceworker.js');
    const controller = navigator.serviceWorker.controller;
    const controlledByLegacy = isLegacyCoi(controller?.scriptURL);

    const registrations = await navigator.serviceWorker.getRegistrations();
    const legacyRegs = registrations.filter((registration) =>
      isLegacyCoi(registration.active?.scriptURL) ||
      isLegacyCoi(registration.installing?.scriptURL) ||
      isLegacyCoi(registration.waiting?.scriptURL)
    );

    if (legacyRegs.length === 0) return { removed: 0, controlledByLegacy };

    const results = await Promise.all(legacyRegs.map((registration) => registration.unregister().catch(() => false)));
    const removed = results.filter(Boolean).length;
    return { removed, controlledByLegacy };
  }

  async function clearOfflineArtifacts() {
    if (!browser) return;
    localStorage.removeItem(OFFLINE_STATE_KEY);
    offlineMode = 'idle';
    offlineDone = 0;
    offlineTotal = 0;
    offlineMessage = '';
    offlineCurrentAsset = '';

    if ('serviceWorker' in navigator) {
      const scopeRoot = new URL(`${base || ''}/`, window.location.href).href;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => registration.scope.startsWith(scopeRoot))
          .map((registration) => registration.unregister().catch(() => false))
      );
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key === OFFLINE_RUNTIME_CACHE || key.startsWith(OFFLINE_APP_CACHE_PREFIX))
          .map((key) => caches.delete(key))
      );
    }
  }

  async function resetOfflineBundle() {
    if (!browser || offlineMode === 'downloading') return;
    await clearOfflineArtifacts();
  }

  async function resolveOfflineAssetUrls(config) {
    const basePath = runtimeBasePath();
    const urls = buildConfiguredRuntimeUrls({
      basePath,
      runtimeConfig: config,
      z3ScriptUrl: Z3_SCRIPT_URL,
    });

    const uvmManifestUrl = toAbsolute(joinBasePath(basePath, UVM_MANIFEST_RELATIVE_PATH));
    urls.push(uvmManifestUrl);
    try {
      const uvmManifest = await fetchJson(uvmManifestUrl);
      const srcBaseUrl = new URL('src/', uvmManifestUrl).href;
      for (const relPath of uvmManifest.files || []) {
        const rel = String(relPath || '').replace(/^\/+/, '');
        if (!rel || rel.includes('..')) continue;
        urls.push(new URL(rel, srcBaseUrl).href);
      }
    } catch {
      // Best-effort: UVM sources are only needed for UVM lessons.
    }

    const pyodideManifestUrl = toAbsolute(joinBasePath(basePath, PYODIDE_MANIFEST_RELATIVE_PATH));
    try {
      const pyodideManifest = await fetchJson(pyodideManifestUrl);
      const manifestBase = new URL(String(pyodideManifest.basePath || './'), pyodideManifestUrl).href;
      for (const relPath of pyodideManifest.files || []) {
        const rel = String(relPath || '').replace(/^\/+/, '');
        if (!rel || rel.includes('..')) continue;
        urls.push(new URL(rel, manifestBase).href);
      }
    } catch {
      // If no local manifest is present, we'll still cache configured pyodide URLs.
    }

    urls.push(toAbsolute(runtimeBasePath()));
    urls.push(toAbsolute(joinBasePath(basePath, '404.html')));
    urls.push(toAbsolute(joinBasePath(basePath, 'service-worker.js')));
    return dedupeStrings(urls);
  }

  function offlineButtonTitle() {
    if (!offlineFeatureEnabled) {
      return 'Offline bundle download is available in preview/prod builds';
    }
    if (offlineMode === 'downloading') {
      if (offlineTotal <= 0) return 'Preparing offline bundle...';
      if (offlineDone >= offlineTotal) return 'Finalizing offline bundle...';
      const current = offlineCurrentAsset ? ` (${offlineCurrentAsset})` : '';
      return `Downloading offline bundle (${offlineDone + 1}/${offlineTotal})${current}`;
    }
    if (offlineMode === 'ready') {
      return offlineMessage || 'Offline bundle is ready';
    }
    if (offlineMode === 'error') {
      return offlineMessage || 'Offline bundle download failed';
    }
    return 'Download offline bundle';
  }

  function offlineButtonLabel() {
    if (!offlineFeatureEnabled) return 'Offline bundle unavailable in dev mode';
    if (offlineMode === 'downloading') {
      if (offlineTotal <= 0) return 'Preparing offline bundle';
      if (offlineDone >= offlineTotal) return 'Finalizing offline bundle';
      return `Downloading offline bundle ${offlineDone + 1}/${offlineTotal}`;
    }
    if (offlineMode === 'ready') return 'Offline bundle ready';
    if (offlineMode === 'error') return 'Retry offline bundle download';
    return 'Download offline bundle';
  }

  function offlineProgressText() {
    if (offlineMode === 'downloading') {
      if (offlineTotal <= 0) return 'preparing...';
      if (offlineDone >= offlineTotal) return 'finalizing...';
      const current = offlineCurrentAsset ? ` ${offlineCurrentAsset}` : '';
      return `${offlineDone + 1}/${offlineTotal}${current}`;
    }
    if (offlineMode === 'ready') return 'offline ready';
    if (offlineMode === 'error') return 'download failed';
    return '';
  }

  async function downloadOfflineBundle() {
    if (!browser || !offlineFeatureEnabled || offlineMode === 'downloading') return;
    offlineMode = 'downloading';
    offlineDone = 0;
    offlineTotal = 0;
    offlineMessage = 'Preparing offline bundle...';
    offlineCurrentAsset = '';

    try {
      await ensureOfflineServiceWorker();
      const config = getCirctRuntimeConfig();
      const allUrls = await resolveOfflineAssetUrls(config);
      const urls = allUrls.filter((url) => isSameOriginAssetUrl(url));
      const skippedCrossOrigin = allUrls.length - urls.length;
      if (urls.length === 0) {
        throw new Error('No same-origin assets were found to cache');
      }

      offlineTotal = urls.length;
      const cache = await caches.open(OFFLINE_RUNTIME_CACHE);
      const readyMarkerRequest = new Request(offlineReadyMarkerUrl(), { method: 'GET' });
      const failures = [];
      let skippedMissing = 0;
      let bytes = 0;
      let success = 0;

      for (const url of urls) {
        offlineCurrentAsset = compactAssetLabel(basenameFromUrl(url));
        try {
          const request = new Request(url, {
            method: 'GET',
            cache: 'reload',
            headers: { 'x-svt-offline-refresh': '1' }
          });
          const response = await fetch(request);
          if (response.status === 404) {
            skippedMissing += 1;
            continue;
          }
          if (!response.ok && response.type !== 'opaque') {
            throw new Error(`HTTP ${response.status}`);
          }
          const contentLength = Number(response.headers.get('content-length') || 0);
          if (contentLength > 0) bytes += contentLength;
          await cache.put(request, response.clone());
          success += 1;
        } catch (error) {
          failures.push(`${url}: ${String(error?.message || error)}`);
        } finally {
          offlineDone += 1;
          if (offlineDone >= offlineTotal) offlineCurrentAsset = '';
        }
      }

      if (failures.length > 0) {
        await cache.delete(readyMarkerRequest);
        offlineMode = 'error';
        offlineMessage = `Cached ${success}/${offlineTotal} files. ${failures.length} failed.`;
        localStorage.removeItem(OFFLINE_STATE_KEY);
      } else {
        await cache.put(
          readyMarkerRequest,
          new Response('ready', {
            headers: { 'content-type': 'text/plain; charset=utf-8' }
          })
        );
        offlineMode = 'ready';
        offlineMessage = `Cached ${success} files (${formatBytes(bytes)}).`;
        if (skippedMissing > 0) {
          offlineMessage += ` Skipped ${skippedMissing} missing optional files.`;
        }
        if (skippedCrossOrigin > 0) {
          offlineMessage += ` Skipped ${skippedCrossOrigin} cross-origin URLs.`;
        }
        offlineCurrentAsset = '';
        localStorage.setItem(OFFLINE_STATE_KEY, 'ready');
      }
    } catch (error) {
      offlineMode = 'error';
      offlineMessage = String(error?.message || error || 'Offline download failed');
      offlineCurrentAsset = '';
      localStorage.removeItem(OFFLINE_STATE_KEY);
      if ('caches' in window) {
        caches
          .open(OFFLINE_RUNTIME_CACHE)
          .then((cache) => cache.delete(offlineReadyMarkerUrl()))
          .catch(() => {});
      }
    }
  }

  function toggleChapter(title) {
    if (expandedChapters.has(title)) {
      expandedChapters = new Set([...expandedChapters].filter(t => t !== title));
    } else {
      expandedChapters = new Set([...expandedChapters, title]);
    }
  }

  function navigateTo(l) {
    const [part, name] = l.slug.split('/');
    goto(`${base}/lesson/${part}/${name}`);
  }

  function step(delta) {
    const nextIndex = lessonIndex + delta;
    if (nextIndex < 0 || nextIndex >= data.lessons.length) return;
    navigateTo(data.lessons[nextIndex]);
  }

  // Apply dark mode class on <html>
  $effect(() => {
    if (browser) document.documentElement.classList.toggle('dark', $darkMode);
  });

  // Expand active chapter in sidebar on navigation.
  $effect(() => {
    const chap = lesson?.chapterTitle;
    if (chap) untrack(() => {
      if (!expandedChapters.has(chap)) {
        expandedChapters = new Set([...expandedChapters, chap]);
      }
    });
  });

  // Auto-scroll active sidebar item into view
  $effect(() => {
    lessonIndex;
    sidebarInnerEl?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  });

  function toggleDarkMode() {
    darkMode.update(v => !v);
  }

  function getPartLessons(part) {
    return part.chapters.flatMap((chapter) => chapter.lessons);
  }

  function getPartCompletedCount(part) {
    return getPartLessons(part).filter((lessonItem) => $completedSlugs.has(lessonItem.slug)).length;
  }

  onMount(() => {
    const onInstallPrompt = (event) => {
      event.preventDefault();
      installPrompt = event;
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    if (!window.matchMedia('(min-width: 980px)').matches) sidebarOpen = false;
    if (localStorage.getItem('svt:darkMode') === null) {
      darkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    (async () => {
      try {
        const legacy = await cleanupLegacyCoiServiceWorker();
        if (legacy.removed > 0 && legacy.controlledByLegacy) {
          if (sessionStorage.getItem(LEGACY_COI_CLEANUP_ONCE_KEY) !== '1') {
            sessionStorage.setItem(LEGACY_COI_CLEANUP_ONCE_KEY, '1');
            window.location.reload();
            return;
          }
        } else {
          sessionStorage.removeItem(LEGACY_COI_CLEANUP_ONCE_KEY);
        }
      } catch {
        // Best effort cleanup for older COI worker registrations.
      }

      if (!offlineFeatureEnabled) {
        clearOfflineArtifacts().catch(() => {});
        return;
      }
      // Register in production so the installed PWA can open the app shell offline.
      // Heavy toolchain files stay behind the explicit offline-bundle download.
      ensureOfflineServiceWorker().catch(() => {});
      const offlineRequested = localStorage.getItem(OFFLINE_STATE_KEY) === 'ready';
      if (offlineRequested) {
        hasOfflineReadyMarker()
          .then((ready) => {
            if (ready) {
              offlineMode = 'ready';
              offlineMessage = 'Offline bundle is ready';
              return;
            }
            localStorage.removeItem(OFFLINE_STATE_KEY);
          })
          .catch(() => {
            localStorage.removeItem(OFFLINE_STATE_KEY);
          });
      }
    })();
  });
</script>

{#snippet navItems()}
  <div bind:this={sidebarInnerEl} class="flex flex-col p-2 gap-0">
    {#each data.parts as part, pi}
      {#if pi > 0}<div class="border-t border-sidebar-border mx-1 my-2"></div>{/if}
      <div class="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground px-2 py-[0.3rem] mt-1 select-none flex items-center">
        <span>{part.title}</span>
        {#if getPartCompletedCount(part) > 0}
          <span class="text-[0.55rem] text-teal ml-auto flex-shrink-0">
            {getPartCompletedCount(part)}/{getPartLessons(part).length}
          </span>
        {/if}
      </div>
      {#each part.chapters as chapter}
        <button
          class="w-full flex items-center justify-between px-2 py-[0.28rem] rounded-[7px] transition-colors hover:bg-sidebar-accent text-left mt-[0.15rem]"
          onclick={() => toggleChapter(chapter.title)}
        >
          <span class="text-[0.71rem] text-muted-foreground italic">{chapter.title}</span>
          <span class="text-[0.6rem] text-muted-foreground opacity-60 ml-1 flex-shrink-0">
            {expandedChapters.has(chapter.title) ? '▾' : '▸'}
          </span>
        </button>
        {#if expandedChapters.has(chapter.title)}
          {#each chapter.lessons as item}
            {@const idx = data.lessons.findIndex(l => l.slug === item.slug)}
            <button
              class="w-full text-left text-[0.79rem] pl-[1.1rem] pr-2 py-[0.22rem] rounded-[7px] transition-colors leading-snug flex items-center gap-1 {idx === lessonIndex ? 'bg-tab-selected-bg text-teal font-medium' : 'text-foreground hover:bg-sidebar-accent'}"
              data-active={idx === lessonIndex}
              onclick={() => navigateTo(item)}
            >
              <span class="flex-1 truncate">{idx + 1}. {item.title}</span>
              {#if $completedSlugs.has(item.slug)}
                <span class="text-teal flex-shrink-0 ml-1">✓</span>
              {/if}
            </button>
          {/each}
        {/if}
      {/each}
    {/each}
  </div>
{/snippet}

<SidebarProvider bind:open={sidebarOpen} class="h-dvh overflow-hidden flex-col font-sans p-3 gap-[0.7rem] max-narrow:p-0 max-narrow:gap-0">

  <!-- Header spans full width above the sidebar+content row -->
  <header class="bg-surface border border-border rounded-[14px] shadow-app flex flex-col flex-shrink-0 max-narrow:rounded-none max-narrow:border-x-0 max-narrow:border-t-0">
      <!-- Row 1: logo + title + utility buttons -->
      <div class="flex items-center justify-between px-4 py-[0.6rem]">
        <div class="flex items-center gap-2">
          <a href="{base}/about" class="flex items-center gap-2 text-foreground no-underline" aria-label="About VeriBench">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="5" fill="#0d6f72"/>
              <path d="M5.5 6.2h4.4c2.7 0 4.4 1.5 4.4 4.8s-1.7 4.8-4.4 4.8H5.5V6.2z" fill="none" stroke="#fffdf7" stroke-width="1.5"/>
              <path d="M14.3 11H17" stroke="#fffdf7" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <h1 class="m-0 text-[1.05rem] font-semibold tracking-[0.01em]">VeriBench</h1>
          </a>
        </div>
        <div class="flex items-center gap-1">
          <a
            href="https://github.com/samir-shah-ahmed/chip-design-tutorial"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-surface-2 transition-colors text-muted-foreground"
            aria-label="View on GitHub" title="View on GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          {#if installPrompt}
            <button
              onclick={async () => {
                const prompt = installPrompt;
                if (!prompt) return;
                prompt.prompt();
                await prompt.userChoice;
                installPrompt = null;
              }}
              class="text-[0.72rem] px-2 py-1 rounded-[8px] border border-border hover:bg-surface-2 text-foreground"
              data-testid="pwa-install-button"
            >Install</button>
          {/if}
          <button
            onclick={downloadOfflineBundle}
            disabled={!offlineFeatureEnabled || offlineMode === 'downloading'}
            class="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-surface-2 transition-colors disabled:opacity-60 disabled:cursor-default {offlineMode === 'ready' ? 'text-teal' : 'text-muted-foreground'}"
            data-testid="offline-download-button"
            aria-label={offlineButtonLabel()}
            title={offlineButtonTitle()}
          >
            {#if offlineMode === 'downloading'}
              <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            {:else if offlineMode === 'ready'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5 7-6 7a1 1 0 0 1-1.5.05l-3-3a1 1 0 0 1 1.4-1.4l2.25 2.25 5.24-6.11A1 1 0 0 1 17 9Z" />
              </svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11 3a1 1 0 0 1 2 0v9.59l2.3-2.29a1 1 0 0 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.41L11 12.59V3Zm-7 14a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
              </svg>
            {/if}
          </button>
          {#if offlineMode !== 'idle'}
            <span
              class="text-[0.68rem] leading-none whitespace-nowrap max-w-[170px] overflow-hidden text-ellipsis px-2 py-[0.32rem] rounded-[8px] border {offlineMode === 'ready' ? 'text-teal border-teal/40 bg-teal/5' : offlineMode === 'error' ? 'text-destructive border-destructive/40 bg-destructive/5' : 'text-muted-foreground border-border bg-surface-2'}"
              data-testid="offline-download-status"
              aria-live="polite"
              title={offlineButtonTitle()}
            >
              {offlineProgressText()}
            </span>
            {#if offlineMode === 'ready' || offlineMode === 'error'}
              <button
                onclick={resetOfflineBundle}
                class="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-surface-2 transition-colors text-muted-foreground"
                data-testid="offline-reset-button"
                aria-label="Reset offline bundle"
                title="Reset offline bundle cache"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M6 6l1 14h10l1-14" />
                </svg>
              </button>
            {/if}
          {/if}
          <button
            onclick={toggleDarkMode}
            class="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-surface-2 transition-colors text-muted-foreground"
            aria-label={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {#if $darkMode}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            {:else}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            {/if}
          </button>
        </div>
      </div>
      <!-- Row 2: sidebar trigger + prev/next + breadcrumbs -->
      <div class="flex items-center gap-2 px-3 py-[0.35rem] border-t border-border">
        <SidebarTrigger
          class="flex items-center justify-center w-7 h-7 rounded-[7px] hover:bg-surface-2 transition-colors text-muted-foreground flex-shrink-0 [&>svg]:size-[14px]"
        />
        <button
          onclick={() => step(-1)}
          disabled={lessonIndex <= 0}
          class="flex items-center justify-center w-7 h-7 rounded-[7px] hover:bg-surface-2 transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-default"
          aria-label="Previous lesson" title="Previous lesson"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button
          onclick={() => step(1)}
          disabled={lessonIndex >= data.lessons.length - 1}
          class="flex items-center justify-center w-7 h-7 rounded-[7px] hover:bg-surface-2 transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-default"
          aria-label="Next lesson" title="Next lesson"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <span class="text-[0.82rem] text-muted-foreground">{breadcrumbs}</span>
      </div>
  </header>

  <!-- Sidebar + lesson content row (relative so the absolute sidebar is contained here) -->
  <div class="flex flex-1 min-h-0 relative overflow-hidden">
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarContent>
        {@render navItems()}
      </SidebarContent>
    </Sidebar>
    <main class="flex-1 min-w-0 flex flex-col">
      {@render children()}
    </main>
  </div>
</SidebarProvider>
