/**
 * OmniSwarm – Main Application (app.js)
 * Orchestrates WebGPU detection, OPFS, Web Worker, WebRTC swarm, canvas
 * visualiser, gamified dashboard, and prompt matrix.
 *
 * Made by Harshit Kashyap
 */

'use strict';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function logConsole(msg, type = 'info') {
  const el = $('#console-output');
  if (!el) return;
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

let _msgId = 0;
function nextId() { return ++_msgId; }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  computeLevel: 1,
  computeXP: 0,
  xpToNext: 100,
  tasksResolved: 0,
  chunksProcessed: 0,
  gpuAvailable: false,
  workerReady: false,
  swarmJoined: false,
  currentFile: 'agent-main.js',
  files: {
    'agent-main.js': '// Define your primary AI agent instructions here\n// The swarm will distribute this task automatically\n\nconst task = {\n  type: "summarise",\n  input: "Paste your document text here…",\n  chunkSize: 500,\n};\n\n// Hit ▶ Run to dispatch to the swarm',
    'agent-sub.js': '// Secondary agent – handles post-processing\n\nfunction mergeResults(chunks) {\n  return chunks.join("\\n\\n---\\n\\n");\n}\n',
    'config.json': '{\n  "model": "phi-3-mini-4k-instruct",\n  "quantisation": "q4_k_m",\n  "maxPeers": 16,\n  "chunkSize": 500,\n  "timeout": 30000\n}\n',
  },
  pendingCallbacks: {},
};

// ---------------------------------------------------------------------------
// Web Worker
// ---------------------------------------------------------------------------

let worker = null;

function initWorker() {
  try {
    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (e) => logConsole(`Worker error: ${e.message}`, 'error');
    const id = nextId();
    state.pendingCallbacks[id] = () => {
      state.workerReady = true;
      logConsole('Web Worker ready ✓', 'success');
    };
    worker.postMessage({ type: 'PING', id });
  } catch (err) {
    logConsole(`Worker init failed: ${err.message}`, 'warn');
  }
}

function handleWorkerMessage(e) {
  const { type, id, token, summary, ok, buffer } = e.data;

  if (type === 'PONG') {
    const cb = state.pendingCallbacks[id];
    if (cb) { cb(); delete state.pendingCallbacks[id]; }
    return;
  }

  if (type === 'INFER_START') {
    $('#output-area').textContent = '';
    return;
  }

  if (type === 'INFER_TOKEN') {
    $('#output-area').textContent += token;
    $('#output-area').scrollTop = $('#output-area').scrollHeight;
    return;
  }

  if (type === 'INFER_DONE') {
    awardXP(35);
    state.tasksResolved++;
    updateStats();
    logConsole(`Inference complete. XP +35`, 'success');
    setRunning(false);
    return;
  }

  if (type === 'SUMMARISE_RESULT') {
    const cb = state.pendingCallbacks[id];
    if (cb) { cb(summary); delete state.pendingCallbacks[id]; }
    return;
  }

  if (type === 'OPFS_WRITE_RESULT') {
    logConsole(`OPFS write ${ok ? 'succeeded ✓' : 'failed ✗'}`, ok ? 'success' : 'warn');
    return;
  }
}

// ---------------------------------------------------------------------------
// WebGPU detection
// ---------------------------------------------------------------------------

async function detectWebGPU() {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        state.gpuAvailable = true;
        const info = adapter.info || {};
        logConsole(`WebGPU adapter: ${info.description || info.vendor || 'GPU detected'} ✓`, 'success');
        updateGPUBadge(true);
        return;
      }
    } catch (err) {
      logConsole(`WebGPU adapter request failed: ${err.message}`, 'warn');
    }
  }
  logConsole('WebGPU not available – running in CPU fallback mode', 'warn');
  updateGPUBadge(false);
}

function updateGPUBadge(available) {
  const badge = $('#gpu-badge');
  if (!badge) return;
  badge.textContent = available ? '⚡ WebGPU' : '🖥 CPU';
  badge.className = 'badge ' + (available ? 'badge-gpu' : 'badge-cpu');
}

// ---------------------------------------------------------------------------
// Swarm networking
// ---------------------------------------------------------------------------

let swarm = null;
let swarmCanvas = null;

function initSwarm() {
  swarm = new SwarmNetwork();

  swarm.addEventListener('joined', (e) => {
    state.swarmJoined = true;
    const { peerId, peerCount } = e.detail;
    logConsole(`Joined swarm as ${peerId} (${peerCount} peers online)`, 'success');
    updatePeerCount(peerCount);
    $('#peer-id-display').textContent = peerId;
    swarmCanvas && swarmCanvas.setNodeCount(peerCount);
    swarmCanvas && swarmCanvas.pulseAll();
    awardXP(20);
    updateStats();
  });

  swarm.addEventListener('heartbeat', (e) => {
    updatePeerCount(e.detail.peerCount);
    swarmCanvas && swarmCanvas.setNodeCount(e.detail.peerCount);

    // Randomly fire visual data packets
    if (Math.random() < 0.6) {
      const src = Math.floor(Math.random() * e.detail.peerCount);
      const dst = (src + 1 + Math.floor(Math.random() * (e.detail.peerCount - 1))) % e.detail.peerCount;
      swarmCanvas && swarmCanvas.firePacket(src, dst);
    }
  });

  swarm.addEventListener('chunkProcessed', (e) => {
    state.chunksProcessed++;
    awardXP(5);
    updateStats();
    const src = Math.floor(Math.random() * swarm.peerCount);
    const dst = (src + 1) % Math.max(swarm.peerCount, 2);
    swarmCanvas && swarmCanvas.firePacket(src, dst, '#a78bfa');
    logConsole(`Chunk ${e.detail.idx + 1} processed by swarm peer`, 'info');
  });

  swarm.join();
}

