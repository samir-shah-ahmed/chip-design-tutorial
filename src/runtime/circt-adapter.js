import { CIRCT_FORK_REPO, getCirctRuntimeConfig, getRuntimeBasePath } from './circt-config.js';
import { WORKER_RUNTIME_HELPERS_SOURCE } from './worker-runtime-helpers-source.js';

function filename(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

function ext(path) {
  const base = filename(path);
  const idx = base.lastIndexOf('.');
  return idx === -1 ? '' : base.slice(idx).toLowerCase();
}

function normalizePath(path) {
  if (!path) return '/workspace/input.sv';
  if (path.startsWith('/workspace/')) return path;
  if (path.startsWith('/')) return `/workspace${path}`;
  return `/workspace/${path}`;
}

function dirname(path) {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return '/';
  return path.slice(0, idx);
}

function joinPosix(base, rel) {
  if (!rel) return base;
  if (rel.startsWith('/')) return rel;
  const stack = base.split('/').filter(Boolean);
  for (const part of rel.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return `/${stack.join('/')}`;
}

function sourcePathsFromWorkspace(files) {
  return Object.keys(files)
    .filter((path) => ['.sv', '.v'].includes(ext(path)))
    .sort();
}

function mlirPathsFromWorkspace(files) {
  return Object.keys(files)
    .filter((path) => ext(path) === '.mlir')
    .sort();
}

function compileRootSourcePaths(files) {
  const svPaths = sourcePathsFromWorkspace(files);
  const fileSet = new Set(Object.keys(files));
  const includedSources = new Set();

  for (const path of svPaths) {
    const content = files[path];
    if (typeof content !== 'string') continue;

    const includePattern = /^\s*`include\s+"([^"]+)"/gm;
    for (const match of content.matchAll(includePattern)) {
      const includePath = match[1];
      if (!includePath) continue;

      const resolved = joinPosix(dirname(path), includePath);
      if (!fileSet.has(resolved)) continue;
      if (!['.sv', '.v'].includes(ext(resolved))) continue;
      includedSources.add(resolved);
    }
  }

  const roots = svPaths.filter((path) => !includedSources.has(path));
  return roots.length ? roots : svPaths;
}

function bundleCompileRoots(files, compileRoots, { enabled = false, force = false } = {}) {
  if (!enabled || !Array.isArray(compileRoots) || compileRoots.length === 0) {
    return { files, roots: compileRoots, bundled: false, rootCount: compileRoots?.length || 0 };
  }
  if (!force && compileRoots.length <= 1) {
    return { files, roots: compileRoots, bundled: false, rootCount: compileRoots?.length || 0 };
  }

  const bundlePath = '/__svt_uvm_bundle.sv';
  const includeLines = compileRoots.map((path) => {
    const normalized = normalizePath(path);
    const relative = normalized.startsWith('/workspace/')
      ? normalized.slice('/workspace/'.length)
      : normalized.replace(/^\/+/, '');
    return `\`include "${relative}"`;
  });

  return {
    files: { ...files, [bundlePath]: `${includeLines.join('\n')}\n` },
    roots: [bundlePath],
    bundled: true,
    rootCount: compileRoots.length,
    bundlePath: normalizePath(bundlePath)
  };
}

function containsPath(files, basename) {
  return Object.keys(files).some((path) => filename(path).toLowerCase() === basename.toLowerCase());
}

function moduleNamesFromWorkspace(files) {
  const names = new Set();
  for (const path of sourcePathsFromWorkspace(files)) {
    const content = files[path];
    if (typeof content !== 'string') continue;
    const pattern = /^\s*module\s+([A-Za-z_]\w*)\b/gm;
    for (const match of content.matchAll(pattern)) {
      if (match[1]) names.add(match[1]);
    }
  }
  for (const path of mlirPathsFromWorkspace(files)) {
    const content = files[path];
    if (typeof content !== 'string') continue;
    const pattern = /^\s*hw\.module\s+@([A-Za-z_]\w*)\b/gm;
    for (const match of content.matchAll(pattern)) {
      if (match[1]) names.add(match[1]);
    }
  }
  return names;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickMlirSourcePath(files, fallbackTop = '') {
  const mlirPaths = mlirPathsFromWorkspace(files);
  if (!mlirPaths.length) return null;

  if (fallbackTop) {
    const topPattern = new RegExp(`^\\s*hw\\.module\\s+@${escapeRegExp(fallbackTop)}\\b`, 'm');
    const topMatchPath = mlirPaths.find((path) => {
      const content = files[path];
      return typeof content === 'string' && topPattern.test(content);
    });
    if (topMatchPath) return topMatchPath;

    const basenameMatchPath = mlirPaths.find(
      (path) => filename(path).replace(/\.[^.]+$/, '') === fallbackTop
    );
    if (basenameMatchPath) return basenameMatchPath;
  }

  return mlirPaths[0];
}

function needsUvmLibrary(files) {
  return Object.values(files).some((content) =>
    typeof content === 'string' &&
    (/`include\s+"uvm_macros\.svh"/.test(content) ||
      /\bimport\s+uvm_pkg::\*/.test(content) ||
      /`uvm_[A-Za-z0-9_]+/.test(content))
  );
}

// circt-sim inlines child-instance ports as dotted names (e.g. "dut.sum") into
// the parent scope alongside the parent wire ("result"). Strip those duplicates
// so the waveform viewer only shows the canonical wire name.
function removeInlinedPortsFromVcd(vcd) {
  if (typeof vcd !== 'string') return vcd;
  const lines = vcd.split('\n');
  const skipIds = new Set();

  for (const line of lines) {
    const m = line.match(/\$var\s+\S+\s+\d+\s+(\S+)\s+(\S+)(?:\s+\[\S+\])?\s+\$end/);
    if (m && m[2].includes('.')) skipIds.add(m[1]);
  }
  if (skipIds.size === 0) return vcd;

  return lines.filter((line) => {
    const t = line.trim();
    if (/\$var/.test(t)) {
      const m = t.match(/\$var\s+\S+\s+\d+\s+(\S+)/);
      if (m && skipIds.has(m[1])) return false;
    }
    const bm = t.match(/^b\S+\s+(\S+)$/);
    if (bm && skipIds.has(bm[1])) return false;
    const sm = t.match(/^[01xzXZ](\S+)$/);
    if (sm && skipIds.has(sm[1])) return false;
    return true;
  }).join('\n');
}

// CIRCT/LLHD encodes every 4-state `logic` bit as a 2-bit pair in VCD:
//   high bit = value (0 or 1)
//   low bit  = 4-state flag (0 = known, 1 = x or z)
// This doubles the declared width of every logic signal, so Surfer displays the
// raw 2-bit integer (e.g. logic-1 = b10 = decimal 2 instead of 1).
// Decode these back to standard single-bit-per-logic-bit VCD.
//
// 2-state types (integer, real, realtime, time) are not doubled by LLHD and
// are left untouched.
function fixLlhdVcdEncoding(vcd) {
  if (typeof vcd !== 'string') return vcd;

  const SKIP_TYPES = new Set(['integer', 'real', 'realtime', 'time']);

  // First pass: find variables with even width and a 4-state VCD type.
  const llhdIds = new Map(); // identifier → svWidth (= vcdWidth / 2)
  const lines = vcd.split('\n');
  for (const line of lines) {
    const m = line.match(/\$var\s+(\S+)\s+(\d+)\s+(\S+)/);
    if (!m) continue;
    const type = m[1], vcdWidth = parseInt(m[2], 10), id = m[3];
    if (!SKIP_TYPES.has(type) && vcdWidth >= 2 && vcdWidth % 2 === 0) {
      llhdIds.set(id, vcdWidth / 2);
    }
  }
  if (llhdIds.size === 0) return vcd;

  // Second pass: halve $var widths and decode value-change lines.
  return lines.map(line => {
    const t = line.trim();

    if (t.startsWith('$var')) {
      return line.replace(/(\$var\s+\S+\s+)(\d+)(\s+(\S+))/, (_, pre, w, post, id) => {
        const svW = llhdIds.get(id);
        return svW !== undefined ? pre + svW + post : _;
      });
    }

    // Vector value changes: `b<bits> <id>`
    const bm = t.match(/^[bB]([01xzXZ]+)\s+(\S+)$/);
    if (bm) {
      const id = bm[2];
      const svWidth = llhdIds.get(id);
      if (svWidth !== undefined) {
        const raw = bm[1].padStart(svWidth * 2, '0');
        const valBits = raw.slice(0, svWidth);
        const flagBits = raw.slice(svWidth);
        let decoded = '';
        for (let i = 0; i < svWidth; i++) {
          decoded += flagBits[i] === '1' ? 'x' : valBits[i];
        }
        // 1-bit results use the compact scalar form.
        return (svWidth === 1 ? decoded : 'b' + decoded) + ' ' + id;
      }
    }

    return line;
  }).join('\n');
}

function addMissingLlhdSignalNames(mlirText) {
  if (typeof mlirText !== 'string') return null;
  // Add name attributes to llhd.sig ops that lack them so circt-sim's VCD
  // writer can emit $var entries. circt-verilog only sets name on module
  // port connections; testbench-level logic signals get no name attribute.
  // We use the SSA result identifier (%clk -> name "clk") as the signal name.
  return mlirText.replace(
    /(%([a-zA-Z_]\w*)\s*=\s*llhd\.sig\s+)(?!name\s+")/g,
    (_m, prefix, sigName) => `${prefix}name "${sigName}" `
  );
}

function shellQuote(arg) {
  const text = String(arg);
  if (text.length === 0) return "''";
  if (/^[A-Za-z0-9_./:=+,-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function formatCommand(tool, args = []) {
  return `$ ${[tool, ...args].map(shellQuote).join(' ')}`;
}

function appendNonZeroExit(logs, tool, exitCode, onLog = null) {
  if (exitCode !== 0) {
    const line = `# ${tool} exit code: ${exitCode}`;
    logs.push(line);
    if (typeof onLog === 'function') onLog(line);
  }
}

function cocotbWorkerLogToStreamEntry(entry) {
  const text = String(entry ?? '');
  if (text.startsWith('[stdout] ') || text.startsWith('[stderr] ')) return text;
  const t = text.trim();
  const isError = /^FAIL\b/.test(t) ||
    /^ERROR\b/.test(t) ||
    /^Traceback\b/.test(t) ||
    /^\w*Error\b/.test(t);
  return `[${isError ? 'stderr' : 'stdout'}] ${text}`;
}

function removeFlag(args, flag) {
  return (args || []).filter((arg) => arg !== flag);
}

function forceInterpretSimMode(args) {
  const inArgs = Array.isArray(args) ? args : [];
  const out = [];

  for (let i = 0; i < inArgs.length; i++) {
    const arg = inArgs[i];
    if (arg === '--mode') {
      i += 1; // Skip explicit mode value.
      continue;
    }
    if (arg.startsWith('--mode=')) continue;
    if (arg === '--compiled') {
      i += 1; // Skip compiled module path.
      continue;
    }
    if (arg.startsWith('--compiled=')) continue;
    out.push(arg);
  }

  out.push('--mode', 'interpret');
  return out;
}

function isWasmOomText(text) {
  return /Aborted\(OOM\)|out of memory|Cannot enlarge memory|cannot grow memory/i.test(
    String(text || '')
  );
}

function isRetryableSimAbortText(text) {
  const value = String(text || '');
  return /Aborted\(/.test(value) || isWasmOomText(value);
}

function isRetryableVerilogCrashText(text) {
  const value = String(text || '');
  return /memory access out of bounds|Malformed attribute storage object|Aborted\(/i.test(value);
}

const UVM_FS_ROOT = '/circt/uvm-core';
const UVM_INCLUDE_ROOT = `${UVM_FS_ROOT}/src`;
const UVM_SIM_MAX_TIME_FS = '1000000';

function pickTopModules(files, fallbackTop) {
  const moduleNames = moduleNamesFromWorkspace(files);

  if (containsPath(files, 'hdl_top.sv') && containsPath(files, 'hvl_top.sv')) {
    return ['hdl_top', 'hvl_top'];
  }
  if (containsPath(files, 'tb_top.sv') || moduleNames.has('tb_top')) {
    return ['tb_top'];
  }
  if (containsPath(files, 'tb.sv')) {
    return ['tb'];
  }
  if (fallbackTop && moduleNames.has(fallbackTop)) {
    return [fallbackTop];
  }
  if (containsPath(files, 'top.sv')) {
    return ['top'];
  }

  if (moduleNames.size) {
    return [Array.from(moduleNames).sort()[0]];
  }

  const firstSource = sourcePathsFromWorkspace(files)[0] || mlirPathsFromWorkspace(files)[0] || 'top.sv';
  return [filename(firstSource).replace(/\.[^.]+$/, '') || 'top'];
}

function isExitException(error) {
  const text = String(error?.message || error || '');
  return text.includes('ExitStatus') || text.includes('Program terminated') || text.includes('exit(');
}

function extractExitCode(error) {
  const text = String(error?.message || error || '');
  const patterns = [
    /ExitStatus[:( ]+(-?\d+)/i,
    /exit\((\-?\d+)\)/i,
    /status(?:=|:)\s*(-?\d+)/i,
    /code(?:=|:)\s*(-?\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const code = Number.parseInt(match[1], 10);
    if (!Number.isNaN(code)) return code;
  }

  return 1;
}

const WORKER_SOURCE = String.raw`
const EXIT_PATTERNS = [
  /ExitStatus[:( ]+(-?\\d+)/i,
  /exit\\((\\-?\\d+)\\)/i,
  /status(?:=|:)\\s*(-?\\d+)/i,
  /code(?:=|:)\\s*(-?\\d+)/i
];

function extractExitCode(error) {
  const text = String((error && error.message) || error || '');
  for (const pattern of EXIT_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const code = Number.parseInt(match[1], 10);
    if (!Number.isNaN(code)) return code;
  }
  return 1;
}

function isExitException(error) {
  const text = String((error && error.message) || error || '');
  return text.includes('ExitStatus') || text.includes('Program terminated') || text.includes('exit(');
}

function dirname(path) {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return '/';
  return path.slice(0, idx);
}

function ensureDir(FS, path) {
  if (!path || path === '/') return;
  const parts = path.split('/').filter(Boolean);
  let cur = '';
  for (const part of parts) {
    cur += '/' + part;
    try {
      FS.mkdir(cur);
    } catch {
      // Already exists.
    }
  }
}

function writeWorkspaceFiles(FS, files) {
  for (const [path, content] of Object.entries(files || {})) {
    ensureDir(FS, dirname(path));
    if (typeof content === 'string') {
      FS.writeFile(path, content, { encoding: 'utf8' });
    } else {
      FS.writeFile(path, content);
    }
  }
}

function readWorkspaceFiles(FS, paths) {
  const out = {};
  for (const path of paths || []) {
    try {
      out[path] = FS.readFile(path, { encoding: 'utf8' });
    } catch {
      // Ignore missing files.
    }
  }
  return out;
}

${WORKER_RUNTIME_HELPERS_SOURCE}

// In-memory filesystem for Emscripten NODERAWFS builds (like circt-sim.js).
// NODERAWFS replaces the entire Emscripten FS layer with direct Node.js fs calls.
// We provide a fake require('fs') that stores data in memory so that
// module.FS.writeFile / callMain / module.FS.readFile all share the same store.
function makeInMemFS(onStdoutChunk = null, onStderrChunk = null) {
  var store = {};
  var symlinks = {};
  var remoteFiles = {};
  var dirs = new Set([
    '/',
    '/dev',
    '/workspace',
    '/workspace/src',
    '/workspace/out',
    '/circt',
    '/circt/uvm-core',
    '/circt/uvm-core/src'
  ]);
  var fds = {};
  var nextFd = 3;
  var stdoutChunks = [];
  var stderrChunks = [];

  function ensureParentDir(path) {
    var parts = String(path).split('/').filter(Boolean);
    var cur = '';
    for (var i = 0; i < parts.length - 1; i++) { cur += '/' + parts[i]; dirs.add(cur); }
  }

  function makeStat(path) {
    path = String(path);
    if (symlinks[path]) {
      return {
        ino: 3, mode: 0o120777, size: symlinks[path].length, dev: 1, nlink: 1, uid: 0, gid: 0, rdev: 0,
        blksize: 4096, blocks: 1, atime: new Date(), mtime: new Date(), ctime: new Date(),
        isDirectory: function(){return false;}, isFile: function(){return false;},
        isSymbolicLink: function(){return true;}
      };
    }
    if (!dirs.has(path) && !store[path] && !remoteFiles[path]) {
      tryFetchIntoStore(path);
    }
    if (dirs.has(path)) {
      return { ino: 1, mode: 0o40755, size: 0, dev: 1, nlink: 1, uid: 0, gid: 0, rdev: 0,
               blksize: 4096, blocks: 0, atime: new Date(), mtime: new Date(), ctime: new Date(),
               isDirectory: function(){return true;}, isFile: function(){return false;},
               isSymbolicLink: function(){return false;} };
    }
    if (store[path] || remoteFiles[path]) {
      var size = store[path] ? store[path].length : 0;
      return { ino: 2, mode: 0o100644, size: size, dev: 1, nlink: 1, uid: 0, gid: 0, rdev: 0,
               blksize: 4096, blocks: Math.ceil(size / 512),
               atime: new Date(), mtime: new Date(), ctime: new Date(),
               isDirectory: function(){return false;}, isFile: function(){return true;},
               isSymbolicLink: function(){return false;} };
    }
    var e = new Error('ENOENT: no such file or directory, stat \'' + path + '\'');
    e.code = 'ENOENT'; throw e;
  }

  function tryFetchIntoStore(path) {
    path = String(path);
    if (store[path]) return true;
    try {
      var fetchUrl = remoteFiles[path] || path;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', fetchUrl, false /* synchronous */);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
        var bytes = new Uint8Array(xhr.response);
        ensureParentDir(path);
        store[path] = bytes;
        return true;
      }
    } catch (fetchErr) {}
    return false;
  }

  var nodeApi = {
    readFileSync: function(path, opts) {
      path = String(path);
      if (!store[path]) {
        tryFetchIntoStore(path);
      }
      if (store[path]) {
        var enc = (typeof opts === 'string') ? opts : (opts && opts.encoding);
        return enc ? new TextDecoder().decode(store[path]) : store[path];
      }
      var e = new Error('ENOENT: no such file or directory, open \'' + path + '\'');
      e.code = 'ENOENT'; throw e;
    },
    existsSync: function(p) { return dirs.has(p) || !!store[p] || !!symlinks[p] || !!remoteFiles[p] || tryFetchIntoStore(p); },
    statSync: makeStat,
    lstatSync: makeStat,
    realpathSync: function(p) {
      const path = String(p);
      return symlinks[path] || path;
    },
    readlinkSync: function(p) {
      const path = String(p);
      if (symlinks[path]) return symlinks[path];
      const e = new Error('EINVAL: invalid argument, readlink \'' + path + '\'');
      e.code = 'EINVAL';
      throw e;
    },
    symlinkSync: function(target, path) {
      const link = String(path);
      ensureParentDir(link);
      symlinks[link] = String(target);
    },
    fstatSync: function(fd) {
      var f = fds[fd]; if (!f) { var e = new Error('EBADF'); e.code = 'EBADF'; throw e; }
      return makeStat(f.path);
    },
    readdirSync: function(path) {
      if (!dirs.has(path)) { var e = new Error('ENOENT: ' + path); e.code = 'ENOENT'; throw e; }
      var prefix = path === '/' ? '/' : path + '/';
      var entries = new Set();
      dirs.forEach(function(d) {
        if (d !== path && d.startsWith(prefix)) {
          var rel = d.slice(prefix.length);
          if (rel.indexOf('/') < 0) entries.add(rel);
        }
      });
      Object.keys(store).forEach(function(f) {
        if (f.startsWith(prefix)) {
          var rel = f.slice(prefix.length);
          if (rel.indexOf('/') < 0) entries.add(rel);
        }
      });
      Object.keys(remoteFiles).forEach(function(f) {
        if (f.startsWith(prefix)) {
          var rel = f.slice(prefix.length);
          if (rel.indexOf('/') < 0) entries.add(rel);
        }
      });
      return Array.from(entries);
    },
    mkdirSync: function(p) { dirs.add(String(p)); },
    rmdirSync: function(p) { dirs.delete(p); },
    unlinkSync: function(p) { delete store[p]; delete symlinks[p]; },
    renameSync: function(from, to) {
      if (store[from]) {
        store[to] = store[from];
        delete store[from];
      }
      if (symlinks[from]) {
        symlinks[to] = symlinks[from];
        delete symlinks[from];
      }
    },
    chmodSync: function() {},
    chownSync: function() {},
    utimesSync: function() {},
    fsyncSync: function() {},
    ftruncateSync: function(fd, len) {
      var f = fds[fd]; var d = store[f.path] || new Uint8Array(0);
      store[f.path] = len <= d.length ? d.subarray(0, len) : (function(){ var g = new Uint8Array(len); g.set(d); return g; })();
    },
    openSync: function(path, flags) {
      path = String(path);
      var writable;
      if (typeof flags === 'string') {
        writable = flags.indexOf('w') >= 0 || flags.indexOf('a') >= 0 || flags.indexOf('+') >= 0;
      } else {
        var numericFlags = Number(flags) || 0;
        var accessMode = numericFlags & 3; // O_RDONLY=0, O_WRONLY=1, O_RDWR=2
        writable = accessMode !== 0 || !!(numericFlags & 64) || !!(numericFlags & 512) || !!(numericFlags & 1024);
      }
      if (writable) {
        store[path] = new Uint8Array(0);
        ensureParentDir(path);
      } else {
        if (!store[path] && remoteFiles[path]) {
          tryFetchIntoStore(path);
        }
        if (!store[path] && !dirs.has(path) && !remoteFiles[path] && !tryFetchIntoStore(path)) {
          var e = new Error('ENOENT: ' + path);
          e.code = 'ENOENT';
          throw e;
        }
      }
      var fd = nextFd++; fds[fd] = { path: path, pos: 0 }; return fd;
    },
    closeSync: function(fd) { delete fds[fd]; },
    readSync: function(fd, buf, bufOffset, length, position) {
      if (fd === 0) return 0;
      var f = fds[fd];
      if (!store[f.path] && remoteFiles[f.path]) {
        tryFetchIntoStore(f.path);
      }
      var data = store[f.path] || new Uint8Array(0);
      var pos = position != null ? position : f.pos;
      var avail = Math.min(length, data.length - pos);
      if (avail <= 0) return 0;
      buf.set(data.subarray(pos, pos + avail), bufOffset);
      if (position == null) f.pos += avail;
      return avail;
    },
    writeSync: function(fd, buf, bufOffset, length, position) {
      var src;
      if (typeof buf === 'string') {
        src = new TextEncoder().encode(buf);
      } else if (ArrayBuffer.isView(buf)) {
        src = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } else if (buf instanceof ArrayBuffer) {
        src = new Uint8Array(buf);
      } else {
        src = new Uint8Array(0);
      }
      var start = Number.isFinite(bufOffset) ? Number(bufOffset) : 0;
      if (start < 0) start = 0;
      var writeLen = Number.isFinite(length) ? Number(length) : (src.length - start);
      if (writeLen < 0) writeLen = 0;
      var end = Math.min(src.length, start + writeLen);
      var chunk = src.subarray(start, end);
      if (fd === 1) {
        var text = new TextDecoder().decode(chunk);
        stdoutChunks.push(text);
        if (typeof onStdoutChunk === 'function') onStdoutChunk(text);
        return chunk.length;
      }
      if (fd === 2) {
        var text = new TextDecoder().decode(chunk);
        stderrChunks.push(text);
        if (typeof onStderrChunk === 'function') onStderrChunk(text);
        return chunk.length;
      }
      var f = fds[fd]; var pos = position != null ? position : f.pos;
      var data = store[f.path] || new Uint8Array(0);
      var needed = pos + chunk.length;
      if (needed > data.length) { var g = new Uint8Array(needed); g.set(data); data = g; }
      data.set(chunk, pos); store[f.path] = data;
      if (position == null) f.pos += chunk.length;
      return chunk.length;
    },
  };

  return {
    nodeApi: nodeApi,
    ensureDir: function(path) {
      dirs.add(String(path));
    },
    writeTextFile: function(path, text) {
      const filePath = String(path);
      ensureParentDir(filePath);
      store[filePath] = new TextEncoder().encode(String(text ?? ''));
    },
    readTextFile: function(path) {
      const filePath = String(path);
      if (!store[filePath]) {
        tryFetchIntoStore(filePath);
      }
      if (!store[filePath]) return null;
      return new TextDecoder().decode(store[filePath]);
    },
    registerRemoteFile: function(path, url) {
      path = String(path);
      remoteFiles[path] = String(url || path);
      ensureParentDir(path);
    },
    getStdout: function() { return stdoutChunks.join(''); },
    getStderr: function() { return stderrChunks.join(''); },
  };
}

var circtWorkerRuntimeReady = false;

function getModuleValue(module, name) {
  if (!module) return null;
  const descriptor = Object.getOwnPropertyDescriptor(module, name);
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
  return descriptor.value;
}

function resolveMain(module) {
  const moduleMain = getModuleValue(module, '_main');
  if (typeof moduleMain === 'function') return moduleMain;
  if (typeof self._main === 'function') return self._main;
  if (typeof globalThis._main === 'function') return globalThis._main;
  return null;
}

function resolveFS(module) {
  const moduleFS = getModuleValue(module, 'FS');
  if (moduleFS && typeof moduleFS.writeFile === 'function' && typeof moduleFS.readFile === 'function') {
    return moduleFS;
  }
  if (self.FS && typeof self.FS.writeFile === 'function' && typeof self.FS.readFile === 'function') {
    return self.FS;
  }
  if (globalThis.FS && typeof globalThis.FS.writeFile === 'function' && typeof globalThis.FS.readFile === 'function') {
    return globalThis.FS;
  }
  return null;
}

function resolveCallMain(module) {
  const moduleCallMain = getModuleValue(module, 'callMain');
  if (typeof moduleCallMain === 'function') return moduleCallMain;
  if (typeof self.__svt_callMain === 'function') return self.__svt_callMain;
  if (typeof globalThis.__svt_callMain === 'function') return globalThis.__svt_callMain;
  if (typeof self.callMain === 'function') return self.callMain;
  if (typeof globalThis.callMain === 'function') return globalThis.callMain;
  return null;
}

function waitForRuntime(timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const module = self.Module;
        const callMain = resolveCallMain(module);
        const main = resolveMain(module);
        const fsApi = resolveFS(module);

        if (
          circtWorkerRuntimeReady &&
          module &&
          !!callMain &&
          !!main &&
          !!fsApi
        ) {
          resolve(module);
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          reject(new Error('Emscripten runtime did not become ready in time'));
          return;
        }
        setTimeout(tick, 25);
      } catch (error) {
        reject(error);
      }
    };
    tick();
  });
}

self.onmessage = async (event) => {
  const req = event.data || {};
  const stdout = [];
  const stderr = [];
  const streamRemainder = { stdout: '', stderr: '' };

  function appendStreamLine(stream, line) {
    const text = String(line ?? '');
    if (stream === 'stdout') stdout.push(text);
    else stderr.push(text);
    self.postMessage({ type: 'stream', stream, line: text });
  }

  function appendStreamText(stream, text) {
    const piece = String(text ?? '');
    if (!piece) return;
    if (stream === 'stdout') stdout.push(piece);
    else stderr.push(piece);
    const combined = streamRemainder[stream] + piece;
    const parts = combined.split(/\r?\n/);
    streamRemainder[stream] = parts.pop() ?? '';
    for (const line of parts) {
      self.postMessage({ type: 'stream', stream, line });
    }
  }

  function flushStreamRemainders() {
    for (const stream of ['stdout', 'stderr']) {
      const tail = streamRemainder[stream];
      if (tail) {
        self.postMessage({ type: 'stream', stream, line: tail });
        streamRemainder[stream] = '';
      }
    }
  }

  try {
    self.Module = {
      noInitialRun: true,
      onRuntimeInitialized: () => {
        console.log('[circt-worker] onRuntimeInitialized fired');
        circtWorkerRuntimeReady = true;
      },
      print: (line) => appendStreamLine('stdout', line),
      printErr: (line) => appendStreamLine('stderr', line),
      locateFile: (path) => {
        if (path.endsWith('.wasm')) return req.wasmUrl;
        return path;
      },
      // Use streaming WASM compilation for all tools to avoid slow sync readBinary path.
      instantiateWasm: function(imports, callback) {
        console.log('[circt-worker] instantiateWasm called for', req.wasmUrl);
        WebAssembly.instantiateStreaming(fetch(req.wasmUrl), imports)
          .then(function(result) {
            console.log('[circt-worker] instantiateStreaming succeeded');
            callback(result.instance, result.module);
          })
          .catch(function(streamErr) {
            console.log('[circt-worker] instantiateStreaming failed, trying ArrayBuffer fallback:', String(streamErr));
            return fetch(req.wasmUrl)
              .then(function(r) { return r.arrayBuffer(); })
              .then(function(buf) { return WebAssembly.instantiate(buf, imports); })
              .then(function(result) {
                console.log('[circt-worker] ArrayBuffer instantiate succeeded');
                callback(result.instance, result.module);
              })
              .catch(function(abErr) {
                console.error('[circt-worker] both WASM instantiation paths failed:', String(abErr));
              });
          });
        return {};
      }
    };

    let inMemFS = null;
    await loadEmscriptenTool({
      jsUrl: req.jsUrl,
      pathShim: WORKER_PATH_SHIM,
      makeFs: function() {
        // NODERAWFS builds call require('path') / require('fs') at module scope.
        // Provide a Node-like fs backed by memory so tool I/O stays in-worker.
        console.log('[circt-worker] NODERAWFS detected, setting up Node.js emulation');
        inMemFS = makeInMemFS(
          (text) => appendStreamText('stdout', text),
          (text) => appendStreamText('stderr', text)
        );
        return inMemFS;
      },
      onStdout: function(s) { appendStreamText('stdout', s); },
      onStderr: function(s) { appendStreamText('stderr', s); },
      beforeEval: function() { console.log('[circt-worker] starting eval of tool script'); },
      afterEval: function() { console.log('[circt-worker] eval complete'); }
    });

    console.log('[circt-worker] waiting for runtime...');
    const module = await waitForRuntime();
    const fsApi = resolveFS(module);
    if (!fsApi) {
      throw new Error('Emscripten FS runtime did not become ready');
    }
    if (typeof req.uvmManifestUrl === 'string' && req.uvmManifestUrl.length > 0) {
      const candidateUrls = [];
      const seenManifestUrls = new Set();
      const pushManifestCandidate = (raw) => {
        if (typeof raw !== 'string' || !raw) return;
        let href = '';
        try {
          href = new URL(raw, self.location.href).href;
        } catch {
          href = raw;
        }
        if (!href || seenManifestUrls.has(href)) return;
        seenManifestUrls.add(href);
        candidateUrls.push(href);
      };

      pushManifestCandidate(req.uvmManifestUrl);
      try {
        const jsBase = new URL('./', req.jsUrl).href;
        pushManifestCandidate(new URL('uvm-core/uvm-manifest.json', jsBase).href);
      } catch {
        // Keep trying with the original URL if jsUrl is malformed.
      }

      let manifest = null;
      let manifestUrl = '';
      const manifestFailures = [];
      for (const candidateUrl of candidateUrls) {
        try {
          const response = await fetch(candidateUrl);
          if (!response.ok) {
            manifestFailures.push(candidateUrl + ' -> ' + response.status + ' ' + response.statusText);
            continue;
          }
          manifest = await response.json();
          manifestUrl = candidateUrl;
          break;
        } catch (error) {
          manifestFailures.push(candidateUrl + ' -> ' + String(error?.message || error));
        }
      }
      if (!manifest || !manifestUrl) {
        const details = manifestFailures.slice(0, 3).join(' | ');
        throw new Error('Failed to load UVM manifest: ' + (details || 'no candidate URL succeeded'));
      }

      const rootPath = (manifest && typeof manifest.rootPath === 'string' && manifest.rootPath.length > 0)
        ? manifest.rootPath
        : '/circt/uvm-core/src';
      const relPaths = Array.isArray(manifest && manifest.files) ? manifest.files : [];
      const srcBaseUrl = new URL('src/', manifestUrl).href;
      for (const relRaw of relPaths) {
        if (typeof relRaw !== 'string') continue;
        const rel = relRaw.replace(/^\/+/, '');
        if (!rel || rel.includes('..')) continue;
        const fsPath = rootPath.replace(/\/+$/, '') + '/' + rel;
        const sourceUrl = new URL(rel, srcBaseUrl).href;
        if (inMemFS && typeof inMemFS.registerRemoteFile === 'function') {
          const srcResponse = await fetch(sourceUrl);
          if (!srcResponse.ok) {
            throw new Error(
              'Failed to load UVM source: ' +
              sourceUrl +
              ' (' +
              srcResponse.status +
              ' ' +
              srcResponse.statusText +
              ')'
            );
          }
          const srcText = await srcResponse.text();
          inMemFS.writeTextFile(fsPath, srcText);
          continue;
        }
        if (typeof fsApi.createLazyFile === 'function') {
          const idx = fsPath.lastIndexOf('/');
          const parent = idx <= 0 ? '/' : fsPath.slice(0, idx);
          const base = idx === -1 ? fsPath : fsPath.slice(idx + 1);
          ensureDir(fsApi, parent);
          try {
            fsApi.createLazyFile(parent, base, sourceUrl, true, false);
          } catch {
            // Ignore duplicate registrations.
          }
        }
      }
    }
    console.log('[circt-worker] runtime ready, writing files');
    if (inMemFS) {
      for (const [path, content] of Object.entries(req.files || {})) {
        inMemFS.writeTextFile(String(path), content);
      }
      for (const dir of req.createDirs || []) {
        inMemFS.ensureDir(String(dir));
      }
    } else {
      writeWorkspaceFiles(fsApi, req.files || {});
      for (const dir of req.createDirs || []) {
        ensureDir(fsApi, dir);
      }
    }

    console.log('[circt-worker] calling callMain with args:', req.args);
    let exitCode = 0;
    try {
      const callMain = resolveCallMain(module);
      if (!callMain) {
        throw new Error('CIRCT runtime is missing callMain entrypoint');
      }
      const ret = callMain(Array.isArray(req.args) ? req.args : []);
      if (typeof ret === 'number' && Number.isFinite(ret)) {
        exitCode = ret;
      }
    } catch (error) {
      if (!isExitException(error)) throw error;
      exitCode = extractExitCode(error);
    }
    console.log('[circt-worker] callMain done, exitCode:', exitCode);

    flushStreamRemainders();
    const files = inMemFS
      ? Object.fromEntries(
          (req.readFiles || [])
            .map((path) => [String(path), inMemFS.readTextFile(String(path))])
            .filter(([, content]) => typeof content === 'string')
        )
      : readWorkspaceFiles(fsApi, req.readFiles || []);
    self.postMessage({
      type: 'result',
      ok: true,
      exitCode,
      stdout: stdout.join('\n').trim(),
      stderr: stderr.join('\n').trim(),
      files
    });
  } catch (error) {
    flushStreamRemainders();
    self.postMessage({
      type: 'result',
      ok: false,
      exitCode: 1,
      stdout: stdout.join('\n').trim(),
      stderr: stderr.join('\n').trim(),
      files: {},
      error: String((error && error.stack) || (error && error.message) || error || 'unknown worker failure')
    });
  }
};
`;

let workerBlobUrl = null;

function getWorkerBlobUrl() {
  if (workerBlobUrl) return workerBlobUrl;
  const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
  workerBlobUrl = URL.createObjectURL(blob);
  return workerBlobUrl;
}

function runToolInWorker({
  jsUrl,
  wasmUrl,
  args,
  files,
  readFiles,
  createDirs = [],
  uvmManifestUrl = null,
  onOutput = null,
  signal = null
}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(getWorkerBlobUrl());
    let sawStream = false;
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`${jsUrl}: tool invocation timed out`));
      }, 300000);
    };
    resetTimeout();

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeout);
        worker.terminate();
        reject(new DOMException('Run cancelled', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new DOMException('Run cancelled', 'AbortError'));
      }, { once: true });
    }

    worker.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type === 'stream') {
        sawStream = true;
        resetTimeout();
        if (typeof onOutput === 'function') {
          const stream = payload.stream === 'stderr' ? 'stderr' : 'stdout';
          onOutput({ stream, line: String(payload.line ?? '') });
        }
        return;
      }
      clearTimeout(timeout);
      worker.terminate();
      const result = payload.type === 'result' ? payload : payload;
      if (!result.ok) {
        const prefix = result.error || 'tool invocation failed';
        const stderr = result.stderr ? ` :: ${result.stderr}` : '';
        reject(new Error(`${prefix}${stderr}`));
        return;
      }
      resolve({ ...result, streamed: sawStream });
    };

    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(String(event?.message || 'worker crashed')));
    };

    worker.postMessage({ jsUrl, wasmUrl, args, files, readFiles, createDirs, uvmManifestUrl });
  });
}

