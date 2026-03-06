/**
 * OmniSwarm – Image Fixture Tests
 *
 * Validates that every PNG in tests/fixtures/ is a well-formed, readable
 * image file with the expected dimensions and metadata.
 *
 * Run: node --test tests/images.test.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// ---------------------------------------------------------------------------
// Minimal PNG parser
// Reads the PNG signature, IHDR (width/height/bit-depth/colour-type) and
// verifies every chunk's CRC-32 so we can be sure the files are well-formed.
// ---------------------------------------------------------------------------

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// CRC-32 lookup table (standard PNG polynomial 0xEDB88320)
const _CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = _CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Parse a PNG buffer and return metadata.
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, bitDepth: number, colourType: number,
 *             chunks: string[], pixels: number[][]|null }}
 */
function parsePng(buf) {
  // Signature check
  assert.ok(buf.slice(0, 8).equals(PNG_SIG), 'PNG signature mismatch');

  const chunks = [];
  let offset = 8;
  let width, height, bitDepth, colourType;
  const idatBuffers = [];

  while (offset < buf.length) {
    const dataLen  = buf.readUInt32BE(offset);
    const typeBytes = buf.slice(offset + 4, offset + 8);
    const type     = typeBytes.toString('ascii');
    const data     = buf.slice(offset + 8, offset + 8 + dataLen);
    const storedCrc = buf.readUInt32BE(offset + 8 + dataLen);
    const calcCrc   = crc32(Buffer.concat([typeBytes, data]));

    assert.equal(storedCrc, calcCrc, `CRC mismatch in ${type} chunk`);
    chunks.push(type);

    if (type === 'IHDR') {
      width      = data.readUInt32BE(0);
      height     = data.readUInt32BE(4);
      bitDepth   = data[8];
      colourType = data[9];
    }

    if (type === 'IDAT') idatBuffers.push(data);

    offset += 4 + 4 + dataLen + 4;
  }

  assert.ok(chunks.includes('IHDR'), 'Missing IHDR chunk');
  assert.ok(chunks.includes('IDAT'), 'Missing IDAT chunk');
  assert.ok(chunks[chunks.length - 1] === 'IEND', 'File must end with IEND chunk');

  // Decompress IDAT data and reconstruct rows of [R,G,B] pixels.
  // Only RGB (colourType 2, 3 channels) and RGBA (colourType 6, 4 channels)
  // images are fully decoded into pixel arrays; all other colour types return
  // pixels as null because this parser is scoped to the RGB fixture tests.
  const compressed = Buffer.concat(idatBuffers);
  const raw        = zlib.inflateSync(compressed);
  const channels   = colourType === 2 ? 3 : colourType === 6 ? 4 : null;
  const rowBytes   = 1 + width * (channels ?? 1);
  const pixels     = channels !== null ? [] : null;
  if (pixels !== null) {
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const base = y * rowBytes + 1 + x * channels;
        row.push([raw[base], raw[base + 1], raw[base + 2]]);
      }
      pixels.push(row);
    }
  }

  return { width, height, bitDepth, colourType, chunks, pixels };
}

const FIXTURES = path.join(__dirname, 'fixtures');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function loadFixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name));
}

// ---------------------------------------------------------------------------
// Fixture directory sanity
// ---------------------------------------------------------------------------

