const { PNG } = require('pngjs');
const fs = require('fs');

const size = 90;
const png = new PNG({ width: size, height: size });

// Background: transparent
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const idx = (y * size + x) * 4;
    png.data[idx] = 0;     // R
    png.data[idx + 1] = 0; // G
    png.data[idx + 2] = 0; // B
    png.data[idx + 3] = 0; // A (transparent)
  }
}

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function drawRect(x1, y1, x2, y2, r, g, b, a) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      setPixel(x, y, r, g, b, a);
    }
  }
}

function drawRoundRect(x1, y1, x2, y2, radius, r, g, b, a) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      // Check if pixel is in rounded corner area
      let inCorner = false;
      if (x < x1 + radius && y < y1 + radius) {
        const dx = x - (x1 + radius);
        const dy = y - (y1 + radius);
        if (dx * dx + dy * dy > radius * radius) inCorner = true;
      } else if (x > x2 - radius && y < y1 + radius) {
        const dx = x - (x2 - radius);
        const dy = y - (y1 + radius);
        if (dx * dx + dy * dy > radius * radius) inCorner = true;
      } else if (x < x1 + radius && y > y2 - radius) {
        const dx = x - (x1 + radius);
        const dy = y - (y2 - radius);
        if (dx * dx + dy * dy > radius * radius) inCorner = true;
      } else if (x > x2 - radius && y > y2 - radius) {
        const dx = x - (x2 - radius);
        const dy = y - (y2 - radius);
        if (dx * dx + dy * dy > radius * radius) inCorner = true;
      }
      if (!inCorner) {
        setPixel(x, y, r, g, b, a);
      }
    }
  }
}

// Colors matching the app theme
const iconColor = { r: 102, g: 102, b: 102, a: 255 }; // #666666
const bgColor = { r: 42, g: 42, b: 42, a: 255 };      // #2A2A2A

// Draw rounded rectangle background
drawRoundRect(0, 0, 89, 89, 24, bgColor.r, bgColor.g, bgColor.b, bgColor.a);

// Draw a simple list icon
// List body (rectangle)
drawRoundRect(20, 18, 70, 72, 6, iconColor.r, iconColor.g, iconColor.b, 180);

// List lines (horizontal lines to represent list items)
const lineColor = { r: 42, g: 42, b: 42, a: 255 }; // Same as background for "cut out" effect
for (let i = 0; i < 4; i++) {
  const y = 28 + i * 12;
  drawRect(30, y, 60, y + 3, lineColor.r, lineColor.g, lineColor.b, lineColor.a);
}

// Small checkbox squares on the left
for (let i = 0; i < 4; i++) {
  const y = 27 + i * 12;
  drawRect(24, y, 28, y + 5, lineColor.r, lineColor.g, lineColor.b, lineColor.a);
}

// Write PNG
const buffer = PNG.sync.write(png);
fs.writeFileSync('src/common/empty-icon.png', buffer);
console.log('Icon generated: src/common/empty-icon.png');
