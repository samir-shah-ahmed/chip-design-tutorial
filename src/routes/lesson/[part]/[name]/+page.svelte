<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { getCirctWasmAdapter } from '$lib/circt.js';
  import { cloneFiles, filesEqual, mergeFiles, topNameFromFocus } from '$lib/lesson-utils.js';
  import { completedSlugs } from '$lib/stores/completed.js';
  import { darkMode } from '$lib/stores/settings.js';
  import VerilogEditor from '$lib/components/VerilogEditor.svelte';
  import WavePane from '$lib/components/WavePane.svelte';

  let { data } = $props();
  let lesson = $derived(data.lesson);
  let workspace = $state({});
  let selected = $state('');
  let menuOpen = $state(false);
  let running = $state(false);
  let logs = $state([]);
  let waveform = $state('');
  let showWaves = $state(false);

  let starter = $derived(lesson.files?.a || {});
  let solution = $derived(mergeFiles(starter, lesson.files?.b || {}));
  let solved = $derived(filesEqual(workspace, solution));
  let files = $derived(Object.keys(workspace));

  function storageKey(slug) {
    return `vb:file:${slug}`;
  }

  function loadWorkspace(current) {
    const fresh = cloneFiles(current.files?.a || {});
    let saved = null;
    if (browser) {
      try { saved = JSON.parse(localStorage.getItem(storageKey(current.slug)) || 'null'); } catch { saved = null; }
    }
    const next = saved && typeof saved === 'object' ? { ...fresh, ...saved } : fresh;
    workspace = next;
    selected = next[current.focus] != null ? current.focus : Object.keys(next)[0] || current.focus;
    logs = [];
    waveform = '';
    showWaves = false;
  }

  $effect(() => {
    loadWorkspace(lesson);
  });

  $effect(() => {
    const slug = lesson.slug;
    const snapshot = workspace;
    if (!browser || !slug) return;
    try { localStorage.setItem(storageKey(slug), JSON.stringify(snapshot)); } catch { /* private mode */ }
    if (filesEqual(snapshot, solution)) completedSlugs.update((set) => new Set(set).add(slug));
  });

  function onEdit(text) {
    workspace = { ...workspace, [selected]: text };
  }

  function toggleSolve() {
    workspace = solved ? cloneFiles(starter) : cloneFiles(solution);
  }

  async function run() {
    if (running) {
      getCirctWasmAdapter().cancel();
      logs = [...logs, '# run cancelled'];
      running = false;
      return;
    }
    running = true;
    logs = ['# compiling'];
    waveform = '';
    try {
      const result = await getCirctWasmAdapter().run({
        files: workspace,
        top: lesson.top || topNameFromFocus(lesson.focus),
        onLog: (line) => { logs = [...logs, line]; },
      });
      const seen = new Set(logs);
      for (const line of result.logs || []) {
        if (!seen.has(line)) logs = [...logs, line];
      }
      waveform = result.waveform?.text || '';
      if (waveform) showWaves = true;
    } catch (error) {
      logs = [...logs, `# ${error?.message || error}`];
    } finally {
      running = false;
    }
  }

  function onKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="flex items-center gap-2 border-b border-border px-3 py-2">
    <h2 data-testid="lesson-title" class="m-0 text-lg font-semibold">{lesson.title}</h2>
    <button
      type="button"
      class="ml-auto rounded-md border border-border px-2 py-1 text-sm"
      data-testid="options-button"
      aria-label="Editor options"
      onclick={() => { menuOpen = !menuOpen; }}
    >Options</button>
    {#if menuOpen}
      <button type="button" class="rounded-md bg-teal px-2 py-1 text-sm text-white" data-testid="solve-button" onclick={toggleSolve}>
        {solved ? 'Reset to starter' : 'Show solution'}
      </button>
    {/if}
    <button
      type="button"
      class="rounded-md bg-teal px-3 py-1 text-sm text-white"
      data-testid="run-button"
      aria-label={running ? 'Cancel' : 'Run'}
      onclick={run}
    >{running ? 'Cancel' : 'Run'}</button>
  </div>

  <div class="grid min-h-0 flex-1 grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
    <section class="grid min-h-0 grid-cols-[9rem_minmax(0,1fr)] border-b border-border">
      <div class="overflow-auto border-r border-border text-xs" role="tablist" aria-label="Files">
        {#each files as path}
          <button
            type="button"
            class="block w-full truncate px-2 py-1 text-left font-mono {path === selected ? 'bg-tab-selected-bg text-teal' : ''}"
            onclick={() => { selected = path; }}
          >{path.split('/').pop()}</button>
        {/each}
      </div>
      <div class="min-h-0 overflow-hidden">
        {#key selected}
          <VerilogEditor value={workspace[selected] || ''} darkMode={$darkMode} onchange={onEdit} />
        {/key}
      </div>
    </section>

    <section class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div class="flex gap-2 border-b border-border px-2 py-1">
        <button type="button" class="text-sm {showWaves ? '' : 'text-teal'}" data-testid="runtime-tab-logs" onclick={() => { showWaves = false; }}>Logs</button>
        <button type="button" class="text-sm {showWaves ? 'text-teal' : ''}" data-testid="runtime-tab-waves" onclick={() => { showWaves = true; }}>Waves</button>
      </div>
      {#if showWaves}
        <WavePane vcd={waveform} />
      {:else}
        <pre data-testid="runtime-logs" class="m-0 overflow-auto bg-logs-bg p-3 font-mono text-xs text-logs-text">{logs.join('\n')}</pre>
      {/if}
    </section>
  </div>

  <article class="max-h-48 overflow-auto border-t border-border px-4 py-3 text-sm">
    <div class="lesson-body">{@html lesson.html}</div>
  </article>
</div>
