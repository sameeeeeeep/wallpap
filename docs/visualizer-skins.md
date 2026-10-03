# Visualizer skins for wallpap: research and proposals

Date: 2026-10-03. Research only, no code changed.
Brief: more music skins in the spirit of **Cymatics** (a real physical system, music drives its parameters, beautiful when idle). Restrained and cinematic in the Anyma sense. No bars, no waveform lines, no particle fountains, no MilkDrop clones.

---

## TL;DR

- **The gap:** almost every visualizer on the market maps *energy to size* on top of a generic primitive (bars, rings, particles, feedback warps). Nobody ships **music-driven physical installations**: kinetic sculptures, fluids, instruments, natural phenomena. These are calm by construction, because the material has inertia, viscosity and motor limits, and they have real thresholds that a drop can cross.
- **15 skins below**, each based on a real phenomenon or a well-known kinetic artwork. **Build first:** Copper Rain, Magnet Bloom, Komorebi, Harmonograph, Iron Filings, Vortex Rings. Also port **Faraday Water** from `cymatica/` as the second Cymatics skin (already built).
- **Signal upgrade needed:** `host/BeatSync.swift` sends only level/bass/mid/high/kick from a 1024-pt FFT (47 Hz bins). "Harmony" in Cymatics is currently a hash of the track title. Six of the skins need **real chroma, key, tempo and section** signals. `cymatica/src/audio.js` already does chroma, root and centroid, so port it to vDSP. Details in §4.
- **Packaging:** 4 family scenes (Cymatics / Kinetic / Fluids / Skies), each with skins. Free = the hero skin of each family. Pro = all skins + "change skin per track". Details in §6.

---

## 1. What exists, and which tropes are worn out

