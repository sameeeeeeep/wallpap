#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
case "${1:-}" in ''|*[!a-z0-9-]*|-*|*-|*--*) echo 'usage: new-card.sh <lowercase-id> "one line"' >&2; exit 1;; esac
[ -n "${2:-}" ] || { echo 'A description is required' >&2; exit 1; }
[ ! -e "scenes/play/cards/$1" ] || { echo 'Card already exists' >&2; exit 1; }
cp -R scenes/play/cards/_template "scenes/play/cards/$1"
node - "$1" "$2" <<'JS'
const fs=require('node:fs');const [id,brief]=process.argv.slice(2);const p='scenes/play/cards/'+id;const m=JSON.parse(fs.readFileSync(p+'/card.json'));m.id=id;m.name=id.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');fs.writeFileSync(p+'/card.json',JSON.stringify(m,null,2)+'\n');fs.writeFileSync(p+'/BRIEF.md',brief+'\n\nImplement every gate in ../../CARD-SPEC.md before registering in catalog.json.\n');
JS
printf 'Scaffold ready: scenes/play/cards/%s\n' "$1"
