// Auto-discovered lesson content — no per-lesson index.js needed.
// To add a lesson: create src/lessons/<part>/<slug>/ with meta.json,
// description.html, *.sv (starter), *.sol.sv (solution), then add the
// slug to the structure below.

// All lesson metadata in a single import — no glob needed.
// Content files (description.html, .sv, images) stay co-located in each
// lesson directory and are loaded lazily on demand via loadLessonContent().
import metas from './meta.js';

// Lazy content loaders — Vite transforms these only when first requested.
const htmlLoaders = import.meta.glob('./*/*/description.html', { query: '?raw', import: 'default' });
const starterLoaders = import.meta.glob(['./*/*/*.sv', '!./*/*/*.sol.sv'], { query: '?raw', import: 'default' });
const solutionLoaders = import.meta.glob('./*/*/*.sol.sv', { query: '?raw', import: 'default' });
const imageLoaders = import.meta.glob('./*/*/*.{png,jpg,jpeg,gif,svg,webp}', { query: '?url', import: 'default' });

function buildMetaMap() {
  const map = {};
  for (const [slug, meta] of Object.entries(metas)) {
    map[slug] = { slug, ...meta };
  }
  return map;
}

/**
 * Load the full content for a single lesson on demand.
 * Returns { html, files: { a, b } }.
 * Called by the lesson route's load() function, and can also be called
 * from an "offline download" feature to prefetch all lessons at once.
 */
export async function loadLessonContent(slug) {
  const [p, l] = slug.split('/');
  const prefix = `./${p}/${l}/`;

  const htmlEntry = Object.entries(htmlLoaders).find(([k]) => k.startsWith(prefix));
  const starterEntries = Object.entries(starterLoaders).filter(([k]) => k.startsWith(prefix));
  const solutionEntries = Object.entries(solutionLoaders).filter(([k]) => k.startsWith(prefix));
  const imageEntries = Object.entries(imageLoaders).filter(([k]) => k.startsWith(prefix));

  const [html, ...rest] = await Promise.all([
    htmlEntry ? htmlEntry[1]() : Promise.resolve(''),
    ...starterEntries.map(([k, fn]) => fn().then(content => ({ k, content, type: 'starter' }))),
    ...solutionEntries.map(([k, fn]) => fn().then(content => ({ k, content, type: 'solution' }))),
    ...imageEntries.map(([k, fn]) => fn().then(url => ({ k, url, type: 'image' }))),
  ]);

  const files = { a: {}, b: {} };
  const imageMap = {};

  for (const item of rest) {
    if (item.type === 'starter') {
      const m = item.k.match(/^\.\/([\w-]+)\/([\w-]+)\/(.+\.sv)$/);
      if (m) files.a[`/src/${m[3]}`] = item.content;
    } else if (item.type === 'solution') {
      const m = item.k.match(/^\.\/([\w-]+)\/([\w-]+)\/(.+)\.sol\.sv$/);
      if (m) files.b[`/src/${m[3]}.sv`] = item.content;
    } else if (item.type === 'image') {
      const m = item.k.match(/^\.\/([\w-]+)\/([\w-]+)\/(.+)$/);
      if (m) imageMap[m[3]] = item.url;
    }
  }

  // Rewrite relative image src attributes to Vite-resolved URLs
  const finalHtml = Object.keys(imageMap).length > 0
    ? html.replace(/src="([^"]+)"/g, (match, filename) => imageMap[filename] ? `src="${imageMap[filename]}"` : match)
    : html;

  return { html: finalHtml, files };
}

const metaMap = buildMetaMap();
const L = (slug) => metaMap[slug];

// ── Hierarchy ─────────────────────────────────────────────────────────────────
export const parts = [
  {
    title: 'Verilog Fundamentals',
    chapters: [
      { title: 'Boolean and Gates', lessons: [L('verilog/intro'), L('verilog/logic-basics'), L('verilog/gates')] },
      { title: 'Modules and Signals', lessons: [L('verilog/modules'), L('verilog/wires-regs'), L('verilog/operators')] },
      { title: 'Procedural Blocks', lessons: [L('verilog/always-blocks'), L('verilog/blocking'), L('verilog/if-case')] },
      { title: 'State and Memory', lessons: [L('verilog/sequential'), L('verilog/fsm'), L('verilog/memories')] },
      { title: 'Structure and Time', lessons: [L('verilog/parameters'), L('verilog/generate'), L('verilog/testbench'), L('verilog/clock-domains')] },
    ],
  },

  {
    title: 'FPGA Design',
    chapters: [
      { title: 'FPGA Fabric', lessons: [L('fpga/architecture'), L('fpga/resources')] },
      { title: 'Building a Bitstream', lessons: [L('fpga/flow'), L('fpga/timing')] },
      { title: 'Clocks and Debug', lessons: [L('fpga/clocking'), L('fpga/debug')] },
    ],
  },
  {
    title: 'ASIC Design',
    chapters: [
      { title: 'ASIC RTL', lessons: [L('asic/rtl-to-gds'), L('asic/stdcells'), L('asic/synthesis')] },
      { title: 'ASIC Physical Design', lessons: [L('asic/pnr'), L('asic/sta'), L('asic/signoff')] },
      { title: 'Test and Tradeoffs', lessons: [L('asic/dft'), L('asic/tradeoffs')] },
      { title: 'Open Silicon', lessons: [L('asic/open-tools'), L('asic/same-rtl')] },
    ],
  },
  {
    title: 'Tang Nano Boards',
    chapters: [
      { title: 'Nano 9K', lessons: [L('boards/nano9k-overview'), L('boards/nano9k-blink'), L('boards/nano9k-buttons'), L('boards/nano9k-uart'), L('boards/nano9k-pwm'), L('boards/nano9k-display')] },
      { title: 'Nano 20K', lessons: [L('boards/nano20k-overview'), L('boards/nano20k-blink'), L('boards/nano20k-buttons'), L('boards/nano20k-uart'), L('boards/nano20k-pwm'), L('boards/nano20k-hdmi')] },
      { title: 'Nano 4K', lessons: [L('boards/nano4k-overview'), L('boards/nano4k-blink')] },
      { title: 'Nano 1K', lessons: [L('boards/nano1k-overview'), L('boards/nano1k-blink')] },
      { title: 'Larger Sipeed Boards', lessons: [L('boards/primer20k')] },
    ],
  },
  {
    title: 'Chip Design & EE Concepts',
    chapters: [
      { title: 'Digital Foundations', lessons: [L('chip/number-systems'), L('chip/boolean-algebra')] },
      { title: 'Circuit Building Blocks', lessons: [L('chip/comb-circuits'), L('chip/seq-circuits')] },
      { title: 'Design Methodology', lessons: [L('chip/timing-analysis'), L('chip/fsm-design'), L('chip/memory-systems')] },
      { title: 'Silicon & Technology', lessons: [L('chip/cmos-basics'), L('chip/fpga-asic'), L('chip/design-flow')] },
      { title: 'Advanced Topics', lessons: [L('chip/power-analysis'), L('chip/verification-overview')] },
    ],
  },
];

export const lessons = parts.flatMap((part) =>
  part.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      ...lesson,
      partTitle: part.title,
      chapterTitle: chapter.title,
    }))
  )
);
