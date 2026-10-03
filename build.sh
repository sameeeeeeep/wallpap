#!/bin/zsh
# Builds wallpap.app next to this script.
#   ./build.sh          build
#   ./build.sh --run    build and (re)launch
#   ./build.sh --zip    build and package dist/wallpap.zip for release
set -e
cd "$(dirname "$0")"
APP=wallpap.app
rm -rf $APP LiveWall.app
mkdir -p $APP/Contents/MacOS $APP/Contents/Resources
FW=(-framework AppKit -framework WebKit -framework ServiceManagement -framework CoreLocation -framework IOKit -framework CoreServices -framework ScreenCaptureKit -framework Accelerate -framework CoreMedia)
if [[ "$1" == "--zip" || "$1" == "--dmg" ]]; then
  # Release: universal binary (Apple Silicon + Intel), macOS 13+
  mkdir -p .build
  swiftc -O -target arm64-apple-macos13 -o .build/wallpap-arm64 host/main.swift host/BeatSync.swift host/Panel.swift host/License.swift host/Catalog.swift host/Layout.swift host/Reminders.swift host/Skins.swift host/Cycle.swift $FW
  swiftc -O -target x86_64-apple-macos13 -o .build/wallpap-x86_64 host/main.swift host/BeatSync.swift host/Panel.swift host/License.swift host/Catalog.swift host/Layout.swift host/Reminders.swift host/Skins.swift host/Cycle.swift $FW
  lipo -create .build/wallpap-arm64 .build/wallpap-x86_64 -output $APP/Contents/MacOS/wallpap
else
  swiftc -O -o $APP/Contents/MacOS/wallpap host/main.swift host/BeatSync.swift host/Panel.swift host/License.swift host/Catalog.swift host/Layout.swift host/Reminders.swift host/Skins.swift host/Cycle.swift $FW
fi
cp host/Info.plist $APP/Contents/Info.plist
[[ -f host/AppIcon.icns ]] && cp host/AppIcon.icns $APP/Contents/Resources/AppIcon.icns
mkdir -p $APP/Contents/Resources/scenes
cp scenes/*.html scenes/*.js $APP/Contents/Resources/scenes/
[[ -d scenes/art ]] && cp -R scenes/art $APP/Contents/Resources/scenes/art
# Ad-hoc signature with a STABLE designated requirement (bundle id, not cdhash), so
# macOS privacy permissions (Automation for Music/Spotify, Screen & Audio capture)
# survive rebuilds instead of silently resetting every build.
codesign --force --sign - --requirements '=designated => identifier "live.wallpap.mac"' $APP >/dev/null 2>&1 || true
# Release builds: Developer ID + hardened runtime + timestamp, which notarization requires.
NOTARY_PROFILE=${NOTARY_PROFILE:-relay-notary}   # same Apple ID + team as Switchboard
DEVID=""
if [[ "$1" == "--zip" || "$1" == "--dmg" ]]; then
  DEVID=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application:[^"]*\)".*/\1/p' | head -1)
  if [[ -n "$DEVID" ]]; then
    codesign --force --deep --options runtime --timestamp --entitlements host/wallpap.entitlements --sign "$DEVID" $APP
    codesign --verify --strict --verbose=2 $APP
  else
    echo "⚠︎ no Developer ID Application certificate: release stays ad-hoc signed (Gatekeeper will warn)"
  fi
fi
echo "built $PWD/$APP"
if [[ "$1" == "--zip" || "$1" == "--dmg" ]]; then
  mkdir -p dist && rm -f dist/wallpap.zip dist/wallpap.dmg
  ditto -c -k --sequesterRsrc --keepParent $APP dist/wallpap.zip
  # Drag-to-Applications disk image
  STAGE=$(mktemp -d)/wallpap
  mkdir -p "$STAGE" && cp -R $APP "$STAGE/" && ln -s /Applications "$STAGE/Applications"
  hdiutil create -volname wallpap -srcfolder "$STAGE" -ov -format UDZO -quiet dist/wallpap.dmg
  if [[ -n "$DEVID" ]]; then
    codesign --force --sign "$DEVID" --timestamp dist/wallpap.dmg
    # Uses the Switchboard profile; to recreate: xcrun notarytool store-credentials relay-notary --apple-id <id> --team-id 55354KFTHU
    if xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" >/dev/null 2>&1; then
      echo "notarizing (a few minutes)…"
      xcrun notarytool submit dist/wallpap.dmg --keychain-profile "$NOTARY_PROFILE" --wait
      xcrun stapler staple dist/wallpap.dmg && xcrun stapler validate dist/wallpap.dmg
      spctl -a -t open --context context:primary-signature -vv dist/wallpap.dmg
    else
      echo "⚠︎ signed but NOT notarized: no notarytool profile '$NOTARY_PROFILE' (see comment above)"
    fi
  fi
  echo "packaged $PWD/dist/wallpap.zip ($(du -h dist/wallpap.zip | cut -f1)) + dist/wallpap.dmg ($(du -h dist/wallpap.dmg | cut -f1))"
fi
if [[ "$1" == "--run" ]]; then
  pkill -x wallpap 2>/dev/null || true
  pkill -x LiveWall 2>/dev/null || true
  open $APP
fi
