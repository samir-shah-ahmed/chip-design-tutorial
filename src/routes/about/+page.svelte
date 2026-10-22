<div class="lesson-body h-full overflow-auto px-4 py-3 max-w-3xl">
  <h2>VeriBench</h2>
  <p>
    VeriBench is Samir Shah Ahmed's on-device learning bench for Verilog, FPGA design, and ASIC design.
    Lessons run in the browser: edit the source, simulate it, and look at the waveform, without sending
    the design to a server. The same build installs as a progressive web app and as a desktop app.
  </p>

  <h2>What you can learn here</h2>
  <ul>
    <li>Verilog from gates and modules through state machines, memories, and clock-domain crossings.</li>
    <li>The SystemVerilog, assertion, UVM, cocotb, and CIRCT tracks that were already in this codebase.</li>
    <li>How an FPGA is built, how a bitstream is produced, and how timing and clocks behave.</li>
    <li>The RTL-to-GDSII path, standard cells, test, and the open tools around sky130, IHP, and Tiny Tapeout.</li>
    <li>Sipeed Tang Nano boards, with pin constraints cited from Sipeed and from the open board files those pins were checked against.</li>
  </ul>

  <h2>Credit</h2>
  <p>
    The interactive shell and the SystemVerilog, SVA, UVM, cocotb, and MLIR lessons come from
    <a href="https://github.com/thomasnormal/sv-tutorial">thomasnormal/sv-tutorial</a>,
    published by Normal Computing. VeriBench keeps that work and adds the tracks above.
    Simulation uses <a href="https://circt.llvm.org/">CIRCT</a>.
    Waveforms use <a href="https://surfer-project.org/">Surfer</a>.
    cocotb lessons use <a href="https://pyodide.org/">Pyodide</a>.
    Formal lessons use <a href="https://github.com/Z3Prover/z3">Z3</a>.
  </p>

  <h2>License</h2>
  <p>
    <strong>Upstream has no license.</strong>
    The GitHub API for thomasnormal/sv-tutorial reports <code>license: null</code>, and this repository
    has no <code>LICENSE</code> file either. Without a license, copyright stays with the authors and
    there is no public permission to copy, modify, or redistribute that code.
  </p>
  <p>
    This project does not invent a license to paper over that. Do not treat the repository as open source,
    and do not ship it as a product until the copyright holders grant one in writing. The new lesson text
    sits in the same unlicensed tree, so it does not get a separate grant from this commit.
  </p>
  <p>
    Tool licenses are separate. CIRCT, Surfer, Pyodide, Z3, Yosys, nextpnr, Project Apicula, OpenROAD,
    OpenLane, the SkyWater sky130 PDK, and the IHP open PDK each have their own terms. A desktop build
    that bundles their artifacts has to follow those terms too.
  </p>

  <p><a href="https://github.com/samir-shah-ahmed/chip-design-tutorial">Source on GitHub</a></p>
</div>
