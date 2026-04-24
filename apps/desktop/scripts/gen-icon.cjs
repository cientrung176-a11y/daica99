'use strict';
/**
 * Pure Node.js icon generator — không cần bất kỳ npm package nào.
 * Sinh ra:  public/icon.png  (256×256, blue #1d4ed8)
 *           public/icon.ico  (multi-size: 16,32,48,64,128,256)
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC32 (needed for PNG chunks) ───────────────────────────────────────────
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

function makePNG(size, r, g, b) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw pixel data: each row = [filter(0)] + [R G B × size]
  const rowLen = 1 + size * 3;
  const raw    = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      raw[y * rowLen + 1 + x * 3] = r;
      raw[y * rowLen + 2 + x * 3] = g;
      raw[y * rowLen + 3 + x * 3] = b;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── ICO builder (PNG-in-ICO, Windows Vista+ format) ─────────────────────────
function makeIco(entries) {
  // entries: [{size, buf}]
  const header = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // type: 1 = ICO
  header.writeUInt16LE(entries.length, 4); // count

  let offset = 6 + 16 * entries.length;
  const dirEntries = entries.map(({ size, buf }) => {
    const e = Buffer.allocUnsafe(16);
    e[0] = size >= 256 ? 0 : size; // 0 means 256 in ICO spec
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;            // color count, reserved
    e.writeUInt16LE(1,  4);        // planes
    e.writeUInt16LE(32, 6);        // bit count
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.buf)]);
}

// ─── Main ────────────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

// Brand color: Tailwind blue-700 = #1d4ed8 = RGB(29, 78, 216)
const R = 29, G = 78, B = 216;

const SIZES = [16, 32, 48, 64, 128, 256];
const pngs  = SIZES.map(size => ({ size, buf: makePNG(size, R, G, B) }));

fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.png'), pngs[pngs.length - 1].buf);
console.log('✓ Generated public/icon.png (256×256)');

fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.ico'), makeIco(pngs));
console.log('✓ Generated public/icon.ico (16/32/48/64/128/256px)');

console.log('Icon generation complete.');
