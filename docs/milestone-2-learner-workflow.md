# PainMapper: Milestone 2, learner workflow and redesign

**Dates:** 18 November 2026 (builds on Milestone 1, 17 November)
**Status:** Local only. Nothing has been published or pushed.
**Unchanged:**
- the medical data (`public/data/*.csv`)
- the spot positions (`src/data/nodePlacements.js`)
- the 3D model
- the location-to-condition lookup (`getDifferentialDiagnoses`)

For all 98 locations, the app still links exactly the same condition records as the baseline. `tools/data-checks.mjs` checks this.

---

## 1. What changed and how to use it

The screen has three areas:
- A header with a **New case** button.
- A large **3D viewer** on the left.
- A **case panel** on the right with three numbered steps.

A summary bar at the top of the panel always shows the chosen location, the patient side, and the entered details. On narrow screens (under about 880 px) the viewer sits above the panel, and the page scrolls.

### 3D viewer
- **Front / Back / Reset view** buttons sit at the top left, and the current view ("Front view", "Back view", "Patient's left side") is shown at the top right.
- **Edge labels** say which side is the patient's right and left. They swap automatically when you look from behind or from the side.
- **Using the viewer:** drag to rotate, scroll or pinch to zoom, and click the body to choose a location. A hint at the bottom says this.
- **Milestone 1 behavior is kept:**
  - The visible skin decides what is selected.
  - Dragging never selects anything.
  - A hover label names the spot under the cursor.
  - The selected spot stays red.
  - Overlapping spots appear as "Nearby locations".
- **Loading screen:** shown while the 54 MB model loads.
- **Error screen:** shown if the model fails, with a Try again button. The rest of the app keeps working.

### Step 1: Where does it hurt?
- **Click the body**, or use **Find a location**:
  - Type to filter, e.g. "ring", "mtp", "heel".
  - Use the arrow keys to move and Enter to choose.
  - With the box empty, open the list to browse every location grouped head-to-toe.
  - Each entry shows how many conditions are linked to it.
  - The whole list works by keyboard alone.
- **Choosing from the list turns the patient so the spot is visible**, e.g. to the back for Popliteal Fossa. It also zooms in for small regions such as fingers, toes, hand, foot, wrist, and ankle.
- The location card shows the **patient side** badge and a **Patient's right / Patient's left** switch. The switch also flips mirror-named locations, e.g. Left Flank ↔ Right Flank.
- **Clear location** removes the selection.

### Step 2: Case details (all optional)
- **Age:** Not specified, Under 1 year, then 1–18 years.
- **Onset:** Not specified, After an injury, or No injury.
- **Swelling:** Not specified, None, Mild, Moderate, or Severe. Labeled **"For comparison only"**.
- **Clear details** resets them.

The details stay in place when the location changes.

### Step 3: Associated conditions
- Shows **every** condition linked to the location, with a count, e.g. "18 conditions are linked to Groin (right hip)".
- A **"How your case details were used"** box states, for each detail, whether it was compared.
- With no comparable details, the panel shows one alphabetical list.
- With age and/or onset entered, it shows up to three groups, each alphabetical:
  - **Consistent with the details entered:** at least one detail matches and none differ.
  - **Couldn't be compared:** the dataset has no value for the entered details.
  - **Differs from a detail entered:** collapsed by default with "Show N", but still listed.
- Each condition shows its listed age range and onset, plus badges such as "Age fits" or "Onset differs".
- Opening a condition shows:
  - Each comparison in a full sentence.
  - The recorded swelling next to the case's swelling (not compared).
  - The other locations it is linked to.
  - Its **source row** in `pathologies.csv`, for Eddie's review.

### Elsewhere
- **New case** clears the location and details and resets the view.
- **Developer options** (panel footer, collapsed) holds the "show location spheres" switch that used to sit in the main panel.

## 2. What case information affects results

| Detail | Compared with | Rule | Effect |
|---|---|---|---|
| Age | `Age Minimum`, `Age Maximum` | Within the range, **inclusive** (age 15 fits 8–15) | Groups conditions |
| Onset | `Traumatic`, `Atraumatic` | "After an injury" fits if Traumatic is TRUE. "No injury" fits if Atraumatic is TRUE. Both TRUE fits either. Both FALSE is "not recorded". | Groups conditions |
| Swelling | `Swelling` (shown only) | Never compared | **None.** It is displayed side by side only. |

- **Unknown stays unknown.** A detail left "Not specified" is never compared and never counts against a condition.
- A blank dataset cell is "not recorded", never 0. One row was affected: Slipping Rib Syndrome (axillary) has a blank minimum age, which the original code read as 0. This was fixed in `csvLoader.js`.
- **No ranking.** Order is alphabetical within each group. There are no probabilities or scores, and the screen says the list is not ranked by likelihood.
- **Not used:** the spreadsheet's unnamed notes column. Its notes read as editorial notes to Eddie (e.g. "…remove?"), so it is not shown to learners.
- **No new medical content was added.** Every word about a condition comes from the dataset's own columns.

## 3. For Eddie: medical-content decisions to review

These are new interpretations introduced in this milestone. They should be confirmed before being treated as approved teaching behavior.

1. **Age ranges as inclusive limits.** A case outside a listed range is grouped as "Differs". Are the ranges absolute limits or typical ages?
2. **Onset flags taken literally.** Some results this produces:
   - Femoral Neck Fracture is flagged atraumatic-only, so it "differs" for an injury case.
   - Calcaneal Fracture and the distal tibia and fibula fractures are flagged traumatic-only, yet their notes say "Can be stress or acute-trauma related". A no-injury case therefore marks them as differing.

   Should those flags be updated (e.g. to both TRUE)?
