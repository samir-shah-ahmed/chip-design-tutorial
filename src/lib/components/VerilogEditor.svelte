<script>
  import { untrack } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { StreamLanguage } from '@codemirror/language';
  import { verilog } from '@codemirror/legacy-modes/mode/verilog';

  let { value = '', onchange, darkMode = false } = $props();
  let host;
  let view;

  function theme(dark) {
    return EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '0.85rem',
        backgroundColor: dark ? '#1e2422' : '#faf7ef',
        color: dark ? '#d4e8e0' : '#162123',
      },
      '.cm-scroller': { overflow: 'auto', height: '100%' },
      '.cm-gutters': {
        backgroundColor: dark ? '#181e1c' : '#f0ede4',
        color: dark ? '#5a7a72' : '#8a8070',
        borderRight: `1px solid ${dark ? '#2d3532' : '#d5cbb2'}`,
      },
      '&.cm-focused': { outline: 'none' },
    }, { dark });
  }

  $effect(() => {
    const dark = darkMode;
    const initial = untrack(() => value);
    const editor = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initial,
        extensions: [
          basicSetup,
          StreamLanguage.define(verilog),
          theme(dark),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onchange?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view = editor;
    return () => {
      editor.destroy();
      view = undefined;
    };
  });

  $effect(() => {
    const next = value;
    if (!view) return;
    if (next === view.state.doc.toString()) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
    });
  });
</script>

<div class="h-full min-h-0" bind:this={host}></div>
