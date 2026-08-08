const { PNG } = require('pngjs');
const fs = require('fs');

function createIcon(size, drawFn) {
  const png = new PNG({ width: size, height: size });
  // Transparent background
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }
  drawFn(png, size);
  return PNG.sync.write(png);
}

function setPixel(png, x, y, r, g, b, a, size) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

// Draw back arrow icon (72x72)
function drawBackArrow(png, size) {
  const cx = size / 2;
  const cy = size / 2;
  // Left arrow chevron: two lines forming a <
  // Line from (32, 36) to (44, 24) and (32, 36) to (44, 48)
  for (let t = 0; t <= 1; t += 0.02) {
    // Upper line
    const x1 = 32 + t * 12;
    const y1 = 36 - t * 12;
    setPixel(png, x1, y1, 255, 255, 255, 255, size);
    setPixel(png, x1 + 1, y1, 255, 255, 255, 255, size);
    // Lower line
    const x2 = 32 + t * 12;
    const y2 = 36 + t * 12;
    setPixel(png, x2, y2, 255, 255, 255, 255, size);
    setPixel(png, x2 + 1, y2, 255, 255, 255, 255, size);
  }
}

// Draw plus icon (72x72)
function drawPlus(png, size) {
  const cx = size / 2;
  const cy = size / 2;
  // Horizontal line
  for (let x = 26; x <= 46; x++) {
    setPixel(png, x, cy, 255, 255, 255, 255, size);
    setPixel(png, x, cy - 1, 255, 255, 255, 255, size);
    setPixel(png, x, cy + 1, 255, 255, 255, 255, size);
  }
  // Vertical line
  for (let y = 26; y <= 46; y++) {
    setPixel(png, cx, y, 255, 255, 255, 255, size);
    setPixel(png, cx - 1, y, 255, 255, 255, 255, size);
    setPixel(png, cx + 1, y, 255, 255, 255, 255, size);
  }
}

// Draw checklist icon (128x128)
function drawChecklist(png, size) {
  // Background rounded rect #262626
  const radius = 28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inCorner = false;
      if (x < radius && y < radius) {
        if ((x - radius) * (x - radius) + (y - radius) * (y - radius) > radius * radius) inCorner = true;
      } else if (x >= size - radius && y < radius) {
        if ((x - (size - radius - 1)) * (x - (size - radius - 1)) + (y - radius) * (y - radius) > radius * radius) inCorner = true;
      } else if (x < radius && y >= size - radius) {
        if ((x - radius) * (x - radius) + (y - (size - radius - 1)) * (y - (size - radius - 1)) > radius * radius) inCorner = true;
      } else if (x >= size - radius && y >= size - radius) {
        if ((x - (size - radius - 1)) * (x - (size - radius - 1)) + (y - (size - radius - 1)) * (y - (size - radius - 1)) > radius * radius) inCorner = true;
      }
      if (!inCorner) {
        setPixel(png, x, y, 38, 38, 38, 255, size); // #262626
      }
    }
  }

  // Draw notepad lines (white with 60% opacity = 153)
  const lineAlpha = 153;
  // Notepad body outline
  const padX = 34, padY = 24, padW = 60, padH = 80;
  for (let x = padX; x < padX + padW; x++) {
    setPixel(png, x, padY, 255, 255, 255, lineAlpha, size);
    setPixel(png, x, padY + padH - 1, 255, 255, 255, lineAlpha, size);
  }
  for (let y = padY; y < padY + padH; y++) {
    setPixel(png, padX, y, 255, 255, 255, lineAlpha, size);
    setPixel(png, padX + padW - 1, y, 255, 255, 255, lineAlpha, size);
  }
  // Horizontal lines inside notepad
  for (let i = 0; i < 4; i++) {
    const ly = padY + 18 + i * 16;
    for (let x = padX + 10; x < padX + padW - 10; x++) {
      setPixel(png, x, ly, 255, 255, 255, lineAlpha, size);
    }
  }
  // Checkbox squares on left
  for (let i = 0; i < 4; i++) {
    const by = padY + 14 + i * 16;
    for (let x = padX + 4; x < padX + 12; x++) {
      setPixel(png, x, by, 255, 255, 255, lineAlpha, size);
      setPixel(png, x, by + 6, 255, 255, 255, lineAlpha, size);
    }
    for (let y = by; y <= by + 6; y++) {
      setPixel(png, padX + 4, y, 255, 255, 255, lineAlpha, size);
      setPixel(png, padX + 12, y, 255, 255, 255, lineAlpha, size);
    }
  }
}

// Generate icons
fs.writeFileSync('src/common/ic-back.png', createIcon(72, drawBackArrow));
console.log('Generated: src/common/ic-back.png');

fs.writeFileSync('src/common/ic-plus.png', createIcon(72, drawPlus));
console.log('Generated: src/common/ic-plus.png');

fs.writeFileSync('src/common/empty-icon.png', createIcon(128, drawChecklist));
console.log('Generated: src/common/empty-icon.png');
