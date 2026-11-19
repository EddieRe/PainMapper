# PainMapper project notes

Local working copy of Eddie Re's PainMapper (https://github.com/EddieRe/PainMapper). Milestones 1–4 were built locally and proposed to Eddie as one pull request on 19 November 2026 (branch `milestone-4-anatomy-workspace`); nothing is merged or deployed unless Eddie does so. **Eddie reviews all clinical content and diagnostic behavior.** The designer directs appearance and interaction.

## Status (18 November 2026)

| Milestone | What | Notes |
|---|---|---|
| Baseline | How the downloaded app behaved, and questions for Eddie | [baseline-report.md](baseline-report.md) |
| 1 | Reliable location selection on the 3D body | [milestone-1-selection.md](milestone-1-selection.md) |
| 2 | Learner workflow, case details, all conditions, redesign | [milestone-2-learner-workflow.md](milestone-2-learner-workflow.md) |
| 3 | Finished experience: one panel, polished 3D viewer, responsive layouts, loading/error/empty states, keyboard and reduced-motion support, screenshots | [milestone-3-finished-experience.md](milestone-3-finished-experience.md) |
| 4 | Anatomy workspace (Astra boards): viewer plus one movable phone panel, on-skin selection, plain-language names and search, one editor per detail, camera framing around panels and the keyboard, board comparisons | [milestone-4-anatomy-workspace.md](milestone-4-anatomy-workspace.md) |
| 4, addition | "Skin: Gray \| Original" switch in the 3D view and the ••• menu, with fast, non-freezing loading of the original skin (19 November 2026) | [milestone-4-original-skin.md](milestone-4-original-skin.md) |

**Next candidates:**
- Eddie's review: the plain-language names and region words, the placement questions, and "Differs" starting open (Milestone 4 §6), plus the open questions from Milestone 2 §3.
- Check on real phones and tablets, in Safari and Firefox, and with a screen reader (Milestone 4 §5). Every check so far used Microsoft Edge on this PC with emulated phone sizes, touch and keyboard.
- If Eddie agrees to change the model file: shrink its textures (about 54 MB to roughly 15–20 MB) for faster phone loading.

## Running it locally

1. Open the `PainMapper-main` folder in File Explorer.
2. Type `cmd` in the address bar and press Enter.
3. Run `npm run dev`.
4. Open http://localhost:5173/PainMapper/.

Node.js 26 LTS is installed on this PC.

## Checks to run after changes

- `node tools/data-checks.mjs`: location matching unchanged plus the case-comparison rules (should report 0 failed).
- `node tools/search-checks.mjs`: finding locations by exact name, plain words, region and side (should report 0 failed).
- `node tools/framing-checks.mjs`: the camera framing arithmetic (should report 0 failed).
- `tools/selection-check.js` and `tools/pick-equivalence-check.js`: 3D selection; run them from the browser console (instructions are in each file).
- `npm run lint` and `npm run build`.
- Error screens, development only: add `?simulate=model-error` or `?simulate=data-error` to the local address.

## Backups (`.backup/`)

- `original-source-2026-11-17.zip`: the app as downloaded (source only; the 3D model was never changed).
- `milestone-1-checkpoint-2026-11-18.zip`: the working Milestone 1 version.
- `milestone-2-checkpoint-2026-11-18.zip`: the working Milestone 2 version, with a file list inside. Restore steps are in Milestone 3 §7.
- `milestone-3-checkpoint-2026-11-18.zip`: the working Milestone 3 version, with a file list and checksums inside. Restore steps are in Milestone 4 §8.
