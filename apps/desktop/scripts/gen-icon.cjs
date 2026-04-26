'use strict';
/**
 * Pure Node.js icon generator — draws shield + medical cross + circuit nodes.
 * Generates: public/icon.png (256×256) and public/icon.ico (multi-size)
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── Colors ──────────────────────────────────────────────────────────────────
const TEAL      = { r: 13,  g: 148, b: 136 }; // #0D9488
const TEAL_LITE = { r: 20,  g: 184, b: 166 }; // #14B8A6
const WHITE     = { r: 255, g: 255, b: 255 };
const BG        = { r: 255, g: 255, b: 255 }; // transparent-ish (white bg for ICO)

// ─── CRC32 ───────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG builder ─────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const lenBuf = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf  = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const p = pixels[y * size + x];
      raw[y * rowLen + 1 + x * 3] = p.r;
      raw[y * rowLen + 2 + x * 3] = p.g;
      raw[y * rowLen + 3 + x * 3] = p.b;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Pixel helpers ───────────────────────────────────────────────────────────
function fillBg(pixels, size, color) {
  for (let i = 0; i < size * size; i++) pixels[i] = { ...color };
}

function fillRect(pixels, size, x, y, w, h, color) {
  for (let ry = Math.max(0, Math.floor(y)); ry < Math.min(size, Math.ceil(y + h)); ry++) {
    for (let rx = Math.max(0, Math.floor(x)); rx < Math.min(size, Math.ceil(x + w)); rx++) {
      pixels[ry * size + rx] = { ...color };
    }
  }
}

function fillCircle(pixels, size, cx, cy, r, color) {
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(size, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(size, Math.ceil(cx + r)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        pixels[y * size + x] = { ...color };
      }
    }
  }
}

function fillRoundedRect(pixels, size, x, y, w, h, radius, color) {
  for (let ry = Math.max(0, Math.floor(y)); ry < Math.min(size, Math.ceil(y + h)); ry++) {
    for (let rx = Math.max(0, Math.floor(x)); rx < Math.min(size, Math.ceil(x + w)); rx++) {
      const dx = Math.min(rx - x, x + w - rx);
      const dy = Math.min(ry - y, y + h - ry);
      if (dx < 0 || dy < 0) continue;
      if ((dx < radius && dy < radius) && (radius - dx) ** 2 + (radius - dy) ** 2 > radius ** 2) continue;
      pixels[ry * size + rx] = { ...color };
    }
  }
}

// Approximate shield shape for larger sizes
function fillShield(pixels, size, color, innerColor) {
  const cx = size / 2;
  const s = size / 100;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Simplified shield: rounded top, straight sides, pointed bottom
      let inside = false;
      if (v < 0.25) {
        // Top rounded cap
        const dx = Math.abs(u - 0.5);
        inside = dx < 0.42 * (1 - (v / 0.25) * 0.05);
      } else if (v < 0.88) {
        // Body
        const dx = Math.abs(u - 0.5);
        const taper = 0.44 - (v - 0.25) * 0.10;
        inside = dx < taper;
      } else {
        // Bottom point
        const dx = Math.abs(u - 0.5);
        const rem = (v - 0.88) / 0.12;
        inside = dx < 0.34 * (1 - rem);
      }

      if (inside) {
        // Inner highlight border
        const dx = Math.abs(u - 0.5);
        const isEdge = dx > 0.38 || v < 0.08 || v > 0.90;
        pixels[y * size + x] = { ...(isEdge ? color : innerColor) };
      }
    }
  }
}

// ─── Icon renderer ───────────────────────────────────────────────────────────
function renderIcon(size) {
  const pixels = new Array(size * size);
  fillBg(pixels, size, BG);

  if (size <= 32) {
    // Small: rounded square + cross, no shield point, no nodes
    const pad = Math.round(size * 0.06);
    const r = Math.round(size * 0.18);
    fillRoundedRect(pixels, size, pad, pad, size - pad * 2, size - pad * 2, r, TEAL);

    // Cross: two overlapping rectangles
    const barThick = Math.max(2, Math.round(size * 0.18));
    const barLen   = Math.max(4, Math.round(size * 0.56));
    fillRect(pixels, size, (size - barThick) / 2, (size - barLen) / 2, barThick, barLen, WHITE);
    fillRect(pixels, size, (size - barLen) / 2, (size - barThick) / 2, barLen, barThick, WHITE);
  } else {
    // Medium+: shield shape
    fillShield(pixels, size, TEAL, TEAL_LITE);

    // Cross
    const barThick = Math.round(size * 0.18);
    const barLenV  = Math.round(size * 0.44);
    const barLenH  = Math.round(size * 0.44);
    fillRect(pixels, size, (size - barThick) / 2, (size - barLenV) / 2, barThick, barLenV, WHITE);
    fillRect(pixels, size, (size - barLenH) / 2, (size - barThick) / 2, barLenH, barThick, WHITE);

    // Circuit nodes (corners) — only for 48+
    const nodeR = Math.max(2, Math.round(size * 0.04));
    const offset = Math.round(size * 0.22);
    fillCircle(pixels, size, offset, offset, nodeR, WHITE);
    fillCircle(pixels, size, size - offset, offset, nodeR, WHITE);
    fillCircle(pixels, size, offset, size - offset, nodeR, WHITE);
    fillCircle(pixels, size, size - offset, size - offset, nodeR, WHITE);
  }

  return pixels;
}

// ─── ICO builder ─────────────────────────────────────────────────────────────
function makeIco(entries) {
  const header = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + 16 * entries.length;
  const dirEntries = entries.map(({ size, buf }) => {
    const e = Buffer.allocUnsafe(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1,  4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.buf)]);
}

// ─── Main ────────────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const SIZES = [16, 32, 48, 64, 128, 256];
const pngs = SIZES.map(size => {
  const pixels = renderIcon(size);
  const buf = encodePNG(size, pixels);
  console.log(`  ✓ ${size}×${size}`);
  return { size, buf };
});

fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.png'), pngs[pngs.length - 1].buf);
console.log('Generated public/icon.png (256×256)');

fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.ico'), makeIco(pngs));
console.log('Generated public/icon.ico (16/32/48/64/128/256px)');

console.log('Icon generation complete.');
