const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="200" fill="#0071e3"/>
  
  <!-- Microphone Icon -->
  <g transform="translate(512, 512)">
    <!-- Mic body -->
    <rect x="-100" y="-300" width="200" height="300" rx="100" fill="white"/>
    
    <!-- Mic stand -->
    <rect x="-20" y="0" width="40" height="150" fill="white"/>
    <rect x="-80" y="130" width="160" height="40" rx="20" fill="white"/>
    
    <!-- Recording indicator -->
    <circle cx="200" cy="-200" r="80" fill="#ff3333">
      <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    
    <!-- Sound waves -->
    <path d="M -250,-200 Q -300,-100 -250,0" stroke="white" stroke-width="30" fill="none" opacity="0.6"/>
    <path d="M 250,-200 Q 300,-100 250,0" stroke="white" stroke-width="30" fill="none" opacity="0.6"/>
  </g>
  
  <!-- Text -->
  <text x="512" y="880" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">MEETING</text>
</svg>`;

// Create icons directory
const iconsDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Save SVG
fs.writeFileSync(path.join(iconsDir, 'app-icon.svg'), svgIcon);

// Create a simple PNG icon (placeholder)
const createPlaceholderPNG = (size, filename) => {
  // This is a placeholder - in production, you'd use a proper image library
  // For now, we'll create a simple script to remind users to convert the SVG
  const script = `#!/bin/bash
# Convert SVG to PNG using ImageMagick or similar
# brew install imagemagick
# convert -background none -resize ${size}x${size} app-icon.svg ${filename}
echo "Please convert app-icon.svg to ${filename} (${size}x${size})"
`;
  fs.writeFileSync(path.join(iconsDir, `create-${filename}.sh`), script);
  fs.chmodSync(path.join(iconsDir, `create-${filename}.sh`), '755');
};

// Create various icon sizes
const iconSizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 64, name: 'icon-64.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon-256.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 1024, name: 'icon-1024.png' }
];

iconSizes.forEach(({ size, name }) => {
  createPlaceholderPNG(size, name);
});

// Create macOS .icns placeholder script
const icnsScript = `#!/bin/bash
# Create macOS .icns file
# Requires iconutil (comes with Xcode)

mkdir -p app.iconset
cp icon-16.png app.iconset/icon_16x16.png
cp icon-32.png app.iconset/icon_16x16@2x.png
cp icon-32.png app.iconset/icon_32x32.png
cp icon-64.png app.iconset/icon_32x32@2x.png
cp icon-128.png app.iconset/icon_128x128.png
cp icon-256.png app.iconset/icon_128x128@2x.png
cp icon-256.png app.iconset/icon_256x256.png
cp icon-512.png app.iconset/icon_256x256@2x.png
cp icon-512.png app.iconset/icon_512x512.png
cp icon-1024.png app.iconset/icon_512x512@2x.png

iconutil -c icns app.iconset -o app.icns
rm -rf app.iconset

echo "Created app.icns"
`;

fs.writeFileSync(path.join(iconsDir, 'create-icns.sh'), icnsScript);
fs.chmodSync(path.join(iconsDir, 'create-icns.sh'), '755');

console.log('Icon templates created in:', iconsDir);
console.log('To generate actual icons:');
console.log('1. Install ImageMagick: brew install imagemagick');
console.log('2. Run the conversion scripts in the icons directory');