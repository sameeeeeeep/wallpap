#!/bin/zsh
# usage: install.sh <slug> <cycle...>   slug = cat-black | dog-golden | panda-mei …
# cuts art-src/cycles/<slug>-<cycle>.png into cut/ (left→right) and copies the frames to
# scenes/art/sprites/<kind>s/<name>/cycle/<cycle>-N.png (expects exactly 8 walk / 6 run pieces)
cd "${0:A:h}/../.."
slug=$1; shift
kind=${slug%%-*}s; name=${slug#*-}
dst=scenes/art/sprites/$kind/$name/cycle; mkdir -p $dst
for q in "$@"; do
  n=8; [[ $q == run ]] && n=6
  rm -f art-src/cycles/cut/$slug-$q-*.png(N)
  python3 art-src/cycles/cut.py art-src/cycles/$slug-$q.png art-src/cycles/cut $slug-$q $n > /dev/null   # (Vision's cutout.swift holed dark patches)
  got=$(ls art-src/cycles/cut/$slug-$q-*.png | wc -l | tr -d ' ')
  [[ $got == $n ]] || { echo "$slug-$q: $got pieces, expected $n — not installed"; continue; }
  for i in $(seq 1 $n); do cp art-src/cycles/cut/$slug-$q-$i.png $dst/$q-$i.png; done
  echo "$slug-$q: installed $n frames"
done