describe('fixtures directory', () => {
  test('fixtures/ directory exists', () => {
    assert.ok(fs.existsSync(FIXTURES), 'tests/fixtures/ directory is missing');
  });

  test('contains at least 7 PNG files', () => {
    const pngs = fs.readdirSync(FIXTURES).filter(f => f.endsWith('.png'));
    assert.ok(pngs.length >= 7, `Expected ≥7 PNG fixtures, found ${pngs.length}`);
  });

  test('every file in fixtures/ is a PNG', () => {
    const files = fs.readdirSync(FIXTURES);
    for (const f of files) {
      assert.ok(f.endsWith('.png'), `Non-PNG file in fixtures/: ${f}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-image tests
// ---------------------------------------------------------------------------

describe('solid colour images', () => {
  test('red.png – all pixels are red', () => {
    const { width, height, pixels } = parsePng(loadFixture('red.png'));
    assert.equal(width, 8);
    assert.equal(height, 8);
    for (const row of pixels) {
      for (const [r, g, b] of row) {
        assert.equal(r, 255, 'R channel should be 255');
        assert.equal(g, 0,   'G channel should be 0');
        assert.equal(b, 0,   'B channel should be 0');
      }
    }
  });

  test('green.png – all pixels are teal-green (0,200,80)', () => {
    const { width, height, pixels } = parsePng(loadFixture('green.png'));
    assert.equal(width, 8);
    assert.equal(height, 8);
    for (const row of pixels) {
      for (const [r, g, b] of row) {
        assert.equal(r, 0,   'R channel should be 0');
        assert.equal(g, 200, 'G channel should be 200');
        assert.equal(b, 80,  'B channel should be 80');
      }
    }
  });

  test('blue.png – all pixels are sky-blue (0,80,255)', () => {
    const { width, height, pixels } = parsePng(loadFixture('blue.png'));
    assert.equal(width, 8);
    assert.equal(height, 8);
    for (const row of pixels) {
      for (const [r, g, b] of row) {
        assert.equal(r, 0,   'R channel should be 0');
        assert.equal(g, 80,  'G channel should be 80');
        assert.equal(b, 255, 'B channel should be 255');
      }
    }
  });

  test('white.png – all pixels are white (255,255,255)', () => {
    const { pixels } = parsePng(loadFixture('white.png'));
    for (const row of pixels) {
      for (const px of row) {
        assert.deepEqual(px, [255, 255, 255]);
      }
    }
  });

  test('black.png – all pixels are black (0,0,0)', () => {
    const { pixels } = parsePng(loadFixture('black.png'));
    for (const row of pixels) {
      for (const px of row) {
        assert.deepEqual(px, [0, 0, 0]);
      }
    }
  });
});

describe('patterned images', () => {
  test('checkerboard.png – alternating cyan and dark pixels', () => {
    const { width, height, pixels } = parsePng(loadFixture('checkerboard.png'));
    assert.equal(width, 8);
    assert.equal(height, 8);
    const CYAN = [0, 245, 255];
    const DARK = [5, 5, 20];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const expected = (x + y) % 2 === 0 ? CYAN : DARK;
        assert.deepEqual(pixels[y][x], expected,
          `checkerboard pixel (${x},${y}) expected ${expected}, got ${pixels[y][x]}`);
      }
    }
  });

  test('gradient.png – R channel decreases left-to-right', () => {
    const { width, height, pixels } = parsePng(loadFixture('gradient.png'));
    assert.equal(width, 8);
    assert.equal(height, 8);
    // In each row the leftmost pixel has R=167 and the rightmost has R=0
    for (let y = 0; y < height; y++) {
      assert.equal(pixels[y][0][0], 167, 'leftmost R should be 167');
      assert.equal(pixels[y][width - 1][0], 0, 'rightmost R should be 0');
      // Monotonically non-increasing
      for (let x = 1; x < width; x++) {
        assert.ok(
          pixels[y][x][0] <= pixels[y][x - 1][0],
          `R should be non-increasing at column ${x}`
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// PNG structure validation (applies to every fixture)
// ---------------------------------------------------------------------------

describe('PNG structural integrity', () => {
  const fixtures = fs.readdirSync(FIXTURES).filter(f => f.endsWith('.png'));

  for (const name of fixtures) {
    test(`${name} – valid PNG signature, chunks and CRC-32`, () => {
      const buf = loadFixture(name);
      // parsePng throws via assert on any structural failure
      const meta = parsePng(buf);
      assert.ok(meta.width  > 0, 'width must be positive');
      assert.ok(meta.height > 0, 'height must be positive');
      assert.equal(meta.bitDepth,   8, 'bit depth should be 8');
      assert.equal(meta.colourType, 2, 'colour type should be 2 (RGB)');
    });
  }
});
