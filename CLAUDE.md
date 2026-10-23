# CLAUDE.md

VeriBench is a SvelteKit app. Lessons live in `src/lessons/<part>/<slug>/` with `description.html`, starter `*.sv`, and `*.sol.sv` solutions. `src/lessons/meta.js` and `src/lessons/index.js` define the sidebar.

Tracks: Verilog Fundamentals, FPGA Design, ASIC Design, Tang Nano Boards, and Chip Design & EE Concepts. There is no SystemVerilog, SVA, UVM, cocotb, or MLIR track.

```bash
npm ci
npm run dev
npm test
npm run build
```

Simulation uses CIRCT wasm (`circt-verilog`, `circt-sim`) under `static/circt/`. Waveforms use Surfer under `static/surfer/`, loaded by `src/lib/components/WavePane.svelte`. The worker that invokes CIRCT is `src/runtime/circt-adapter.js`.

Production registers `src/service-worker.js`. Heavy files under `circt/` and `surfer/` are cached only after **Download offline bundle**.

The desktop shell is Electron in `desktop/`. It serves `build/` on `127.0.0.1`.

```bash
npm run desktop:dist:linux
```
