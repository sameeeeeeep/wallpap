#!/bin/zsh
# usage: gen.sh <name> [ref1.png,ref2.png]   prompt in prompts/<name>.txt, output raw/<name>.png
cd "$(dirname "$0")"
name=$1; refs=$2
out="$PWD/raw/$name.png"
p="$(cat prompts/$name.txt)

Save the final image as a PNG file at exactly this path: $out (create it; overwrite if it exists). Do not create any other files in the repository."
if [[ -n "$refs" ]]; then
  echo "$p" | codex exec -s workspace-write --skip-git-repo-check -i "$refs" - > logs/$name.log 2>&1
else
  echo "$p" | codex exec -s workspace-write --skip-git-repo-check - > logs/$name.log 2>&1
fi
[[ -f $out ]] && echo "OK $name $(sips -g pixelWidth -g pixelHeight $out | tail -2 | awk '{print $2}' | tr '\n' 'x')" || echo "FAIL $name"
