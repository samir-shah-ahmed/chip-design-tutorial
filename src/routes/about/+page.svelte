<div class="lesson-body h-full overflow-auto px-4 py-3 max-w-3xl">
  <h2>VeriBench</h2>
  <p>
    VeriBench is Samir Shah Ahmed's on-device course for Verilog, FPGA design, and ASIC design.
    You edit a lesson, simulate it in the browser, and inspect the waveform. The design is not sent to a server.
    The same static build installs as a progressive web app and as a desktop app.
  </p>

  <h2>What you can learn here</h2>
  <ul>
    <li>Verilog from gates and modules through state machines, memories, testbenches, and clock-domain crossings.</li>
    <li>How an FPGA is built, how a bitstream is produced, and how timing and clocks behave on the Tang Nano parts.</li>
    <li>The RTL-to-GDSII path, standard cells, test, and the open tools around sky130, IHP, and Tiny Tapeout.</li>
    <li>Sipeed Tang Nano boards, with pin constraints cited from Sipeed and from the open board files those pins were checked against.</li>
    <li>Short chip-concept pages on number systems, CMOS, and the design flow that were written for this repository.</li>
  </ul>

  <h2>Tools</h2>
  <p>
    Simulation uses <a href="https://circt.llvm.org/">CIRCT</a> (Apache-2.0, part of LLVM).
    The browser build this app loads is produced from the
    <a href="https://github.com/thomasnormal/circt">thomasnormal/circt</a> fork; that fork is a separate project from these lessons.
    Waveforms use <a href="https://surfer-project.org/">Surfer</a>.
    The desktop shell uses <a href="https://www.electronjs.org/">Electron</a>.
    <a href="https://github.com/Z3Prover/z3">Z3</a> (the <code>z3-solver</code> package) is copied into the build and keeps its own license. Current lessons do not call it.
    <a href="https://pyodide.org/">Pyodide</a> is not downloaded. Set <code>VITE_PYODIDE_URL</code> only if you add a Python runtime; it keeps its own license.
    Yosys, nextpnr, Project Apicula, OpenROAD, OpenLane, the SkyWater sky130 PDK, and the IHP open PDK are cited in the lessons and keep their own licenses. They are not bundled here.
  </p>

  <h2>License</h2>
  <p>
    The SystemVerilog, SVA, UVM, cocotb, and MLIR lessons that came from
    <a href="https://github.com/thomasnormal/sv-tutorial">thomasnormal/sv-tutorial</a> have been removed.
    This tree does not claim those lessons, and it does not keep a dependency on that unlicensed course text.
  </p>
  <p>
    There is still no <code>LICENSE</code> file. A suggested grant for the owner to add, when they want one, is the
    <a href="https://opensource.org/license/mit">MIT License</a>: it is short, it covers the lesson text and the app shell,
    and it does not try to relicense CIRCT, Surfer, or Electron. Apache-2.0 is the alternative if a patent grant matters.
    This page does not apply either license. Add the text yourself if you choose one.
  </p>
  <p>
    A few integration files are still derived from the old tutorial shell. They are listed in the README.
    The largest is the CIRCT WebAssembly worker in <code>src/runtime/circt-adapter.js</code>, which speaks that toolchain's filesystem and command ABI.
  </p>

  <p><a href="https://github.com/samir-shah-ahmed/chip-design-tutorial">Source on GitHub</a></p>
</div>
