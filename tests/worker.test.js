/**
 * OmniSwarm – Worker Unit Tests
 *
 * Tests the pure-logic functions from worker.js:
 *   - summariseChunk
 *   - simulateTokenStream  (with fake timers)
 *   - message routing      (PING/PONG, INFER, SUMMARISE_CHUNK)
 *   - OPFS helpers         (with mocked navigator.storage)
 *
 * Run: node --test tests/worker.test.js
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Bootstrap a minimal browser-like global environment so worker.js can be
// loaded with require() in Node.js.
// ---------------------------------------------------------------------------

// Fake self / postMessage / setInterval / clearInterval are already available
// in Node, but we need self.onmessage and a postMessage global.
global.self = { onmessage: null };
global.postMessage = (msg) => {
  // Captured per-test via the _capturedMessages helper below.
  global._lastMessages = global._lastMessages || [];
  global._lastMessages.push(msg);
};

// Mock navigator.storage (OPFS)
const _opfsStore = new Map();
Object.defineProperty(global, 'navigator', {
  configurable: true,
  writable: true,
  value: {
    storage: {
      getDirectory: async () => ({
        getFileHandle: async (name, opts) => {
          if (!opts || !opts.create) {
            if (!_opfsStore.has(name)) throw new Error('File not found');
          }
          return {
            createWritable: async () => ({
              write: async (buf) => _opfsStore.set(name, buf),
              close: async () => {},
            }),
            getFile: async () => ({
              arrayBuffer: async () => _opfsStore.get(name),
            }),
          };
        },
      }),
    },
  },
});

// Load worker.js — it registers self.onmessage
require('../worker.js');

// ---------------------------------------------------------------------------
// Helper: send a message to the worker and collect all replies until the
// expected terminal message type arrives (or a timeout elapses).
// ---------------------------------------------------------------------------

function sendMessage(msg, terminalType, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const replies = [];
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${terminalType}. Got: ${JSON.stringify(replies)}`));
    }, timeoutMs);

    // Override postMessage to capture replies for this invocation
    const prev = global.postMessage;
    global.postMessage = (reply) => {
      replies.push(reply);
      if (reply.type === terminalType) {
        clearTimeout(timer);
        global.postMessage = prev;
        resolve(replies);
      }
    };

    // Re-use self.onmessage as the entry point
    self.onmessage({ data: msg });
  });
}

// ---------------------------------------------------------------------------
// PING / PONG
// ---------------------------------------------------------------------------

describe('PING/PONG handshake', () => {
  test('responds with PONG carrying the same id', async () => {
    const replies = await sendMessage({ type: 'PING', id: 42 }, 'PONG');
    assert.equal(replies.length, 1);
    assert.equal(replies[0].type, 'PONG');
    assert.equal(replies[0].id, 42);
  });
});

// ---------------------------------------------------------------------------
// SUMMARISE_CHUNK
// ---------------------------------------------------------------------------

describe('SUMMARISE_CHUNK', () => {
  test('returns a summary prefixed with [Chunk summary]', async () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const replies = await sendMessage(
      { type: 'SUMMARISE_CHUNK', id: 1, payload: { text } },
      'SUMMARISE_RESULT'
    );
    assert.equal(replies.length, 1);
    assert.equal(replies[0].type, 'SUMMARISE_RESULT');
    assert.ok(
      replies[0].summary.startsWith('[Chunk summary]'),
      `Expected summary to start with [Chunk summary], got: ${replies[0].summary}`
    );
  });

  test('includes word count in the summary', async () => {
    const text = 'one two three four five';
    const replies = await sendMessage(
      { type: 'SUMMARISE_CHUNK', id: 2, payload: { text } },
      'SUMMARISE_RESULT'
    );
    assert.ok(
      replies[0].summary.includes('5 words'),
      `Expected "5 words" in summary, got: ${replies[0].summary}`
    );
  });

  test('truncates long chunks to a 40-word preview', async () => {
    const manyWords = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const replies = await sendMessage(
      { type: 'SUMMARISE_CHUNK', id: 3, payload: { text: manyWords } },
      'SUMMARISE_RESULT'
    );
    assert.ok(
      replies[0].summary.includes('…'),
      'Expected ellipsis for long chunk'
    );
    assert.ok(
      replies[0].summary.includes('60 words'),
      `Expected "60 words" in summary, got: ${replies[0].summary}`
    );
  });

  test('handles empty text without throwing', async () => {
    const replies = await sendMessage(
      { type: 'SUMMARISE_CHUNK', id: 4, payload: { text: '' } },
      'SUMMARISE_RESULT'
    );
    assert.equal(replies[0].type, 'SUMMARISE_RESULT');
    assert.equal(typeof replies[0].summary, 'string');
  });
});

// ---------------------------------------------------------------------------
// INFER (simulateTokenStream)
// ---------------------------------------------------------------------------

describe('INFER (token stream)', () => {
  test('emits INFER_START, one or more INFER_TOKEN, then INFER_DONE', async () => {
    const replies = await sendMessage(
      { type: 'INFER', id: 10, payload: { prompt: 'Hello swarm' } },
      'INFER_DONE',
      10000
    );

    const types = replies.map((r) => r.type);
    assert.ok(types.includes('INFER_START'), 'Missing INFER_START');
    assert.ok(types.includes('INFER_TOKEN'), 'Missing INFER_TOKEN messages');
    assert.ok(types[types.length - 1] === 'INFER_DONE', 'Last message must be INFER_DONE');
  });

  test('streamed tokens reconstruct a non-empty reply', async () => {
    const replies = await sendMessage(
      { type: 'INFER', id: 11, payload: { prompt: 'Summarise these documents' } },
      'INFER_DONE',
      10000
    );

    const tokens = replies
      .filter((r) => r.type === 'INFER_TOKEN')
      .map((r) => r.token)
      .join('');

    assert.ok(tokens.length > 10, `Expected a meaningful reply, got: "${tokens}"`);
  });

  test('reply contains the (truncated) prompt text', async () => {
    const prompt = 'unique-test-prompt-12345';
    const replies = await sendMessage(
      { type: 'INFER', id: 12, payload: { prompt } },
      'INFER_DONE',
      10000
    );

    const full = replies
      .filter((r) => r.type === 'INFER_TOKEN')
      .map((r) => r.token)
      .join('');

    assert.ok(
      full.includes(prompt),
      `Expected streamed output to contain the prompt "${prompt}"`
    );
  });

  test('long prompts are truncated to 120 characters in the reply', async () => {
    const longPrompt = 'A'.repeat(200);
    const replies = await sendMessage(
      { type: 'INFER', id: 13, payload: { prompt: longPrompt } },
      'INFER_DONE',
      10000
    );

    const full = replies
      .filter((r) => r.type === 'INFER_TOKEN')
      .map((r) => r.token)
      .join('');

    // The reply should contain an ellipsis because the prompt was > 120 chars
    assert.ok(full.includes('…'), 'Expected ellipsis for long prompt truncation');
    // The full 200-char prompt should NOT appear verbatim
    assert.ok(!full.includes(longPrompt), 'Long prompt should have been truncated');
  });
});

// ---------------------------------------------------------------------------
// OPFS helpers
// ---------------------------------------------------------------------------

describe('OPFS write / read round-trip', () => {
  before(() => _opfsStore.clear());

  test('OPFS_WRITE reports ok:true', async () => {
    // Create a clean ArrayBuffer (not the pooled one from Buffer)
    const str = 'hello opfs';
    const rawBuf = Buffer.from(str, 'utf8');
    const buf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
    const replies = await sendMessage(
      { type: 'OPFS_WRITE', id: 20, payload: { filename: 'test.bin', buffer: buf } },
      'OPFS_WRITE_RESULT'
    );
    assert.equal(replies[0].type, 'OPFS_WRITE_RESULT');
    assert.equal(replies[0].ok, true);
  });

  test('OPFS_READ returns the buffer that was previously written', async () => {
    const replies = await sendMessage(
      { type: 'OPFS_READ', id: 21, payload: { filename: 'test.bin' } },
      'OPFS_READ_RESULT'
    );
    assert.equal(replies[0].type, 'OPFS_READ_RESULT');
    assert.ok(replies[0].buffer != null, 'Buffer should not be null');
    const text = Buffer.from(new Uint8Array(replies[0].buffer)).toString('utf8');
    assert.equal(text, 'hello opfs');
  });

  test('OPFS_READ returns null for a file that does not exist', async () => {
    const replies = await sendMessage(
      { type: 'OPFS_READ', id: 22, payload: { filename: 'nonexistent.bin' } },
      'OPFS_READ_RESULT'
    );
    assert.equal(replies[0].type, 'OPFS_READ_RESULT');
    assert.equal(replies[0].buffer, null);
  });

  after(() => _opfsStore.clear());
});

// ---------------------------------------------------------------------------
// Unknown message type — should not throw
// ---------------------------------------------------------------------------

describe('Unknown message type', () => {
  test('does not crash the worker', async () => {
    // There is no terminal message to wait for, so we just verify no error.
    // We use a small trick: send a PING right after so we can wait for PONG.
    await assert.doesNotReject(async () => {
      self.onmessage({ data: { type: 'UNKNOWN_TYPE', id: 99 } });
      const replies = await sendMessage({ type: 'PING', id: 100 }, 'PONG');
      assert.equal(replies[0].type, 'PONG');
    });
  });
});
