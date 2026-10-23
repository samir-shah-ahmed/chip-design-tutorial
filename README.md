# VeriBench

VeriBench is an on-device learning bench for Verilog, FPGA design, and ASIC design. You edit a lesson, simulate it in the browser, and inspect the waveform. Nothing about the design is sent to a server.

The app is a SvelteKit site. The same static build is what you install as a progressive web app and what the desktop shell packages.

## License

The SystemVerilog, SVA, UVM, cocotb, and MLIR lessons from [thomasnormal/sv-tutorial](https://github.com/thomasnormal/sv-tutorial) have been removed. This repository does not keep that course text.

There is still no `LICENSE` file, and this README does not add one. When you want a grant for the lesson text and the app shell, the MIT License is the one to start from: it is short, and it does not try to relicense the tools below. Apache-2.0 is the alternative if you want a patent grant. Put the text in `LICENSE` yourself if you choose either one.

Third-party tools keep their own terms: [CIRCT](https://circt.llvm.org/) (Apache-2.0), [Surfer](https://surfer-project.org/), [Electron](https://www.electronjs.org/), and [Z3](https://github.com/Z3Prover/z3) via the `z3-solver` package. The in-browser simulator is built from the [thomasnormal/circt](https://github.com/thomasnormal/circt) fork of CIRCT. [Pyodide](https://pyodide.org/) is not downloaded; set `VITE_PYODIDE_URL` only if you add a Python runtime. Yosys, nextpnr, Project Apicula, OpenROAD, OpenLane, the SkyWater sky130 PDK, and the IHP open PDK are cited in the lessons and are not bundled.

## Run the web app

Requirements are pinned in `scripts/toolchain.lock.sh` (Node 22 for the frontend).

```bash
npm ci
npm run dev
```

Open the URL Vite prints. The first lesson is the start of the Verilog track.

A production build:

```bash
npm run build
npm run preview
```

Simulation needs the CIRCT WebAssembly artifacts under `static/circt/` (`circt-verilog` and `circt-sim`). Waveforms need Surfer under `static/surfer/`. The scripts are:

```bash
npm run setup:circt          # clone the pinned CIRCT fork
npm run build:circt          # requires the Emscripten version in scripts/toolchain.lock.sh
npm run local-publish:circt
scripts/setup-surfer.sh
```

`npm run bootstrap:repro` runs that sequence. CI downloads a published `circt-wasm` release when one exists; without those files the UI still loads and tells you the runtime is missing.

Copy `.env.example` to `.env` to point the runtime at different artifact URLs. Keep them same-origin (`/circt`, `/surfer`) if you want offline mode to cache them.

## Install the PWA

The production build registers a service worker and ships `manifest.webmanifest`.

1. `npm run build && npm run preview`, or open a deployed HTTPS copy.
2. Use the browser's install action (the in-app **Install** button appears when the browser fires `beforeinstallprompt`).
3. Click **Download offline bundle** in the header. That caches the app shell plus CIRCT wasm and Surfer.

After that download finishes, the installed app opens with the network off. The service worker precaches the lesson shell as soon as the production app loads. The toolchain files are large, so they wait for the download button instead of starting on first paint. A reload with no network, before that download, still opens lessons; Run will fail until the wasm is cached.

Dev mode (`npm run dev`) does not register the service worker.

## Desktop app

Electron is the shell, not Tauri. The tutorial depends on a current Chromium: WASM, a service worker, and cross-origin isolation for the same runtime the web app tests. Electron ships that runtime, so the desktop window matches the browser the lessons were written against. Tauri would be a smaller download, and it would also tie correctness to whatever WebKit or WebView2 the machine has. The cost of this choice is a larger installer.

The shell does not load `file://`. It serves the static `build/` directory on `127.0.0.1` with COOP/COEP headers, then opens that URL. No network is required after the app is packaged, provided `npm run build` was done with the runtime assets you want inside the package.

```bash
npm run desktop:dist:linux   # builds the site, then an unpacked Linux app in desktop/dist/
npm run desktop:start        # needs a prior npm run build and npm run desktop:install
```

From `desktop/`:

```bash
npm install
npm run dist:linux           # unpacked directory
npm run dist:linux:appimage  # AppImage, when FUSE or the AppImage tooling is available
npm run dist:mac             # macOS dmg, on a Mac, unsigned
npm run dist:win             # Windows NSIS, on Windows, unsigned
```

Unsigned Mac and Windows packages are what those scripts produce. Signing and notarization are not set up. GitHub Actions workflow `.github/workflows/desktop.yml` builds the unpacked Linux app and uploads it as an artifact.

## Curriculum

The sidebar order is the learning order.

- **Verilog Fundamentals** — what Verilog is, gates, modules, wires and regs, operators, `always`, blocking versus non-blocking, conditionals, counters, a sequence-detector FSM, memories, parameters, `generate`, testbenches, and a two-flop synchronizer.
- **FPGA Design** — LUTs, flip-flops, block RAM, DSP, and routing; the Yosys / nextpnr / bitstream flow; timing; resource choices; clock enables; on-board debug.
- **ASIC Design** — RTL to GDSII, standard cells and the sky130 and IHP PDKs, synthesis, floorplan through routing, static timing, DRC/LVS/signoff, scan, power and area, OpenLane and Tiny Tapeout, and how the same RTL diverges in the two flows.
- **Tang Nano Boards** — 9K and 20K overviews plus blinky, buttons, UART, PWM, and display/HDMI lessons. 4K and 1K overviews and blinkies. A Primer 20K device note. Pin numbers are cited in the lesson; where two sources disagree, the lesson says so.
- **Chip Design & EE Concepts** — short pages on number systems, Boolean algebra, CMOS, and the design flow. These were written in this repository. They are not the removed sv-tutorial tracks.

Each new lesson has a starter, a solution, and a testbench. The in-browser simulator checks the RTL. It does not run Yosys, nextpnr, or OpenROAD.

## What is still derived from the old shell

These pieces were not replaced in this pass. They are integration code for the CIRCT WebAssembly build, not lesson text:

- `src/runtime/circt-adapter.js` and the worker sources it loads. `run()` still knows how to compile a workspace that mentions UVM, but no lesson does.
- `src/runtime/circt-config.js`, which still names the `thomasnormal/circt` fork. The default tool list is `circt-verilog` and `circt-sim`.
- `scripts/setup-circt.sh`, `scripts/build-circt-wasm.sh`, `scripts/sync-circt-wasm.sh`, and `scripts/toolchain.lock.sh`, which pin `thomasnormal/circt`. The sync script can still pack a UVM bundle for that fork. This app does not load it.
- `scripts/setup-surfer.sh`, which downloads Surfer and applies the loader hooks the waveform pane posts messages to.
- `vite.config.js` cross-origin isolation headers, which the CIRCT runtime needs, and the copy of `z3-solver` into `z3/`. No lesson calls Z3.
- `src/lib/offline-cache.js` can still cache a Pyodide tree when `VITE_PYODIDE_URL` is set. The default download does not request one.

## What remains

- Choose and add a license (MIT, or Apache-2.0 if you want a patent grant). This repo does not add one for you.
- Tang Nano 1K `IO_LOC` lines. The device id is cited; a pin table was not copied because one was not checked line by line.
- Tang Nano 20K HDMI TMDS pairs. The lesson explains the timing generator and points at the schematic rather than inventing pins.
- Tang Primer dock labs (SDRAM, HDMI, the dock CST) beyond the device-id page.
- Tang Mega 138K / 60K tracks.
- Running Yosys, nextpnr, OpenROAD, or OpenLane inside the app. The lessons teach the commands; they do not invoke those tools.
- A real sky130 or IHP GDSII from a bundled PDK. Those kits are large and separately licensed.
- Signed macOS and Windows installers. The scripts are there; signing is not.
- End-to-end simulation of every new lesson in CI. That needs the CIRCT wasm release. Unit tests check that the lessons and solutions exist, and Icarus Verilog was used while writing them. The new Playwright tests load a handful of lessons and check the offline shell.

## Tests

```bash
npm test
npm run test:e2e -- e2e/curriculum-lessons.spec.js e2e/lessons.spec.js e2e/mobile-nav.spec.js e2e/offline-shell.spec.js
```

Those Playwright specs check navigation, solutions in the editor, and the offline shell. They do not need CIRCT wasm. A Chromium install is required (`npx playwright install chromium`).

## Toolchain notes

Pinned versions live in `scripts/toolchain.lock.sh`:

- Node major: `22`
- Emscripten (emsdk): `4.0.21`
- CIRCT repo: `https://github.com/thomasnormal/circt.git`
- CIRCT ref: `8e8ca87dcda1c8abd47103ae7789c8ed261d5de3`
- LLVM submodule ref: `972cd847efb20661ea7ee8982dd19730aa040c75`

`npm run check:req` checks the frontend tools. `npm run check:req:wasm` also checks `emcc`.

The CIRCT wasm build defaults to `CIRCT_WASM_JOBS=4`, a 30 minute configure timeout, and a 120 minute build timeout. Lessons need `circt-verilog` and `circt-sim`.
