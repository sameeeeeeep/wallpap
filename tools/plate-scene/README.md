# Plate scenes

`build-kit.py` packages the generated day/night masters in `art-src/plate-scenes/` into three Kit.plate add-ons.
Run from the repository root with Python, Pillow, NumPy and SciPy installed:

```
python3 tools/plate-scene/build-kit.py
addons/build.sh
tools/pack-scene.sh addons/marine-drive
tools/pack-scene.sh addons/taj-mahal
tools/pack-scene.sh addons/hillside-valley
```

The manifest records source paths and normalized measured water/ground polygons. Sky extraction is connected to the
upper border, with scene-specific thresholds and a gradient barrier for painted mountain silhouettes. Inspect the
render after changing art; thresholds are specific to these masters. Day/night sources are geometry-preserving imagegen
edits. Dawn/dusk and overcast use Kit's lighting fallback; no extra generated variants are claimed.

The older `plate.py` workflow supports multi-variant alignment, keyed masks and sprite sheets from per-scene `spec.json`.
Its `gen` subcommand invokes Codex subprocesses; it was not used in this pass. New art was generated through the built-in
image tool. See docs/scene-polish.md for prompts and verification.
