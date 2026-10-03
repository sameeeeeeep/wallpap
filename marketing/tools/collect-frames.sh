#!/bin/sh
# Move frames saved by inpage-capture.js (livewall/shots/mk-<name>-NNNN.png) into
# marketing/frames/<name>/NNNN.png and encode a silent H.264 preview: marketing/frames/<name>.mp4
set -e
name="$1"; [ -n "$name" ] || { echo "usage: $0 <name>"; exit 1; }
here="$(cd "$(dirname "$0")" && pwd)"; mkt="$(dirname "$here")"; shots="$(dirname "$mkt")/shots"
out="$mkt/frames/$name"; mkdir -p "$out"
n=0
for f in "$shots"/mk-"$name"-*.png; do
  [ -e "$f" ] || continue
  num="${f##*-}"; mv "$f" "$out/$num"; n=$((n+1))
done
echo "moved $n frames → $out"
ffmpeg -nostdin -v error -y -framerate 30 -i "$out/%04d.png" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -movflags +faststart "$mkt/frames/$name.mp4"
echo "→ $mkt/frames/$name.mp4"