function toAbsoluteUrl(rawUrl) {
  try {
    return new URL(rawUrl, window.location.href).href;
  } catch {
    return rawUrl;
  }
}

function getUvmManifestUrl() {
  return toAbsoluteUrl(`${getRuntimeBasePath()}circt/uvm-core/uvm-manifest.json`);
}

export class CirctWasmAdapter {
  constructor() {
    this.repo = CIRCT_FORK_REPO;
    this.config = getCirctRuntimeConfig();
    this.ready = false;
    this._runController = null;
  }

  cancel() {
    this._runController?.abort();
  }

  async init() {
    if (this.ready) return;

    const requiredTools = ['verilog', 'sim'];
    const missing = requiredTools.filter((name) => {
      const tool = this.config.toolchain?.[name];
      return !tool?.js || !tool?.wasm;
    });

    if (missing.length) {
      throw new Error(`CIRCT toolchain is incomplete in config: ${missing.join(', ')}`);
    }

    this.ready = true;
  }

  async _invokeTool(
    toolName,
    { args, files = {}, readFiles = [], createDirs = [], uvmManifestUrl = null, onOutput = null }
  ) {
    const tool = this.config.toolchain[toolName];
    if (!tool) throw new Error(`Unknown CIRCT tool: ${toolName}`);

    return runToolInWorker({
      jsUrl: toAbsoluteUrl(tool.js),
      wasmUrl: toAbsoluteUrl(tool.wasm),
      args,
      files,
      readFiles,
      createDirs,
      uvmManifestUrl,
      onOutput,
      signal: this._runController?.signal ?? null
    });
  }

