#!/bin/zsh
# Airport scene art — Codex built-in image generation.
#   zsh gen.sh <job> [<job> ...]     (jobs: day dusk night overcast a320 b787 atr72 e175 ground)
# Raw outputs land in raw/ (plates) and sheets/ (sprite sheets). Existing files are skipped; delete to regenerate.
cd "$(dirname "$0")"
D=$PWD

run() { # outpath, prompt, [refs]
  local out=$1 prompt=$2 refs=$3 name=${1:t:r}
  [[ -f "$out" ]] && { echo "skip $name"; return; }
  local tail="

Use your built-in image generation tool to make exactly this one image (largest landscape size available, ideally 16:10 / 1536x1024 or larger). Save the final PNG at exactly this absolute path: $out . Do nothing else: do not write any code or other files."
  if [[ -n "$refs" ]]; then
    echo "$prompt$tail" | codex exec -s workspace-write --skip-git-repo-check -i "$refs" - > "$D/logs/$name.txt" 2>&1
  else
    echo "$prompt$tail" | codex exec -s workspace-write --skip-git-repo-check - > "$D/logs/$name.txt" 2>&1
  fi
  [[ -f "$out" ]] && echo "ok $name" || echo "FAIL $name"
}

PHOTO="Photorealistic, shot like a real high-end aviation photograph / cinematic film still: natural colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, no illustration, no painterly look, no CGI-toy look."

PLATE_GEOM="Wide landscape photograph taken from inside the glass cab at the top of an airport control tower, about 50 metres up, looking out over the airfield (the tower glass and frames are NOT visible — clean view). Camera tilted gently down. Composition, exactly:
- Top ~40% of the frame: open sky only, a perfectly plain smooth clear gradient (deeper blue at the top fading to pale hazy blue at the horizon). ABSOLUTELY NO clouds, no sun, no moon, no birds, no contrails.
- Horizon line at about 40% from the top, flat distant countryside / low tree line and faint far hills, very plain and even so it can be extended sideways.
- One long main runway crossing the frame from left to right in the middle distance (its centreline around 55-62% from the top), receding slightly toward the LEFT (left end a bit further away and narrower, right end nearer and wider). Grey asphalt with white runway markings: dashed white centreline, white edge lines, white threshold piano-key stripes and white touchdown-zone bars near the LEFT end (the landing end), aiming-point blocks. The runway extends off the left edge and runs out toward the right side.
- A parallel taxiway between the runway and the camera (closer, lower in frame), darker asphalt with a yellow centreline, connected to the runway by two or three angled rapid-exit taxiways and one perpendicular link, all with yellow centre lines.
- Foreground LEFT and lower-left: a concrete apron with 4 empty remote parking stands (yellow lead-in lines and stop bars, painted stand boxes), two jet bridges / airbridges retracted and empty, a few apron floodlight masts, and the edge of a modern glass-and-steel terminal building at the bottom-left corner.
- Foreground and right side: wide flat mown green grass between the paved areas.
- RIGHT ~30% of the frame: calm and empty — only flat green grass, the far end of the runway/taxiway thinning out, distant flat fields and the plain sky. No buildings, no parked aircraft, no masts, no bright objects there.
- Completely EMPTY airfield: NO aircraft, NO vehicles, NO people anywhere. No text, no logos, no letters, no numbers, no signage that can be read (runway designation numbers omitted)."