3. **Swelling column:** what does it mean, and how, if at all, should it compare with a case?
4. **Ordering:** alphabetical is a neutral placeholder. Should "can't-miss" conditions (septic arthritis, osteomyelitis, malignancy, SCFE) be flagged regardless of the details?
5. **The "Differs" group is collapsed by default.** Should learners see it open?
6. **Age choices stop at 18,** matching the dataset. Should ages 19–21 be supported?
7. **Carried forward** from Milestone 1 and the baseline (still open):
   - **Overlapping spots:** All Toes MTP Joint sits inside Dorsal Forefoot, and Ring finger is a small target. Both are now directly selectable from the location list.
   - **Belly button** maps to Epigastric Region; is a periumbilical location wanted?
   - **Kneecap layout:** Patellar Facet comes up before Patella on the kneecap.
   - **Empty locations:** 7 locations have no conditions.
   - **Rows to confirm**, and the **spelling fixes** listed in `baseline-report.md` §6.

## 4. Limitations

- **The model:** it is an adult man and 54 MB. There is no byte-level progress, only a loading message.
- **Keyboard:** the 3D view itself can't be operated by keyboard. The location list is the keyboard path.
- **Auto-turn:** for a few finger bands, the camera turn after a list pick uses a view from below.
- **Developer options** sit in the footer, collapsed. They could be hidden entirely before publishing.

## 5. How it was checked (18 November)

**Automated:**
- `node tools/data-checks.mjs`: **507 checks passed.** These cover all 98 locations, which link the same records and keep the same original first-three lookup, plus the comparison rules on real rows: inclusive bounds, the blank age, both/neither onset flags, swelling never affecting groups, and alphabetical order.
- `tools/selection-check.js`, run on the final code: 77,850 simulated clicks, belly button → Epigastric Region, **no unselectable locations, 0 wrong-side selections**. All Toes MTP Joint is reachable on the body only via "Nearby locations", and directly via the list. These results are identical to Milestone 1.
- Lint passes, and the production build succeeds. The dev-only failure switches are removed from the production bundle.

**Clicked through in the built-in browser** (Chromium-based; desktop at 1366×820 and about 1000×845, phone emulation at 375×812):

| Journey | Result |
|---|---|
| Click left kneecap | "Patellar Facet · Left knee"; side switch, 4 nearby, all 8 conditions |
| Age 13 + injury, then change location by keyboard search ("lateral mall", Enter) | Details kept; 3 consistent / 5 differ; focus moved to the location name |
| Side switch to patient's left | "Left ankle", same results |
| Search "ring" → Ring finger | Selected, camera zoomed to the left hand; "No conditions are mapped" stated plainly |
| Search "popliteal" while facing front | Camera turned to the back on its own; edge labels swapped |
| Back view: click left shoulder blade, then lower back | "Scapular Region · Left shoulder"; "Midline Lower Quadrant · Lower back" |
| No details, then swelling only | One alphabetical list of 10; swelling marked "comparison only", no grouping |
| Groin, age 4, no injury | 7 consistent incl. Transient Synovitis and Septic Arthritis; 11 differ, each with reason; source row shown |
| New case | Everything cleared, front view, panel back at top |
| Phone size | Stacked layout, touch hint, sticky summary, no sideways scroll |
| Simulated model failure | Error screen with Try again; location list and results still work |
| Simulated data failure | Error at the top of the panel with Try again; search disabled with a reason |

**Bugs found during testing and fixed:**
1. Hidden screen-reader text made the whole page scroll.
2. Spots picked from the list on the far side of the body didn't turn the camera.
3. The data-error message was hidden at the bottom of the panel.
4. Typing "patella" listed Patellar Tendon before Patella.
5. New case didn't scroll the panel back to the top.

**Not checked:**
- Real phones or tablets (touch was only emulated).
- Safari and Firefox.
- A real screen reader (only the structure and labels were inspected).
- Loading over a slow connection.

## 6. Files

- **New:**
  - `src/data/caseMatching.js`: the comparison rules.
  - `src/interaction/viewDirection.js`: camera turning.
  - `src/modelAsset.js`, `src/devSimulation.js`.
  - Components: `AppHeader`, `ViewerPanel`, `LocationStep`, `LocationPicker`, `CaseDetailsStep`, `ConditionsStep`, `CaseSummaryBar`, `PanelFooter`, `StepHeader`, `icons`.
  - `tools/data-checks.mjs`.
  - This file and `docs/README.md`.
- **Changed:**
  - `src/App.jsx`, `src/App.css`, `src/index.css`.
  - `CameraControls`, `Model`, `BodyInteraction`, and `Zone` (the selected red now matches the panel).
  - `src/data/zones.js`: region order, side helpers, location list.
  - `src/data/csvLoader.js`: the blank-cell fix only.
  - `src/interaction/zonePicking.js`: reorganized, with identical behavior per the selection check.
- **Removed:** `src/components/Sidebar.jsx`, replaced by the step components.

**Dev-only switches** for the error screens, ignored in production builds:
- `http://localhost:5173/PainMapper/?simulate=model-error`
- `http://localhost:5173/PainMapper/?simulate=data-error`

## 7. How to return to the Milestone 1 checkpoint

`.backup/milestone-1-checkpoint-2026-11-18.zip` holds the working Milestone 1 version, with paths preserved and 32 files verified byte-for-byte when saved.

1. Stop the dev server (Ctrl+C in its window).
2. Extract the zip over the `PainMapper-main` folder, replacing files.
3. Delete the files listed as **New** in section 6, since the checkpoint doesn't contain them.
4. Run `npm run dev` again.

The original download is still in `.backup/original-source-2026-11-17.zip`.