function updatePeerCount(n) {
  const el = $('#peer-count');
  if (el) el.textContent = n;
}

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

function awardXP(amount) {
  state.computeXP += amount;
  while (state.computeXP >= state.xpToNext) {
    state.computeXP -= state.xpToNext;
    state.computeLevel++;
    state.xpToNext = Math.floor(state.xpToNext * 1.4);
    logConsole(`🎉 Level Up! You reached Compute Level ${state.computeLevel}`, 'success');
    flashLevelUp();
  }
  renderXPBar();
}

function flashLevelUp() {
  const el = $('#compute-level');
  if (!el) return;
  el.classList.add('level-up-flash');
  setTimeout(() => el.classList.remove('level-up-flash'), 1200);
}

function renderXPBar() {
  const pct = Math.min(100, Math.round((state.computeXP / state.xpToNext) * 100));
  const bar = $('#xp-bar-fill');
  const label = $('#xp-label');
  const lvl = $('#compute-level');
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${state.computeXP} / ${state.xpToNext} XP`;
  if (lvl) lvl.textContent = state.computeLevel;
}

function updateStats() {
  const el1 = $('#tasks-resolved');
  const el2 = $('#chunks-processed');
  if (el1) el1.textContent = state.tasksResolved;
  if (el2) el2.textContent = state.chunksProcessed;
}

// ---------------------------------------------------------------------------
// Prompt Matrix (IDE)
// ---------------------------------------------------------------------------

function initPromptMatrix() {
  renderFileList();
  loadFile(state.currentFile);

  $$('.file-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.file;
      if (name) switchFile(name);
    });
  });
}

function renderFileList() {
  const list = $('#file-list');
  if (!list) return;
  list.innerHTML = '';
  Object.keys(state.files).forEach((name) => {
    const li = document.createElement('li');
    li.className = 'file-item' + (name === state.currentFile ? ' active' : '');
    li.textContent = name;
    li.dataset.file = name;
    li.addEventListener('click', () => switchFile(name));
    list.appendChild(li);
  });
}

function switchFile(name) {
  // Save current content
  const editor = $('#code-editor');
  if (editor) state.files[state.currentFile] = editor.value;
  state.currentFile = name;
  loadFile(name);
  renderFileList();
}

function loadFile(name) {
  const editor = $('#code-editor');
  const filename = $('#editor-filename');
  if (editor) editor.value = state.files[name] || '';
  if (filename) filename.textContent = name;
}

// ---------------------------------------------------------------------------
// Run button
// ---------------------------------------------------------------------------

function setRunning(running) {
  const btn = $('#run-btn');
  if (!btn) return;
  btn.disabled = running;
  btn.textContent = running ? '⏳ Processing…' : '▶ Run';
}

async function handleRun() {
  if (!worker) { logConsole('Worker not ready', 'warn'); return; }

  const editor = $('#code-editor');
  if (editor) state.files[state.currentFile] = editor.value;

  // Extract a "prompt" from the active file or the prompt textarea
  const promptArea = $('#prompt-input');
  const prompt = (promptArea && promptArea.value.trim())
    || state.files[state.currentFile];

  if (!prompt) { logConsole('Nothing to run', 'warn'); return; }

  setRunning(true);
  logConsole(`Dispatching task to swarm (${swarm ? swarm.peerCount : 1} peers)…`);

  // If multi-line / large text, distribute chunks via swarm
  if (swarm && prompt.split(/\s+/).length > 100) {
    logConsole('Large payload detected – distributing across peers…');
    swarm.distributeTask(prompt, 100);
  }

  // Send inference to worker
  const id = nextId();
  worker.postMessage({ type: 'INFER', id, payload: { prompt } });
  awardXP(10);
  updateStats();
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function initCanvas() {
  const canvas = $('#swarm-canvas');
  if (!canvas) return;
  swarmCanvas = new SwarmCanvas(canvas);
  swarmCanvas.start();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  logConsole('OmniSwarm initialising…');
  logConsole('Made by Harshit Kashyap 🚀', 'success');
  detectWebGPU();
  initWorker();
  initCanvas();
  initSwarm();
  initPromptMatrix();

  const runBtn = $('#run-btn');
  if (runBtn) runBtn.addEventListener('click', handleRun);

  const promptInput = $('#prompt-input');
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    });
  }

  renderXPBar();
  updateStats();
  logConsole('System ready. Join the swarm and submit your first task ✓', 'success');
}

document.addEventListener('DOMContentLoaded', boot);
