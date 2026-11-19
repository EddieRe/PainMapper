# PainMapper: Milestone 1, reliable location selection

> Continued in [milestone-2-learner-workflow.md](milestone-2-learner-workflow.md). The selection behavior described here is unchanged. The sidebar described below has been replaced by the Milestone 2 case panel.

**Date:** 17 November 2026
**Goal:** Make sure the location a learner points at is the location the app selects, and make that visible, before any work on case details or diagnosis.
**Unchanged:** the medical data (`public/data/*.csv`), the diagnosis code (`src/data/csvLoader.js`), and the spot positions (`src/data/nodePlacements.js`). All three are byte-identical to the originals, and the diagnosis list for all 98 locations still matches the "before" table in `baseline-report.md` exactly.

---

## What changed for the user

| Before | Now |
|---|---|
| Clicking the front of the body could select a spot on the **back**. The belly button selected "Midline Lower Quadrant – Lower Back". | **The visible skin decides.** The belly button selects "Epigastric Region – Abdomen". Back locations are selected from behind. |
| Ring finger and All Toes MTP Joint could not be selected. Patellar Facet was effectively hidden behind Patella. | **Every location can be reached.** Patellar Facet now comes up directly on the kneecap. Overlapping neighbours appear as **"Nearby locations"** buttons in the sidebar. |
| No indication of a spot's name before clicking. | **A hover label** shows the location and area, e.g. "Patellar Facet / Left knee". |
| The chosen spot was marked only in debug mode. | **The selected spot stays highlighted in red** on the body. |
| The sidebar showed "Patella / Knee", with no side. | **The side is shown:** "Patella / Left knee" (patient's left, the clinical convention). |
| Dragging on the body to rotate could select whatever was under the pointer when you let go. | **Drags are ignored as clicks.** Rotating never changes the selection. |

## How it works (short version)

1. An invisible copy of the patient's skin, frozen in the displayed pose, is built once when the model loads (`src/interaction/pickSurface.js`). Hit-testing that copy is about 100× faster than testing the posed model directly.
2. On each pointer move or click, the app finds the point where the pointer meets the skin, then chooses the location sphere closest to that point (`src/interaction/zonePicking.js`). A sphere may be chosen slightly beyond its edge, because many are placed a little inside the body.
3. Other locations close to the same point are offered as "Nearby locations".

The allowances (`PICK_RADIUS 1.75`, `PICK_GAP 0.035`) were tuned with the simulation described below. Larger values started picking locations on the wrong limb.

## How it was checked

**Clicked in the browser** (built-in browser, 1280×800 and phone size):

| Action | Result |
|---|---|
| Hover left kneecap | Label "Patellar Facet / Left knee"; pointer cursor |
| Click it (3 repeats after hovering) | 3/3 selected "Patellar Facet / Left knee". Red highlight on the knee. Nearby: Patella, Quadriceps Tendon, Distal Pole of Patella, Patellar Tendon |
| Click the "Patella" button | Switched to "Patella / Left knee" with Patella's list |
| Belly button from the front | "Epigastric Region / Abdomen" (was Lower Back) |
| Patient's right kneecap | "Patellar Facet / Right knee" |
| Left groin | "Groin / Left hip"; same list as before |
| Drag on the body to rotate 180° | View rotated; selection unchanged |
| Lower back, viewed from behind | Label and selection "Midline Lower Quadrant / Lower back"; correct list; red highlight |
| Click the head (no location there) | Selection cleared (same as before) |
| Click the empty background | Selection cleared |
| Phone size (375 px wide) | Selection works; buttons wrap; no sideways overflow |

A bug found during this testing and fixed: the hover label's invisible wrapper blocked the click right after hovering. It is now click-through.

**Simulated** with `tools/selection-check.js` (77,850 simulated clicks from 90 angles at every location, using the app's real model and code):
- Locations that can never be selected: **none**
- Wrong-side selections (pointer on the patient's left, right-side location chosen, or the reverse): **0**
- Belly button from the front: Epigastric Region (Abdomen)
- Reachable only via "Nearby locations": **All Toes MTP Joint** (it sits inside the larger Dorsal Forefoot spot)
- Selectable but tight: **Ring finger**

**Also:** lint passes, and the production build succeeds.

**Not tested:** a real touchscreen device, browsers other than the built-in one (Chromium), or keyboard-only use.

## Files

- **New:**
  - `src/interaction/zonePicking.js`: decides the location under the pointer.
  - `src/interaction/pickSurface.js`: builds the invisible skin copy.
  - `src/data/zones.js`: builds the list of spots and the "Left knee" wording.
  - `src/components/BodyInteraction.jsx`: pointer handling and the hover label.
  - `tools/selection-check.js`: the simulation; instructions are inside the file.
- **Changed:** `src/App.jsx`, `src/App.css`, `src/components/Model.jsx`, `Zone.jsx`, `AnatomicalZones.jsx`, and `Sidebar.jsx`.
- **Backup of the originals:** `.backup/original-source-2026-11-17.zip`.

## Open points

**For the designer (look and feel):**
1. The label "Nearby locations" and the pill-shaped buttons: keep, rename, or restyle?
2. Clicking the body where there is no location (e.g. the head) clears the selection, as before. Should it keep the current selection instead?
3. "Left/Right" is from the patient's perspective, the clinical norm. Should the app say so on screen for non-clinical users?
4. On phones the patient is small and the sidebar sits below the 3D view.

**For Eddie (anatomy and placement):**
1. **All Toes MTP Joint** sits inside **Dorsal Forefoot**, so it's only offered as a nearby option. **Ring finger** is hard to hit. Should those spots be repositioned, or should the hand and foot get a close-up view later?
2. The belly button maps to **Epigastric Region**, the nearest available location. Anatomically, the epigastric region is above the navel. Is that acceptable, or is a periumbilical location wanted?
3. On the kneecap, **Patellar Facet** now comes up first, with Patella beside it as a nearby option. Does that layout read correctly to a clinician?

## How to undo

The original files are in `.backup/original-source-2026-11-17.zip`:

1. Extract it over the project. This restores `src/` and the config files exactly as downloaded.
2. The zip stores the two CSVs under `data/`; they belong in `public/data/`. They were not changed by this milestone.
3. Delete the new files listed above.
