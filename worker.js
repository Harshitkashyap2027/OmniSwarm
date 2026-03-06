/**
 * OmniSwarm – Web Worker
 * Handles all LLM inference and heavy data processing off the main thread.
 * Communicates with the main thread exclusively via postMessage.
 *
 * Made by Harshit Kashyap
 */

'use strict';

// ---------------------------------------------------------------------------
// OPFS helpers – store model weights in the Origin Private File System so the
// browser can cache gigabytes of data without the 5 MB localStorage limit.
// ---------------------------------------------------------------------------

async function opfsWrite(filename, buffer) {
  try {
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(filename, { create: true });
    const writable = await fh.createWritable();
    await writable.write(buffer);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('[worker] OPFS write failed:', err);
    return false;
  }
}

async function opfsRead(filename) {
  try {
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(filename);
    const file = await fh.getFile();
    return await file.arrayBuffer();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Simulated LLM inference
// In a real deployment this would use Transformers.js + WebGPU.
// We keep it dependency-free here so the project runs in any browser while
// the architecture wiring is fully in place.
// ---------------------------------------------------------------------------

const RESPONSE_PHRASES = [
  "Analyzing your prompt across the distributed swarm…",
  "Aggregating results from peer nodes…",
  "Running inference on local WebGPU context…",
  "Swarm consensus reached. Generating output…",
  "Distributing workload to available peers…",
  "Local GPU compute engaged. Processing tokens…",
];

/** Delay (ms) between streamed tokens – controls perceived typing speed */
const TOKEN_STREAM_DELAY_MS = 18;

function simulateTokenStream(prompt, onToken, onDone) {
  const intro = RESPONSE_PHRASES[Math.floor(Math.random() * RESPONSE_PHRASES.length)];
  const reply = `${intro}\n\nPrompt received: "${prompt.slice(0, 120)}${prompt.length > 120 ? '…' : ''}"\n\nThe OmniSwarm network has distributed this task across ${Math.floor(Math.random() * 8) + 2} active peers. Each peer is running a quantized language model (Phi-3 Mini / Llama-3-8B-Web) entirely within the browser via WebGPU matrix operations. Results will be merged and returned to you without a single byte touching an external API.\n\n[Swarm task complete ✓]`;

  let i = 0;
  const interval = setInterval(() => {
    if (i < reply.length) {
      onToken(reply[i]);
      i++;
    } else {
      clearInterval(interval);
      onDone();
    }
  }, TOKEN_STREAM_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Chunk summarisation – used when the swarm hands off a document fragment
// ---------------------------------------------------------------------------

function summariseChunk(text) {
  const words = text.trim().split(/\s+/);
  const preview = words.slice(0, 40).join(' ');
  return `[Chunk summary] ${preview}${words.length > 40 ? '…' : ''} (${words.length} words processed locally)`;
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

self.onmessage = async function (e) {
  const { type, id, payload } = e.data;

  switch (type) {
    case 'INFER': {
      postMessage({ type: 'INFER_START', id });
      simulateTokenStream(
        payload.prompt,
        (token) => postMessage({ type: 'INFER_TOKEN', id, token }),
        () => postMessage({ type: 'INFER_DONE', id })
      );
      break;
    }

    case 'SUMMARISE_CHUNK': {
      const summary = summariseChunk(payload.text);
      postMessage({ type: 'SUMMARISE_RESULT', id, summary });
      break;
    }

    case 'OPFS_WRITE': {
      const ok = await opfsWrite(payload.filename, payload.buffer);
      postMessage({ type: 'OPFS_WRITE_RESULT', id, ok });
      break;
    }

    case 'OPFS_READ': {
      const buffer = await opfsRead(payload.filename);
      postMessage({ type: 'OPFS_READ_RESULT', id, buffer }, buffer ? [buffer] : []);
      break;
    }

    case 'PING':
      postMessage({ type: 'PONG', id });
      break;

    default:
      console.warn('[worker] Unknown message type:', type);
  }
};
