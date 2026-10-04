# Release art audit

`report.json` records every original PNG: dimensions, original hash and size,
selected encoding, WebP hash and size, alpha-weighted RGB PSNR, maximum alpha error,
and maximum RGB error composited at translucent edges. `null` PSNR means infinity.
`baseline.json` identifies the Git source for reproducible comparisons.

Required gates: at least 30% smaller, identical dimensions, PSNR >= 40 dB, exact
alpha, edge composite error <= 8/255, and total art <= 70,000,000 bytes. Nothing is
cropped, resized, shifted, or re-registered. Alpha-based torso/foot/bounds measures
therefore remain identical; native.py confirms this in WebKit for every conversion.

Masks, the moon, luminance textures, the RGB-classified jukebox/night streets,
and the Drive atlas used for measurement stay byte-identical PNG. The four night
street paintings feed RGB sky segmentation, so a global PSNR score cannot approve
changing them. Cabin's light-sampled room JPEGs are also untouched.

## Recheck this release

Requires Python with Pillow + NumPy, Node, Swift/AppKit/WebKit, and this worktree's
dev server on 5217. Commands never launch or replace the installed wallpaper app.

```sh
python3 tools/webp/verify.py
python3 tools/webp/native.py
node --test tests/*.cjs
python3 tools/webp/capture.py after
python3 tools/webp/jukebox.py
python3 tools/follow/smoke-release.py
python3 tools/play/verify.py --smoke
./build.sh
```

native.py reconstructs original PNGs from Git when checking installed art and
removes those temporary copies afterwards. Captures are converted to JPEG contact
sheets and raw screenshot PNGs removed. Conversion and capture loops stop below 3 GiB free space; check disk before building.
The plain build is a local ad-hoc app, with no packaging/notarization/install/run.

## Encoding workflow (on the PNG baseline)

1. `./tools/webp/setup.sh` builds a local encoder against Pillow's libwebp, using
   pinned libwebp 1.6.0 headers. No Homebrew or global installation is performed.
2. `python3 tools/webp/compress.py` stages method-6 WebP candidates. Saturated pet
   line art often cannot reach 40 dB with lossy 4:2:0 chroma, even at high quality.
3. `python3 tools/webp/refine.py` tries additional quality-gated candidates; cheap
   method-4 probes only select method-6 trials, and are never shipped.
4. `python3 tools/webp/bounded.py` stages near-lossless 4:4:4 RGB, restores alpha
   exactly, restores edge colours if their RGB error exceeds 4/255, and zeroes
   invisible RGB. The result is losslessly packed, preserving those bounds.
5. After both jobs finish, `python3 tools/webp/choose.py` selects the smallest
   passing candidate. `review.py` makes JPEG sprite/matte and art-detail pairs;
   `native.py` checks all candidates before installation.
6. `compress.py --apply` validates every source/target hash before replacing PNGs.
   Update explicit scene URLs and dynamic extension selectors at the same time;
   update `sprites/formats.json`, `LW.petArtPath`, and active art installers.
7. Run the release checks above, inspect every scene and edge comparison, log
   measurements and commit locally. Publication is a separate owner decision.

`assets.py` resolves existing bundled filenames for generation tools and saves
regenerated WebP frames losslessly, avoiding a second lossy encoding. Source
masters, historical Git references, and scratch cuts retain their PNG filenames.
Do not run compression over retained masks with the old palette-PNG build tool.
