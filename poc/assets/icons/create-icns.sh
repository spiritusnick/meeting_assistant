#!/bin/bash
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
