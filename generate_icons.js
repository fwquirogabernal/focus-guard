/**
 * Focus Guard - Icon Generator
 * Run with: node generate_icons.js
 *
 * Generates icon PNG files using only Node.js built-ins (no dependencies).
 * Creates a shield/lock-style icon in deep purple/blue.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- CRC32 table ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Create a PNG buffer for a given size with a gradient + lock symbol drawn
 * using simple pixel art at key sizes.
 */
function createIconPNG(size) {
  const width = size;
  const height = size;

  // RGBA pixel buffer
  const pixels = new Uint8Array(width * height * 4);

  const setPixel = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = (y * width + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  };

  // Background: deep purple gradient (approximate with per-row lerp)
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const r = Math.round(48 * (1 - t) + 36 * t);   // #302b63 -> #24243e
    const g = Math.round(43 * (1 - t) + 36 * t);
    const b = Math.round(99 * (1 - t) + 62 * t);
    for (let x = 0; x < width; x++) {
      setPixel(x, y, r, g, b);
    }
  }

  // Draw a rounded square border (white, partial alpha) to look like an icon frame
  const borderColor = [255, 255, 255, 60];
  for (let x = 1; x < width - 1; x++) {
    setPixel(x, 1, ...borderColor);
    setPixel(x, height - 2, ...borderColor);
  }
  for (let y = 1; y < height - 1; y++) {
    setPixel(1, y, ...borderColor);
    setPixel(width - 2, y, ...borderColor);
  }

  // Draw a simple lock shape scaled to icon size
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  if (size >= 48) {
    // Lock body (rectangle)
    const bw = Math.floor(size * 0.42);
    const bh = Math.floor(size * 0.34);
    const bx = cx - Math.floor(bw / 2);
    const by = cy - Math.floor(bh * 0.1);
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        setPixel(x, y, 99, 179, 237); // #63b3ed (blue)
      }
    }

    // Lock shackle (arc approximated as a U shape)
    const sw = Math.floor(bw * 0.5);
    const sh = Math.floor(size * 0.25);
    const sx = cx - Math.floor(sw / 2);
    const sy = by - sh;
    const thickness = Math.max(2, Math.floor(size * 0.07));
    // Left bar
    for (let y = sy; y < by + Math.floor(bh * 0.3); y++) {
      for (let t = 0; t < thickness; t++) setPixel(sx + t, y, 154, 230, 180);
    }
    // Right bar
    for (let y = sy; y < by + Math.floor(bh * 0.3); y++) {
      for (let t = 0; t < thickness; t++) setPixel(sx + sw - thickness + t, y, 154, 230, 180);
    }
    // Top arc (straight top for simplicity)
    for (let x = sx; x <= sx + sw; x++) {
      for (let t = 0; t < thickness; t++) setPixel(x, sy + t, 154, 230, 180);
    }

    // Keyhole dot
    const kr = Math.max(2, Math.floor(size * 0.07));
    for (let y = by + Math.floor(bh * 0.25); y < by + Math.floor(bh * 0.65); y++) {
      for (let x = cx - kr; x <= cx + kr; x++) {
        setPixel(x, y, 48, 43, 99);
      }
    }
  } else {
    // 16px: just a simple lock rectangle + shackle (minimal)
    // Body
    for (let y = cy - 1; y <= cy + 3; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        setPixel(x, y, 99, 179, 237);
      }
    }
    // Shackle
    for (let y = cy - 4; y <= cy; y++) {
      setPixel(cx - 2, y, 154, 230, 180);
      setPixel(cx + 2, y, 154, 230, 180);
    }
    for (let x = cx - 2; x <= cx + 2; x++) {
      setPixel(x, cy - 4, 154, 230, 180);
    }
  }

  // Build raw PNG data: for each row: filter byte (0 = None) + RGBA pixels
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = rowStart + 1 + x * 4;
      rawData[ri] = pixels[pi];
      rawData[ri + 1] = pixels[pi + 1];
      rawData[ri + 2] = pixels[pi + 2];
      rawData[ri + 3] = pixels[pi + 3];
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Main ---
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

[16, 48, 128].forEach((size) => {
  const png = createIconPNG(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
});

console.log('\nDone! Icons generated in ./icons/');
