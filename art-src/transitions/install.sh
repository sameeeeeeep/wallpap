#!/bin/zsh
# usage: install.sh <slug> <seq...>   slug = cat-black | dog-golden | panda-mei …  (copies cut/<slug>-<seq>-N.png → sprites t/)
cd "${0:A:h}/../.."
slug=$1; shift
kind=${slug%%-*}s; name=${slug#*-}
dst=scenes/art/sprites/$kind/$name/t; mkdir -p $dst
for q in "$@"; do for i in 1 2 3 4 5; do python3 tools/webp/assets.py art-src/transitions/cut/$slug-$q-$i.png $dst/$q-$i.png; done; done
ls $dst | wc -l
