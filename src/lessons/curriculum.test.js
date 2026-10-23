import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { lessons, parts } from './index.js';

const lessonsDir = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_PARTS = [
  'Verilog Fundamentals',
  'FPGA Design',
  'ASIC Design',
  'Tang Nano Boards',
];

const REMOVED_PREFIXES = ['sv/', 'sva/', 'uvm/', 'cocotb/', 'mlir/'];

const REQUIRED_SLUGS = [
  'verilog/logic-basics',
  'verilog/blocking',
  'verilog/sequential',
  'verilog/fsm',
  'verilog/parameters',
  'verilog/generate',
  'verilog/memories',
  'verilog/clock-domains',
  'fpga/architecture',
  'fpga/flow',
  'fpga/timing',
  'fpga/clocking',
  'asic/rtl-to-gds',
  'asic/stdcells',
  'asic/open-tools',
  'asic/same-rtl',
  'boards/nano9k-overview',
  'boards/nano9k-blink',
  'boards/nano9k-uart',
  'boards/nano9k-display',
  'boards/nano20k-overview',
  'boards/nano20k-blink',
  'boards/nano20k-hdmi',
  'boards/nano4k-blink',
  'boards/nano1k-overview',
  'boards/primer20k',
];

describe('curriculum', () => {
  test('includes the verilog, fpga, asic, and tang nano tracks', () => {
    const titles = parts.map((part) => part.title);
    for (const title of REQUIRED_PARTS) expect(titles).toContain(title);
    for (const slug of REQUIRED_SLUGS) {
      expect(lessons.some((lesson) => lesson.slug === slug)).toBe(true);
    }
    for (const lesson of lessons) {
      expect(REMOVED_PREFIXES.some((prefix) => lesson.slug.startsWith(prefix))).toBe(false);
    }
  });

  test('new lessons ship a description, a starter, and a different solution', () => {
    for (const slug of REQUIRED_SLUGS) {
      const dir = path.join(lessonsDir, slug);
      const description = path.join(dir, 'description.html');
      expect(existsSync(description), description).toBe(true);
      const html = readFileSync(description, 'utf8');
      expect(html).toMatch(/Exercise/);
      expect(html).toMatch(/Sources/);
      const starters = readdirSync(dir).filter((name) => name.endsWith('.sv') && !name.endsWith('.sol.sv'));
      const solutions = readdirSync(dir).filter((name) => name.endsWith('.sol.sv'));
      expect(starters.length).toBeGreaterThan(0);
      expect(solutions.length).toBeGreaterThan(0);
      for (const solutionName of solutions) {
        const starterName = solutionName.replace(/\.sol\.sv$/, '.sv');
        const starter = readFileSync(path.join(dir, starterName), 'utf8');
        const solution = readFileSync(path.join(dir, solutionName), 'utf8');
        expect(solution).not.toBe(starter);
      }
    }
  });
});
