#!/bin/zsh
# Build the small near-lossless encoder locally, using Pillow's bundled libwebp.
set -e
cd "$(dirname "$0")/../.."
mkdir -p .build/webp/include/webp
for header in encode types; do
  curl -fsSL "https://raw.githubusercontent.com/webmproject/libwebp/v1.6.0/src/webp/$header.h" -o ".build/webp/include/webp/$header.h"
done
WEBP_LIB=$(python3 -c 'from pathlib import Path; import PIL; print(next((Path(PIL.__file__).parent/".dylibs").glob("libwebp.*.dylib")))')
cc -O2 -I .build/webp/include tools/webp/encode.c "$WEBP_LIB" -o .build/webp/encode
WEBP_ID=$(otool -D "$WEBP_LIB" | tail -1)
install_name_tool -change "$WEBP_ID" "$WEBP_LIB" .build/webp/encode