  async selfCheck({ lesson = null } = {}) {
    const logs = [];

    try {
      await this.init();

      logs.push(formatCommand('circt-verilog', ['--help']));
      const verilogHelp = await this._invokeTool('verilog', {
        args: ['--help']
      });
      appendNonZeroExit(logs, 'circt-verilog', verilogHelp.exitCode);

      logs.push(formatCommand('circt-sim', ['--help']));
      const simHelp = await this._invokeTool('sim', {
        args: ['--help']
      });
      appendNonZeroExit(logs, 'circt-sim', simHelp.exitCode);

      const ok = verilogHelp.exitCode === 0 && simHelp.exitCode === 0;
      if (verilogHelp.stderr) logs.push(`[stderr] ${verilogHelp.stderr}`);
      if (simHelp.stderr) logs.push(`[stderr] ${simHelp.stderr}`);

      return { ok, logs };
    } catch (error) {
      return {
        ok: false,
        logs: [...logs, `# self-check failed: ${error.message}`]
      };
    }
  }

  async run({ files, top, simulate = true, onStatus = null, onLog = null }) {
    this._runController = new AbortController();
    try {
      await this.init();

      const svPaths = sourcePathsFromWorkspace(files);
      const mlirPaths = mlirPathsFromWorkspace(files);
      if (!svPaths.length && !mlirPaths.length) {
        if (typeof onStatus === 'function') onStatus('done');
        return {
          ok: false,
          logs: ['# no SystemVerilog or MLIR source files found in workspace'],
          waveform: null
        };
      }

      const topModules = pickTopModules(files, top);
      const mlirPath = '/workspace/out/design.llhd.mlir';
      const wavePath = '/workspace/out/waves.vcd';
      const useFullUvm = svPaths.length > 0 && needsUvmLibrary(files);
      const uvmManifestUrl = useFullUvm ? getUvmManifestUrl() : null;

      const logs = [];
      const emitLog = (entry) => {
        logs.push(entry);
        if (typeof onLog === 'function') onLog(entry);
      };
      const makeToolOutputHandler = () => {
        let sawStream = false;
        return {
          onOutput: ({ stream, line }) => {
            sawStream = true;
            emitLog(`[${stream}] ${line}`);
          },
          sawStream: () => sawStream
        };
      };

      if (typeof onStatus === 'function') onStatus('compiling');
      let compileExitCode = 0;
      let loweredMlir = null;
      if (svPaths.length > 0) {
        const compileRootPaths = compileRootSourcePaths(files);
        const buildCompilePlan = ({ forceBundle, singleUnit, label }) => {
          const bundledCompile = bundleCompileRoots(files, compileRootPaths, {
            enabled: useFullUvm,
            force: useFullUvm ? forceBundle : false
          });
          const compileRoots = (bundledCompile.roots || []).map((path) => normalizePath(path));
          let compileArgs = [...this.config.verilogArgs];
          compileArgs = singleUnit
            ? (compileArgs.includes('--single-unit') ? compileArgs : [...compileArgs, '--single-unit'])
            : removeFlag(compileArgs, '--single-unit');
          if (useFullUvm) {
            compileArgs.push('--uvm-path', UVM_FS_ROOT, '-I', UVM_INCLUDE_ROOT);
          }
          for (const topName of topModules) {
            compileArgs.push('--top', topName);
          }
          compileArgs.push('-o', mlirPath, ...compileRoots);
          return {
            label,
            bundledCompile,
            compileArgs,
            workspaceFiles: Object.fromEntries(
              Object.entries(bundledCompile.files).map(([path, content]) => [normalizePath(path), content])
            )
          };
        };

        const compilePlans = useFullUvm
          ? [
              buildCompilePlan({ forceBundle: true, singleUnit: true, label: 'bundled single-unit mode' }),
              buildCompilePlan({ forceBundle: false, singleUnit: false, label: 'native root mode' }),
              buildCompilePlan({ forceBundle: true, singleUnit: false, label: 'bundled non-single-unit mode' }),
              buildCompilePlan({ forceBundle: false, singleUnit: true, label: 'single-unit mode' }),
            ]
          : [
              buildCompilePlan({
                forceBundle: false,
                singleUnit: this.config.verilogArgs.includes('--single-unit'),
                label: 'default mode'
              })
            ];

        for (let attempt = 0; attempt < compilePlans.length; attempt += 1) {
          const plan = compilePlans[attempt];
          if (attempt > 0) {
            emitLog(`# circt-verilog: retrying in ${plan.label}`);
          }
          if (plan.bundledCompile.bundled) {
            emitLog(
              `# bundled ${plan.bundledCompile.rootCount} roots into ${plan.bundledCompile.bundlePath} ` +
              'for stable UVM compilation'
            );
          }
          emitLog(formatCommand('circt-verilog', plan.compileArgs));

          const compileStream = makeToolOutputHandler();
          let attemptCompile;
          try {
            attemptCompile = await this._invokeTool('verilog', {
              args: plan.compileArgs,
              files: plan.workspaceFiles,
              readFiles: [mlirPath],
              createDirs: ['/workspace/out'],
              uvmManifestUrl,
              onOutput: compileStream.onOutput
            });
          } catch (error) {
            const text = String(error?.message || error || '');
            if (useFullUvm && text.includes('Aborted(OOM)')) {
              emitLog('# circt-verilog: out of memory compiling UVM — rebuild wasm with larger heap');
              if (typeof onStatus === 'function') onStatus('done');
              return { ok: false, logs, waveform: null };
            }
            const canRetry = useFullUvm && attempt + 1 < compilePlans.length && isRetryableVerilogCrashText(text);
            if (canRetry) continue;
            throw error;
          }
          if (!compileStream.sawStream()) {
            if (attemptCompile.stdout) emitLog(`[stdout] ${attemptCompile.stdout}`);
            if (attemptCompile.stderr) emitLog(`[stderr] ${attemptCompile.stderr}`);
          }
          appendNonZeroExit(logs, 'circt-verilog', attemptCompile.exitCode, emitLog);

          const rawMlir = attemptCompile.files?.[mlirPath] || null;
          const attemptLoweredMlir = addMissingLlhdSignalNames(rawMlir);
          if (attemptCompile.exitCode === 0 && attemptLoweredMlir) {
            compileExitCode = attemptCompile.exitCode;
            loweredMlir = attemptLoweredMlir;
            break;
          }

          const canRetry = useFullUvm && attempt + 1 < compilePlans.length &&
            isRetryableVerilogCrashText(attemptCompile.stderr || '');
          if (canRetry) continue;
          if (!attemptLoweredMlir) emitLog('# lowered MLIR output was not produced');
          if (typeof onStatus === 'function') onStatus('done');
          return { ok: false, logs, waveform: null };
        }

        if (!loweredMlir) {
          if (typeof onStatus === 'function') onStatus('done');
          return { ok: false, logs, waveform: null };
        }
      } else {
        const mlirSourcePath = pickMlirSourcePath(files, top);
        const rawMlir = mlirSourcePath ? files[mlirSourcePath] : null;
        if (typeof rawMlir !== 'string' || !rawMlir.trim()) {
          if (typeof onStatus === 'function') onStatus('done');
          return {
            ok: false,
            logs: ['# no MLIR source files found in workspace'],
            waveform: null
          };
        }
        emitLog(`# using MLIR source: ${mlirSourcePath}`);
        loweredMlir = addMissingLlhdSignalNames(rawMlir);
      }

      // Run simulation by default so lessons without waveform support still
      // execute $display/$finish behavior (e.g. Welcome). Lessons can opt out
      // explicitly via `simulate: false`.
      const shouldSimulate = simulate !== false;
      if (!shouldSimulate) {
        if (typeof onStatus === 'function') onStatus('done');
        return {
          ok: true,
          logs,
          waveform: null
        };
      }

      if (typeof onStatus === 'function') onStatus('running');
      const simStream = makeToolOutputHandler();
      const runSimAttempt = async ({ withTraceAll, withVcd }) => {
        const simArgs = forceInterpretSimMode([...this.config.simArgs]);
        for (const topName of topModules) {
          simArgs.push('--top', topName);
        }
        if (useFullUvm) {
          simArgs.push('--max-time', UVM_SIM_MAX_TIME_FS);
        }
        if (withVcd) simArgs.push('--vcd', wavePath);
        if (withTraceAll) simArgs.push('--trace-all');
        simArgs.push(mlirPath);

        emitLog(formatCommand('circt-sim', simArgs));
        const sim = await this._invokeTool('sim', {
          args: simArgs,
          files: {
            [mlirPath]: loweredMlir
          },
          readFiles: withVcd ? [wavePath] : [],
          createDirs: ['/workspace/out'],
          onOutput: simStream.onOutput
        });
        if (sim.exitCode !== 0 && isRetryableSimAbortText(sim.stderr)) {
          throw new Error(String(sim.stderr || `circt-sim exited ${sim.exitCode}`));
        }
        return { sim, withVcd };
      };

      let simResult;
      try {
        simResult = await runSimAttempt({ withTraceAll: true, withVcd: true });
      } catch (error) {
        const retryable = isRetryableSimAbortText(error?.message || error);
        if (!retryable) throw error;
        emitLog('# circt-sim: runtime abort with --trace-all; retrying without --trace-all');
        try {
          simResult = await runSimAttempt({ withTraceAll: false, withVcd: true });
        } catch (retryError) {
          const retryableNoTrace = isRetryableSimAbortText(retryError?.message || retryError);
          if (!retryableNoTrace) throw retryError;
          emitLog('# circt-sim: runtime abort while writing VCD; retrying without waveform capture');
          simResult = await runSimAttempt({ withTraceAll: false, withVcd: false });
        }
      }

      const sim = simResult.sim;

      if (!simStream.sawStream()) {
        if (sim.stdout) emitLog(`[stdout] ${sim.stdout}`);
        if (sim.stderr) emitLog(`[stderr] ${sim.stderr}`);
      }
      appendNonZeroExit(logs, 'circt-sim', sim.exitCode, emitLog);

      const rawVcdText = simResult.withVcd ? sim.files?.[wavePath] || null : null;
      const vcdText = fixLlhdVcdEncoding(removeInlinedPortsFromVcd(rawVcdText));

      if (typeof onStatus === 'function') onStatus('done');
      return {
        ok: compileExitCode === 0 && sim.exitCode === 0,
        logs,
        waveform: vcdText
          ? {
              path: wavePath,
              text: vcdText
            }
          : null
      };
    } catch (error) {
      if (typeof onStatus === 'function') onStatus('done');
      if (error.name === 'AbortError') return { ok: false, logs: [], waveform: null };
      return {
        ok: false,
        logs: [
          `# runtime unavailable: ${error.message}`,
          `# circt-verilog js: ${this.config.toolchain.verilog.js}`,
          `# circt-verilog wasm: ${this.config.toolchain.verilog.wasm}`,
          `# circt-sim js: ${this.config.toolchain.sim.js}`,
          `# circt-sim wasm: ${this.config.toolchain.sim.wasm}`,
          '# run scripts/setup-circt.sh and npm run sync:circt to refresh artifacts'
        ],
        waveform: null
      };
    }
  }

}

export function createCirctWasmAdapter() {
  return new CirctWasmAdapter();
}

let _adapter = null;
export function getCirctWasmAdapter() {
  _adapter ??= createCirctWasmAdapter();
  return _adapter;
}