day()      { run "$D/raw/plate-day.png" "$PLATE_GEOM
Lighting: clear midday, high sun, crisp soft shadows, clean blue sky gradient. $PHOTO"; }
dusk()     { run "$D/raw/plate-dusk.png" "Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting and colour: golden hour, warm low sun from the LEFT (sun itself not visible in frame), long soft shadows falling toward the right, warm amber light raking across the grass and tarmac, sky a plain clean gradient from soft dusky blue at the top to warm peach/amber near the horizon. Still no clouds, no sun disc, no moon, no aircraft, no vehicles, no people, no text. $PHOTO" "$D/raw/plate-day.png"; }
night()    { run "$D/raw/plate-night.png" "Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting: clear night. Sky a plain deep navy gradient to slightly lighter blue-grey near the horizon, NO stars, NO moon, NO clouds. The field is dark. The terminal windows glow softly warm, the apron floodlight masts cast soft sodium/white pools of light on the apron and parking stands only. The runway and taxiways stay DARK and unlit: NO runway edge lights, NO centreline lights, NO approach lights, NO taxiway lights (those are added later). Faint distant town glow on the horizon at the far left only. Right side of frame stays dark and calm. No aircraft, no vehicles, no people, no text. $PHOTO Real long-exposure-free night photograph look, low noise." "$D/raw/plate-day.png"; }
overcast() { run "$D/raw/plate-overcast.png" "Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting and weather: flat overcast grey daylight just after rain, no shadows, the sky a plain smooth light-grey gradient (no distinct cloud shapes, no sun), slightly reduced contrast and a little more distance haze, the asphalt runway, taxiways and apron are WET with a soft sheen and faint reflections of the sky, grass a deeper damp green. No aircraft, no vehicles, no people, no text. $PHOTO" "$D/raw/plate-day.png"; }

SPR_COMMON="Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale."
AC_LAYOUT="Arrange 4 views of the SAME aircraft in a 2x2 grid:
 top-left: side profile, nose pointing LEFT, landing gear down (on the ground);
 top-right: side profile, nose pointing LEFT, landing gear retracted (in flight), slight nose-up attitude of about 5 degrees;
 bottom-left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, left side and front of the engines), gear down;
 bottom-right: three-quarter rear view, tail toward the viewer, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side), gear down."
LIVERY="Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing."

a320()  { run "$D/sheets/sheet-a320.png"  "$SPR_COMMON
Subject: a generic modern narrow-body twin-engine airliner (Airbus A320 type: single aisle, two underwing turbofans, low wing, conventional tail, small winglets). $LIVERY
$AC_LAYOUT"; }
b787()  { run "$D/sheets/sheet-b787.png"  "$SPR_COMMON
Subject: a generic large wide-body twin-engine airliner (Boeing 787 type: long wide fuselage, very large underwing turbofans with serrated nacelle edges, long flexible raked wings with no winglets, smooth tapered nose). $LIVERY
$AC_LAYOUT"; }
atr72() { run "$D/sheets/sheet-atr72.png" "$SPR_COMMON
Subject: a generic regional twin turboprop airliner (ATR 72 type: high-mounted straight wing, two turboprop engines with six-blade propellers, T-tail, main gear in fuselage-side fairings). Propellers shown as a soft motion-blurred disc. $LIVERY
$AC_LAYOUT"; }
e175()  { run "$D/sheets/sheet-e175.png"  "$SPR_COMMON
Subject: a generic regional jet (Embraer E175 type: slim fuselage, low wing with winglets, two underwing turbofans, conventional tail, small and compact). $LIVERY
$AC_LAYOUT"; }
ground(){ run "$D/sheets/sheet-ground.png" "$SPR_COMMON
Subjects: four airport ground-support vehicles, all in pure SIDE VIEW facing LEFT, seen from slightly above, all at the same real-world scale, arranged in a 2x2 grid:
 top-left: an aircraft pushback tug (low, wide, heavy yellow tractor with a small cab);
 top-right: a baggage tractor towing three covered baggage carts in a straight line (tractor at the left end, the whole train facing left);
 bottom-left: an airport fuel / refuelling tanker truck (white and grey);
 bottom-right: a yellow-and-black chequered 'follow-me' car (a compact car or pickup with a light bar on the roof, no writing).
All vehicles generic, no logos, no text."; }


# Ground-attitude three-quarter views (wings level, all wheels on the tarmac) — the first sheets' q-views came out
# banked/in-flight, which reads wrong for taxiing/parked aircraft. Uses the first sheet as design reference.
GROUND_LAYOUT="Draw the SAME aircraft as in the attached reference sheet (identical design, proportions and paint), but this time standing ON THE GROUND: wings perfectly level (no bank, no pitch), all landing-gear wheels down and level as if resting on flat tarmac (but draw no tarmac). Two views side by side, left and right halves of the image:
 left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, the left side of the fuselage and the fronts of the engines), seen from about 25 degrees above;
 right: three-quarter rear view, tail toward the viewer's lower-right, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side of the fuselage), seen from about 25 degrees above."
qg() { local t=$1; run "$D/sheets/sheet-$t-ground.png" "$SPR_COMMON
$GROUND_LAYOUT $LIVERY" "$D/sheets/sheet-$t.png"; }
a320g()  { qg a320; }
b787g()  { qg b787; }
atr72g() { qg atr72; }
e175g()  { qg e175; }
for j in "$@"; do $j; done