| Product / artist | What it is | Takeaway for wallpap |
|---|---|---|
| **iTunes / Apple Music visualizer.** G-Force licensed in 2001; Robert Hodgin's *Magnetosphere* (Barbarian Group) has been the default since iTunes 8 in 2008. "Classic" is still in Music.app. | Glowing charged particles orbiting attractors | Charged particle clouds are *the* Apple look and are 17 years old. Avoid. [Hodgin](https://roberthodgin.com/project/magnetosphere), [CDM](https://cdm.link/flight404s-magnetosphere-the-new-visualizer-in-itunes-8/), [Apple](https://support.apple.com/guide/music/turn-on-visual-effects-muse3aa39574/mac) |
| **MilkDrop / projectM** | Per-pixel feedback warps + equations; 10k "Cream of the Crop" presets, 130k+ megapack | Endless variety, one look: psychedelic kaleidoscope feedback. Avoid. [projectM](https://github.com/projectM-visualizer/projectm) |
| **Plane9** | 250+ 3D scenes, 39 transitions (Galaxy, Ring of fire, Disco ball, Cube floor) | Breadth over taste: tunnels, spectrum geometry, flythroughs. [plane9.com](https://www.plane9.com/) |
| **Magic Music Visuals / Synesthesia** | VJ tools. Synesthesia has 100+ shader scenes, Shadertoy/ISF import, MIDI/OSC | Pro-performer tools for a club screen, not for an always-on desk. [synesthesia.live](https://synesthesia.live/features) |
| **Wallpaper Engine** | Top "Audio Visualizer" (V3ng3nc3) has about 2.5M subscribers; "Customizable Audio Visualizer" about 386k | The genre is **circular/linear bars around a logo or anime art**, bass-zoom and RGB split. This is exactly the market wallpap should *not* look like. [Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=845902785), [Customizable](https://steamcommunity.com/sharedfiles/filedetails/?id=2071366191) |
| **Mobile:** STAELLA, Trapp, Vythm, Ferromagnetic (Metal; despite the name: layers, glitch, particles) | Particle/layer compositing with frequency-band routing | The same tropes in nicer packaging. [Ferromagnetic](https://headprocess.com/software/2021/04/30/introducing-ferromagnetic.html), [roundup](https://filmora.wondershare.com/audio-editing/best-music-visualizer-apps-ios-android.html) |
| **TouchDesigner community** | The staple tutorial: audio-reactive point cloud, instancing + noise displacement | Point-cloud noise displacement is the 2020s cliché. [Interactive Immersive HQ](https://interactiveimmersive.io/blog/touchdesigner-lessons/audio-reactive-visuals-a-beginner-guide/), [alltd](https://alltd.org/audio-reactive-3d-point-clouds-in-touchdesigner/) |
| **ART+COM Kinetic Rain** (Changi, 2012) | 2×608 copper drops on motorised wires, 15-min choreography, commissioned as a *calming* centrepiece | Kinetic sculpture is calm because the motors are rate-limited. **Steal:** motor limits as the smoothing filter. [ART+COM](https://artcom.de/en/?project=kinetic-rain), [Dezeen](https://www.dezeen.com/2012/07/19/kinetic-rain-artcom/). Also BMW Museum *Kinetic Sculpture* (714 spheres, "form-finding" narrative) [link](https://makezine.com/article/maker-news/kinetic-sculpture-the-bmw/) |
| **Daniel Rozin**, Mechanical Mirrors | Wooden tiles, penguins, trash: tilting pixels under raking light | Physical pixels plus a sound you can almost hear. [bitforms](https://www.bitforms.art/artwork/wooden-mirror-2), [Wikipedia](https://en.wikipedia.org/wiki/Danny_Rozin). BREAKFAST flip-discs / Brixels, same idea [link](https://theartistbreakfast.com/brixels) |
| **Reuben Margolin** | Pulleys summing sinusoids into a hanging wave surface | Interference of a few sines, done physically. [site](https://www.reubenmargolin.com/waves/contours/), [TED](https://www.ted.com/talks/reuben_margolin_sculpting_waves_in_wood_and_time) |
| **Paul Friedlander** | A spinning string lit by "chromastrobic" light forms floating 3D standing-wave shapes | Unique, Anyma-dark, never done as a visualizer. [Wikipedia](https://en.wikipedia.org/wiki/Paul_Friedlander_(artist)), [Interalia](https://www.interaliamag.org/articles/paul-friedlander-world-lines/) |
| **Sachiko Kodama**, *Protrude, Flow* (2001) | Ferrofluid sculpture that reacts to ambient sound | Direct precedent for Magnet Bloom. Hardware ferrofluid speakers sell on Etsy, so the idea is known physically but rare in software. [Wikipedia](https://en.wikipedia.org/wiki/Sachiko_Kodama), [CACM](https://cacm.acm.org/research/dynamic-ferrofluid-sculpture/), [FYFD](https://fyfluiddynamics.com/2021/05/visualizing-music-with-ferrofluids/) |
| **Cymatics photographers** (Linden Gledhill, CymaScope) | Faraday waves in water shot through an LED ring | Already the reference for cymatica's water mode. [FYFD](https://fyfluiddynamics.com/2016/02/cymatics-are-the-visualization-of-vibration-and/), [Faraday wave](https://en.wikipedia.org/wiki/Faraday_wave) |
| **Refik Anadol** | GAN + fluid-solver "data paintings"; *Fluid Dreams* is pre-rendered (about 100M particles) | Can't be done live, and has become the "AI-slop fluid" look. Take the *pigment-in-fluid* idea, not the look. [refikanadol.com](https://refikanadol.com/works/unsupervised/) |
| **Anyma / Tale of Us** (Sphere, *The End of Genesys*) | Monumental chrome androids, monochrome, slow, huge scale | Restraint, one accent colour, slow camera. [Sphere](https://www.sphereentertainmentco.com/afterlife-presents-anyma-the-end-of-genesys/) |
| **Universal Everything** (*Walking City*, Golden Nica 2014) | A slowly morphing figure: physics sim as sculpture | "Slowly evolving video sculpture" is the right tempo for a wallpaper. [It's Nice That](https://www.itsnicethat.com/articles/universal-everything-walking-city) |
| **teamLab** *Universe of Water Particles* | Particle water sim drawn as lines from 0.1% of particles, in the style of premodern Japanese painting | **Steal:** render a sim *stylised* (lines and ink), not raw particles. [teamLab](https://www.teamlab.art/w/uowp/) |
| **Ryoji Ikeda** (*datamatics*, *test pattern*) | Sound converted to binary barcodes, black/white, extreme precision | Strong, but it strobes and is aggressive. Wrong for an always-on wallpaper. [Vinyl Factory](https://www.thevinylfactory.com/features/data-as-spectacle-a-ryoji-ikeda-overview) |
| **Memo Akten & Quayola**, *Forms* (Golden Nica 2013) | Athletes' motion abstracted into trajectories | Motion traces as sculpture. Related to the Harmonograph. [Quayola](http://www.quayola.com/selectedartworks/forms/) |
| **Nathan Shipley** | StyleGAN audio-reactive visualizers (e.g. for Qrion) | Latent-space wobble tied to audio. This now reads as dated AI. [site](http://www.nathanshipley.com/gan) |

**Overused tropes (avoid in every skin):** spectrum bars, especially radial ones around artwork. Oscilloscope/waveform ribbons. Kaleidoscope feedback. Tunnels and galaxy flythroughs. Charged-particle orbs. Point clouds displaced by noise. Whole-frame bass zoom or shake. RGB-split glitch. Strobing on the kick. Rainbow hue cycling. Linear "louder = bigger".

### Design rules that fall out of this

1. **Beats move matter, never light.** This is already the Cymatics rule. Exposure only changes on slow arcs (sections, silence).
2. **Map musical *structure*, not just energy.** Harmony picks *the form*, loudness drives *agitation within the form*, phrases and bars set *when the form changes*, and the drop *crosses a physical threshold* (Rosensweig, Faraday, synchronisation, substorm breakup).
3. **Let the material's limits do the smoothing.** Motor max-velocity, viscosity, damping and pendulum periods replace ad-hoc lerps and make calm the default.
4. **Idle is the installation's own resting choreography,** never a blank or frozen frame.
5. **Palette:** a tonal ramp plus one accent taken from the album artwork. Bloom only on highlights, with ACES tone mapping.

---

## 2. The 15 skins

Legend: **Diff** S = ≤2 days, M = ~1 week, L = 2+ weeks. **Novelty** ★–★★★ (★★★ = I couldn't find anyone doing it as a music visualizer). Cost estimates are for an M1 Air at a capped render resolution (Cymatics caps at about 1400 px) and assume no per-frame 2D-canvas uploads.

### 1. Magnet Bloom: ferrofluid crown  ·  S/M  ·  ★★
- **Pitch:** A black mirror pool that grows a crown of spikes only when the music earns it.
- **Looks:** Macro shot of glossy black ferrofluid in a slate dish, lit by a single softbox highlight with one accent rim light. Above a critical field, a hexagonal lattice of spikes appears ([Rosensweig instability](https://www.researchgate.net/publication/231787536_The_normal_field_instability_in_ferrofluids_hexagon-square_transition_mechanism_and_wavenumber_selection)).
- **Music:** loudness → magnet field B, *with a threshold and hysteresis*, so quiet passages stay a mirror and spikes erupt only past Bc. Kick → field pulse: spikes jolt and a capillary ring runs outward. Key → magnet position under the dish (circle of fifths around the rim); chord change → the magnet glides and the crown slides across the pool. Brightness → spike sharpness, and at high field the hexagon→square transition (a real second threshold). Build → the magnet slowly rises. Drop → full crown.
- **Silence:** the magnet withdraws and the spikes slump viscously (~1.5 s) back to a mirror reflecting the softbox, with a faint meniscus shimmer.
- **Calm hook:** in-breath → a soft sub-threshold dome swells; out-breath → it flattens. No spikes.
- **Build:** one fullscreen fragment pass. Height = radial envelope(B) × sharpened 3-wave hex lattice (pow of summed cosines) + ripple term. Finite-difference normals, GGX black dielectric with high specular. Env = small baked studio lat-long (procedural, or one Codex-made softbox HDR-ish image). Fake AO in the valleys. Est. 1–1.5 ms.

### 2. Copper Rain: Kinetic Rain homage  ·  M  ·  ★★★
- **Pitch:** A thousand copper drops on invisible wires, morphing into the shape of the harmony.
- **Looks:** A 32×32 grid of polished copper droplets seen from below at 3/4 in a dark atrium, warm key light, soft reflections, hairline wires catching light.
- **Music:** chord → the surface is a sum of low-order standing modes cos(nx)cos(my), ordered on the same circle-of-fifths table as Cymatics, so related keys give related sculptures. Loudness → amplitude, **through a motor model** (max velocity and acceleration), which makes it graceful and never twitchy. Kick → a soft swell travelling from a point. Tempo → shape changes only on phrase boundaries (bar 1 of 8). Build → the drops gather into a perfect flat plane (tension). Drop → the plane breaks into the new form. Brightness → mode order (Cymatics' complexity tier).
- **Silence:** a 15-min looping choreography where the two halves mirror and answer each other, as at Changi.
- **Calm hook:** the whole field rises and falls as one breathing plane.
- **Build:** InstancedMesh of 1024 droplets (~80 tris each) plus line wires. 32×32 heights simulated on the CPU (trivial) and uploaded as a tiny texture. PBR copper with PMREM env, floor fog gradient, optional half-res tilt-shift. Est. ~1 ms. Variants: **Margolin Waves** (wooden slats, interference of 2–3 plane waves at chord-tone frequencies) and **Form-finding** (BMW silver spheres resolving into the artwork's silhouette).

### 3. Pendulum Wave  ·  S  ·  ★★★
- **Pitch:** Fifteen brass pendulums fall into chaos and realign exactly on the drop.
- **Looks:** Brass bobs on threads in a dark wood room. Optionally each bob carries a tiny warm light, accumulated as long-exposure light-painting trails.
- **Physics:** pendulum k makes N+k swings per cycle T, which gives travelling waves, standing waves, apparent chaos and then **perfect realignment** at T ([Harvard demo](https://sciencedemonstrations.fas.harvard.edu/presentations/pendulum-waves)).
- **Music:** tempo → T is locked to a 16- or 32-bar phrase at the detected BPM, so **the revival lands on the phrase boundary or drop**. This is the most satisfying mapping in this doc. Chroma → 12 bobs = 12 pitch classes, and each bob's light follows its pitch-class energy, so melody shimmers across the wave. Loudness → swing amplitude. Kick → nothing (restraint). New section → a gentle reset: a bar lifts and releases all bobs.
- **Silence:** keeps swinging under slow damping. Every few minutes a hand-release restarts the cycle.
- **Calm hook:** cycle T = 4 breaths, so the bobs realign at every 4th exhale.
- **Build:** analytic, θk(t) = A·cos(2π(N+k)t/T), with no sim. 12–24 instanced spheres plus thread lines, trails via a half-res decaying accumulation buffer. Est. <0.5 ms. Variant: **Metronome Sync**: 32 wooden metronomes on a rolling board that phase-lock ([Ikeguchi lab](https://boingboing.net/2016/07/13/watch-32-out-of-sync-metronome.html), Kuramoto model). They are out of sync on a new track, groups lock during the build, and all tick as one at the drop.

### 4. Harmonograph  ·  S  ·  ★★★
- **Pitch:** A pendulum pen draws the *intervals* you're hearing: consonance closes into rosettes, dissonance weaves.
- **Looks:** Top-down view of cream paper under a warm desk lamp. A fine nib draws a damped figure in sumi ink. Finished sheets stack and fade underneath.
- **Physics:** 2–3 damped pendulums at frequency ratios. Simple ratios close, and near-ratios precess slowly ([harmonograph](https://en.wikipedia.org/wiki/Harmonograph)).
- **Music:** harmony → the ratio of the two strongest pitch classes (unison 1:1, fifth 3:2, fourth 4:3, maj 3rd 5:4, min 3rd 6:5, tritone 45:32), so the figure literally shows consonance. Small detune from loudness wobble makes the rosette rotate. Brightness → nib width. Loudness → amplitude of a new figure. Tempo → one sheet per 8 or 16 bars. Drop → a third (rotary) pendulum joins, drawing in the accent ink. New track → a fresh sheet slides in.
- **Silence:** the pen spirals to the centre as damping finishes, then lifts. The finished sheet rests. Long silence → a slow 1:1 ellipse.
- **Calm hook:** one ellipse per breath, growing on the inhale.
- **Build:** CPU evaluates ~2k curve points per frame, drawn as a thick line strip into a persistent paper buffer (never cleared). Procedural paper fibre, or a Codex paper scan. A light blur on the ink layer gives bleed. Est. <0.5 ms. Variant: **Guilloché**: the same math engraved into silver or gold with anisotropic sheen (watch-dial look).

### 5. Iron Filings  ·  S (reuses the Cymatics engine)  ·  ★★★
- **Pitch:** Each tap of the kick drum shakes the filings into the shape of the chord's magnetic field.
- **Looks:** Macro of dark steel filings on frosted paper under raking light, chaining along the field lines between hidden magnets. A sister skin to Cymatics sand.
- **Physics:** tapping the sheet frees filings to rotate into **B** and chain along it. Tapping is the real technique.
- **Music:** chord tones → magnet poles placed on a ring by circle of fifths (polarity by chord function). Chord change → poles slide and the field lines reconfigure. Kick → a tap: filings hop and resettle aligned. Loudness → tap strength (agitation). Brightness → pole count (dipole → quadrupole → ring of 6). Key → orientation.
- **Silence:** a still pattern with the raking light slowly rotating (time of day) and a few dust motes.
- **Calm hook:** filings lift slightly on the in-breath and settle on the out-breath, as the Cymatics sand does.
- **Build:** fork the Cymatics grain sim (288² grains). Add an angle channel that relaxes toward the analytic field direction from ≤8 dipoles, and drift up ∇|B|² gated by agitation. Render as oriented short quads. Est. ~1.5–2 ms, the same as Cymatics.

### 6. Ripple Tank  ·  S  ·  ★★★
- **Pitch:** The school physics ripple tank, where each note is a dipper and the chord is an interference pattern.
- **Looks:** The projected image beneath a ripple tank: soft monochrome light and dark fringes on a white sheet, vignetted. Or pale aqua caustics.
- **Music:** chroma → the 2–4 strongest pitch classes each drive a point source at a scaled frequency, placed on a circle-of-fifths ring. **Consonant chords give stable symmetric fringes. Dissonant ones crawl,** because acoustic beating becomes visible. Loudness → contrast. Kick → a single droplet ring from the centre. Brightness → wavelength scale. Key change → the dippers glide around the ring.
- **Silence:** one slow dipper, then a still surface with a faint swell.
- **Calm hook:** a single source whose rings expand with the in-breath.
- **Build:** analytic sum of damped cylindrical waves in one fragment pass. Caustic shading ≈ 1/(1 + k·∇²h). Est. <0.5 ms. Optional 256² wave-equation sim for droplets and slit barriers. Variant: **Pool Caustics** (the same water, seen as sunlight on a tiled pool floor).

### 7. Pilot Wave: walking droplets  ·  M  ·  ★★★
- **Pitch:** Drops that bounce on the beat and walk on their own waves, a macroscopic quantum analog.
- **Looks:** A shallow bath of dark glossy silicone oil with a few bright beads bouncing, each in a halo of its own standing wave. They walk, orbit each other and form little crystals ([Couder & Fort; Bush, MIT](https://thales.mit.edu/bush/index.php/4801-2/)).
- **Music:** beat → bath vibration, so droplets bounce phase-locked to the beat. Loudness → "memory" (closer to the Faraday threshold means longer-lived waves, so droplets walk faster and interact more). **Drop → crossing the Faraday threshold:** the whole surface erupts into a square standing-wave lattice, then relaxes. Harmony → number of droplets and quantised orbit radii. New track → a new droplet is placed.
- **Silence:** a still mirror bath reflecting a ring light, with one bead resting on its meniscus. Drops survive only while vibrated, which is real physics: they merge into the bath one by one as the music fades.
- **Calm hook:** one droplet orbiting, and the orbit radius breathes.
- **Build:** avoid GPU readback. Each droplet's wavefield = sum of J0-like rings from its last ~20 impacts (analytic memory). Droplet motion is integrated on the CPU from that analytic gradient. The surface shader sums all rings plus a Faraday lattice term when above threshold, and is shaded like cymatica's water. Est. ~1.5 ms. Variant: **Mercury**: a liquid-metal pool with crown splashes.

### 8. Suminagashi: floating-ink marbling  ·  S/M  ·  ★★★
- **Pitch:** Every beat is a brush touch on water, and the song becomes a sheet of marbled paper.
- **Looks:** Top-down view of still water in a dark lacquer tray, with concentric alternating rings of sumi ink and clear water. A breath of air swirls them into contour-map marbling. At the end of a track, paper is laid down and lifted, and the print fades into the backdrop.
- **Music:** onset → one brush touch at the current drop point, which pushes the existing rings outward (area-preserving, as real marbling does). Harmony → ink choice from 2–3 tonal inks (tonic = sumi, dominant = indigo, subdominant = rust). Phrase → the drop point moves. Loudness → ring thickness. Build → a slow curl-flow breath begins. **Drop → a comb is drawn through,** making the classic chevron pattern. New track → paper pull.
- **Silence:** rings drift and diffuse, with a single drop about every 20 s.
- **Calm hook:** one ring per exhale.
- **Build:** **no fluid solver.** Use the closed-form area-preserving marbling maps ([Lu, Jaffer et al., IEEE CG&A 2012](https://people.csail.mit.edu/jaffer/Marbling/)). Ink drop: p′ = c + (p−c)·√(1 + r²/|p−c|²), applied inversely per pixel to a ping-pong 1024² dye texture. Tine, comb and vortex are also closed-form. Est. <1 ms. Variant: **Ink Drop** (3D ink plumes in a glass, using stable fluids; L).

### 9. Aurora Substorm  ·  M  ·  ★★
- **Pitch:** The song structure plays out as a real geomagnetic substorm.
- **Looks:** A wide night sky over a black ridgeline and a still lake reflection. Green curtains with fine vertical rays, restrained.
- **Physics:** colour by altitude: oxygen 557.7 nm green (low), 630 nm red (high), and a nitrogen purple lower hem when precipitation is energetic. A substorm goes quiet arc → brightening → breakup → corona overhead → pulsating patches ([aurora](https://en.wikipedia.org/wiki/Aurora), [substorm](https://en.wikipedia.org/wiki/Substorm)).
- **Music:** **sections = substorm phases:** intro gives a quiet arc. Build brightens the arc, rays form and the folds tighten. **The drop is the breakup:** curtains surge and converge into a corona overhead. The breakdown brings slow pulsating patches (seconds-long, not strobe). Bass energy → precipitation energy → the purple hem appears. Kick → rays ripple *along* the curtain (a real travelling motion), not a brightness flash. Harmony → fold geometry and drift direction.
- **Silence:** a faint diffuse arc, stars, and the odd meteor.
- **Calm hook:** the curtain sways like a breathing veil.
- **Build:** curtains are 3–4 ribbon splines. A half-res screen-space march (24–32 steps) through the ribbon height profile, with a precomputed 1D ray-noise texture, additive, then upsampled. Stars baked. Est. 1.5–2 ms.

### 10. Wooden Mirror: Rozin homage  ·  M  ·  ★★★
- **Pitch:** 900 wooden tiles tilt under raking light to carve the album cover.
- **Looks:** A square panel of 30×30 wooden tiles under a low side light. Each tile's tilt sets its shade, and together they render the current artwork as a wood-toned mosaic.
- **Music:** artwork → the target image, sampled once per track (upload once, never per frame). Kick → a wave of tiles ripples outward from the centre. Hi-hat or onset density → a faint shimmer. Loudness → contrast (tilt range). New track → a diagonal wipe to the new cover. Drop → a full-panel sweep. No artwork → the tiles render the current Cymatics figure, which ties the families together.
- **Silence:** a slow "wind" of tilt rolls across. Optionally a huge, quiet clock in tiles.
- **Calm hook:** one wave of tilt crosses the panel per breath.
- **Build:** 900 instanced boxes. Per-tile angle from a 30×30 texture with spring dynamics. **Codex art:** an atlas of 8 wood-grain variants. Directional light plus a cheap analytic shadow from the neighbouring tile's tilt. Est. ~0.8 ms. Variant: **Flip-Disc** (BREAKFAST-style black/brass discs, dithered artwork).

### 11. Light String: Friedlander homage  ·  S/M  ·  ★★★
- **Pitch:** A single spinning string that becomes a floating sculpture of light.
- **Looks:** A black void. A vertical string spins so fast it disappears, leaving a translucent glowing spindle that morphs between 1, 2, 3… lobes, banded by strobed light in one accent colour plus white. Very Anyma.
- **Music:** chord complexity → mode number n. Loudness → radius. Kick → a pluck: a transient overtone ripples up the string. Brightness → number of colour bands. **Tempo → strobe locks to rotation, so on the drop the shape freezes in mid-air** (a stroboscopic standstill). The build drifts and goes slightly chaotic between modes, as real spinning strings do.
- **Silence:** a slow, faint n=1 spindle like a glowing seed pod.
- **Calm hook:** the radius breathes.
- **Build:** a fragment shader integrates the string's projected path over the persistence window (~16 time samples per pixel row: x = r(y,t)·cos(ωt+φ)). Additive with bloom. Est. <1 ms.

### 12. Vortex Rings  ·  M/L  ·  ★★★
- **Pitch:** Smoke rings fired on the kick that leapfrog when the drums double up.
- **Looks:** A dark studio with a thin slice of light. Clean white smoke rings drift across, slowly widening, with spiral laminar texture inside.
- **Physics:** rings self-propel. Two coaxial rings **leapfrog**. Strong rings grow a wavy Widnall instability and break into turbulence ([vortex ring](https://en.wikipedia.org/wiki/Vortex_ring)).
- **Music:** kick → fire a ring, with strength setting speed and size. Fire rate is capped (e.g. downbeats only when busy). Fast double kicks → a leapfrogging pair. Loudness → Widnall wobble and breakup. Brightness → thinner, crisper rings. Key → colour of the light slice (warm or cool tonal). Drop → one huge ring plus a crown of small ones.
- **Silence:** an incense stick: a laminar plume rising and tipping into turbulence. Endless and calm.
- **Calm hook:** **one ring per exhale,** like breathing out a smoke ring.
- **Build:** ≤8 ring filaments × 32 nodes evolved with Biot–Savart on the CPU (256² interactions, trivial), with nodes sent as a uniform array. 128² GPU tracers advected by the induced velocity (ping-pong), drawn as soft additive sprites lit by the slice. Est. 1.5–2 ms. Cheaper fallback: raymarched noisy torus density.

### 13. Noctiluca: bioluminescent shore  ·  M  ·  ★★★
- **Pitch:** Night surf that glows blue wherever the music disturbs it.
- **Looks:** A nadir drone view of a night beach. Black water, gentle swell lines breaking, wet sand mirror. Disturbed water flashes cold cyan-blue.
- **Physics:** dinoflagellates flash under shear stress and have a **refractory period**, so places hit repeatedly dim. That gives natural texture ([bioluminescence](https://en.wikipedia.org/wiki/Noctiluca_scintillans)).
- **Music:** kick → a wave breaks, scheduled with a one-bar look-ahead so the crest lands *on* the beat. Onsets and hi-hats → sparkle density (darting fish, raindrops). Loudness → swell height. Minor key → a deeper blue within the ramp. Drop → a big set wave.
- **Silence:** glassy black water with a lone fish trail and star reflections.
- **Calm hook:** the shoreline wash moves in and out with the breath, like a tide.
- **Build:** 256² excitable-medium sim (excitation + refractory in one RG texture), stimulated by |∂h/∂t| of a cheap analytic shoaling-wave heightfield. Procedural dark water normals plus a glow pass. Est. ~1 ms.

### 14. Murmuration  ·  M/L  ·  ★★
- **Pitch:** Starlings at dusk. The kick is a falcon, and dark *agitation waves* ripple through the flock.
- **Looks:** A dusk gradient over a reed-bed silhouette. 10–20k starlings form one living ink-blot shape that folds and stretches.
- **Physics:** a predator triggers dark bands travelling through the flock as birds bank in sequence ([Hemelrijk et al.](https://www.sciencedaily.com/releases/2015/03/150326110956.htm)).
- **Music:** kick → falcon strike → an agitation wave from that point, damping as it travels (which is real). Loudness → compactness and speed. Key → sky gradient and sun height. Tempo → wing-flicker phase. Build → the flock compresses into a dense ball. Drop → a flash expansion into a vast sheet.
- **Silence:** the flock descends and roosts in the reeds, and the sky fades to stars.
- **Calm hook:** the whole flock expands and contracts with the breath.
- **Build:** no neighbour search. Agents follow a smooth time-varying field (curl noise + centroid attractor + a target-shape SDF). The agitation wave is a travelling band that adds bank angle, which changes apparent density (darker). 128² agents on GPU ping-pong, drawn as 2-px oriented dashes. Est. ~1.5 ms. **Risk:** it can read as "generic particles", so the art direction must be ink silhouette only.

### 15. Komorebi: sunlight through leaves  ·  S/M  ·  ★★★
- **Pitch:** Dappled light on a linen wall that sways with the song. The most "Calm" skin on the list.
- **Looks:** A warm linen wall at golden hour with leaf shadows. The bright dapples are soft round **pinhole images of the sun** (real optics), and their blur grows with the depth of the branch casting them.
- **Music:** loudness → wind (canopy sway). Brightness → leaf flutter speed and glints. Kick → a gust crossing left to right. Key and mode → light colour temperature. Chord change → the sun angle shifts slowly, stretching the dapples into ellipses. Branch sway period tuned near one bar. Drop → the sun comes out from behind a cloud (a 2-s exposure ramp, never a flash).
- **Silence:** a still afternoon with faint flutter and dust motes in the light.
- **Calm hook:** the canopy sways with the breath.
- **Build:** **Codex art:** 2–3 top-down canopy alpha layers. Each layer is warped by sway and sampled at a pre-blurred mip proportional to its depth (penumbra). Bright gaps are convolved to discs via the pre-blurred mask, over a linen texture. Est. ~0.7 ms. Variant: **Wind Dunes**: aeolian ripples migrating under low raking sun, with saltation spray off the crests on the drop.

**Also available now, not counted:** **Faraday Water** (cymatica instrument 2: ring-light standing waves) is already built in `visuals/cymatica/src/water.js`. Port it as Cymatics skin #2.

---

## 3. Ranking: build these 6 first

Score = Beauty × Novelty × Feasibility (each 1–5).

| # | Skin | Beauty | Novelty | Feasibility | Score | Why first |
|---|---|---|---|---|---|---|
| 1 | **Copper Rain** | 5 | 5 | 4 | 100 | Hero image for the Kinetic family; screenshots sell it; uses Cymatics' mode table |
| 2 | **Magnet Bloom** | 5 | 4 | 5 | 100 | One shader pass; the threshold mapping is the "earned" drop; Anyma black |
| 3 | **Komorebi** | 5 | 5 | 4 | 100 | Best brand fit (cozy, Calm); great idle; needs Codex leaf art |
| 4 | **Harmonograph** | 4 | 5 | 5 | 100 | Cheapest; the only skin that truly *shows* consonance; paper and ink are cozy |
| 5 | **Iron Filings** | 4 | 5 | 5 | 100 | Fork of the Cymatics engine, about 2 days; second Cymatics skin besides Faraday |
| 6 | **Vortex Rings** | 5 | 5 | 3 | 75 | Breath-ring calm hook; leapfrogging is a delight moment |
| next | Pendulum Wave (75), Pilot Wave (60), Suminagashi (80), Ripple Tank (60), Light String (75) | | | | | Pendulum Wave and Ripple Tank jump up once chroma/tempo (§4) lands |

Suggested order: **Faraday port → Iron Filings → Magnet Bloom → Harmonograph → Copper Rain → Komorebi → Vortex Rings.** The first three need no new signals. Harmonograph, Pendulum and Ripple Tank want real chroma and tempo, so do §4 in parallel.

---

## 4. Signal upgrade (prerequisite for "harmony" skins)

Today `host/BeatSync.swift` produces a 1024-pt FFT (46.9 Hz bins) → `{l,b,m,h,k}`. Cymatics fakes harmony with `hash(title) % 12` plus a circle-of-fifths walk. Proposal, all in vDSP for well under 1% CPU:

| Signal | How | Used by |
|---|---|---|
| `chroma[12]`, `root` | 8192-pt FFT every ~4th hop (5.9 Hz bins), log-map 65 Hz–2 kHz → 12 pitch classes. **Port `cymatica/src/audio.js`**, which already does chroma, a debounced root and centroid | Harmonograph, Ripple Tank, Pendulum, Iron Filings, Copper Rain, Cymatics (real, replacing the hash) |
| `key`, `mode` | Krumhansl–Schmuckler profile correlation over ~8 s, smoothed | palettes / light temperature everywhere |
| `onset` | Spectral flux (all bands), separate from the bass kick | Suminagashi, Noctiluca sparkles, Wooden Mirror |
| `bpm`, `beatPhase`, `barPhase` | Autocorrelation of the onset envelope (80–160 bpm), phase-locked to kicks | Pendulum revival, Light String freeze, phrase-gated form changes |
| `tension`, `drop` event | Short (4 s) vs long (30 s) energy ratio and slope; a drop is a sharp energy jump after a sustained rise | the threshold moments in every skin |

Add a shared **JS director** in `lw.js` that turns these into semantic signals (`LW.music.{chroma,key,mode,bpm,barPhase,tension}` plus events `'chord'`, `'phrase'`, `'drop'`), with today's hash and circle-of-fifths walk as the fallback when beat sync is off. Every skin then only maps semantics to physics, so a new skin is mostly the render.

---

## 5. Performance notes (M1 Air, ~3 ms budget)

- Fixed-resolution sims (≤256² fields, ≤288² grains) independent of screen size. Render res capped as in Cymatics. Half-res for volumetrics (Aurora, Vortex) with bilinear upsample before bloom.
- Upload the artwork once per track. Never upload a 2D canvas per frame (WebKit stalls). This is the existing wallpap lesson.
- Prefer analytic and closed-form physics over solvers: the marbling maps, pendulums, Bessel-ring memory, cosine-mode surfaces. That's why most skins land at ≤1 ms.
- Run sims at the governor fps (`LW.fps`). When `LW.focused` is false, stop as the other scenes do. Sims with memory (Suminagashi, Harmonograph) just resume.

---

## 6. How to present it in the app

**Options**

| | Structure | Pros | Cons |
|---|---|---|---|
| a | One "Visualizers" scene with ~16 skins | One switch in the menu | Free users get one skin out of 16, which reads stingy. Huge single file. Hard to market. |
| b | Each skin is its own scene | Each one is "free" under the rule | Clutters the scene grid with 16 near-siblings; dilutes the cozy scenes |
| **c ⭐** | **4 family scenes, each with skins** (one shared renderer and director per family) | Free users get 4 great hero skins, a generous and clear story. Pro upsell is "unlock 12 more". Families share code (grain engine, water shading, instanced kinetic rig). | One extra level in the menu (a skin picker in the panel) |

**Recommended families** (hero/free skin first):

| Scene | Skins | Shared engine |
|---|---|---|
| **Cymatics** | **Sand** (free), Faraday Water, Iron Filings, Ripple Tank, Pilot Wave | grain sim and water shading |
| **Kinetic** | **Copper Rain** (free), Wooden Mirror, Pendulum Wave (+Metronome Sync), Light String, Harmonograph (+Guilloché) | instanced rig with motor limits |
| **Fluids** | **Magnet Bloom** (free), Suminagashi, Vortex Rings, Noctiluca | heightfield/dye pass and studio env |
| **Skies** | **Komorebi** (free), Aurora Substorm, Murmuration, Wind Dunes | backdrop, time of day, weather tie-in |

**Pro extras that make the bundle feel bigger than the count:**
- **"Change skin per track":** each new song picks a skin within the family, or across families, transitioning on the paper-pull / form-finding moment.
- Variants (Guilloché, Flip-Disc, Mercury) cost little more than palette or material swaps.
- Album-artwork accent colour on every skin.

The free hero skins should be the best-looking ones. The free tier is the marketing.

---

## Sources (beyond those linked inline)
- Wallpaper Engine audio-responsive collection: <https://steamcommunity.com/sharedfiles/filedetails/?id=3403287996>
- MEL on the iTunes visualizer: <https://melmagazine.com/en-us/story/itunes-visualizer-stoners>
- Kinetic Rain, Wikipedia: <https://en.wikipedia.org/wiki/Kinetic_Rain>
- Rozin penguins: <https://www.bitforms.art/artwork/penguins-mirror>
- Ferrofluid normal-field instability: <https://arxiv.org/pdf/1101.3742>
- Walking droplets review (Bush, Annu. Rev. 2015): <https://math.mit.edu/~bush/wordpress/wp-content/uploads/2015/01/Bush-AnnRev2015.pdf>
- Mathematical Marbling paper PDF: <http://www.cad.zju.edu.cn/home/jin/cga2012/mmarbling.pdf>
- Starling agitation-wave damping: <https://research.rug.nl/en/publications/damping-of-waves-of-agitation-in-starling-flocks/>
- Pendulum wave: <https://en.wikipedia.org/wiki/Pendulum_wave>
- Ryoji Ikeda test pattern: <https://forma.org.uk/projects/test-pattern>
- teamLab Universe of Water Particles: <https://www.teamlab.art/w/uowp/>
- Universal Everything: <https://www.creativeapplications.net/people/universal-everything/>
- Memo Akten & Quayola, Forms: <https://motionographer.com/2012/03/08/quayola-and-memo-akten-for-the-london-2012-cultural-olympiad/>
- Synesthesia: <https://synesthesia.live/>; Plane9: <https://www.plane9.com/>
