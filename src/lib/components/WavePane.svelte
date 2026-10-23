<script>
  import { onDestroy } from 'svelte';
  import { base } from '$app/paths';

  let { vcd = '' } = $props();
  let frame = $state(null);
  let ready = $state(false);
  let installed = $state(null);
  let blobUrl = '';
  const root = base ? `${base}/` : '/';

  $effect(() => {
    fetch(`${root}surfer/surfer.js`)
      .then((response) => {
        const type = (response.headers.get('content-type') || '').toLowerCase();
        installed = response.ok && /javascript|ecmascript/.test(type);
      })
      .catch(() => { installed = false; });
  });

  function publish(text) {
    if (!frame?.contentWindow || !text) return;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    frame.contentWindow.postMessage({ command: 'LoadUrl', url: blobUrl }, '*');
  }

  $effect(() => {
    if (!ready || !vcd) return;
    publish(vcd);
    const retries = [800, 2200, 4500].map((delay) => setTimeout(() => publish(vcd), delay));
    return () => retries.forEach(clearTimeout);
  });

  onDestroy(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  });
</script>

{#if installed === false}
  <p class="m-0 p-3 text-sm text-muted-foreground">Waveforms need Surfer in <code>static/surfer</code>. Run <code>scripts/setup-surfer.sh</code>.</p>
{:else}
  <iframe
    class="h-full w-full border-0 bg-white"
    title="Waveform"
    src="{root}surfer/"
    bind:this={frame}
    onload={() => { ready = true; }}
  ></iframe>
{/if}
