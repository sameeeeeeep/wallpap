# Agents: start here
Read `docs/HANDOFF-codex.md` first — it explains the project, how to run/test, the rules, and the prioritized list of
pending work (P0 → P2). The live checklist is `docs/backlog.md`; update it as you finish items, and log scene changes
(with any image prompts) in `docs/scene-polish.md`. Don't push, release, or post anything unless the owner says so.

## Making a new scene
Design first (`docs/scene-design.md`: references, style, a cast of animated actors with variety, clean mask edges), then use the one-command pipeline — `python3 tools/plate-scene/new.py <id> "<description>"` (see
`tools/plate-scene/QUICKSTART.md`). Same playbook as the Claude skill at `~/.claude/skills/new-scene/SKILL.md`: never
hand-code a scene; improve `addons/_template` + presets so every scene benefits; render the wkshot matrix and check
night quality, mirrored/ultrawide duplication, natural clouds, grounded life and exposed-only weather before done.

**Hard rule:** everything that moves is animated from a sprite sheet with frames — never a still image moved along a path (docs/polish-brief.md §12).
