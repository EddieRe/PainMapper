# PainMapper: Milestone 4, the anatomy workspace

**Date:** 18 November 2026 (builds on Milestone 3)
**Status:** Local only. Nothing has been published or pushed.
**Unchanged, byte for byte (checked against the Milestone 3 checkpoint):**
- The medical data (`public/data/locations.csv`, `public/data/pathologies.csv`).
- The location positions (`src/data/nodePlacements.js`).
- The comparison rules (`src/data/caseMatching.js`) and the CSV loader (`src/data/csvLoader.js`).
- The picking code (`src/interaction/`).
- The checks `tools/data-checks.mjs` and `tools/selection-check.js`.
- The 3D model file (53,973,492 bytes, still dated 14 July 2026), with its pose, scale and position.

Which conditions appear for a location, and how they are grouped, is exactly as before. Patella, 13 years, after injury still gives the same five records: 3 consistent (Contusion, Knee Contusion, Patella Fracture) and 2 that differ (Osteochondritis Dissecans, Reactive Arthritis). Contusion and Knee Contusion stay separate.

The three final Astra boards were the visual reference. Colours, sizes and type were measured from them. Section 7 shows each board beside the running app in the same state.

---

## 1. Design decisions

- **One workspace, two arrangements, chosen by the window's real shape.**
  - *Wide* (desktops, laptops, landscape tablets and most landscape phones): the 3D viewer on the left, the information panel on the right (42% of the width, as on the desktop board). Used from 900 px wide, or from 560 px wide when the window is landscape.
  - *Narrow* (phones, portrait tablets): the viewer fills the screen and **one panel** sits over its lower part. The Patient / Case / Conditions bar is gone.
- **The phone panel has three sizes.**
  - *Compact*: the location, its details and the results heading.
  - *Reading*: about 58% of the screen, the body above and the results below. Opening it shows the first results. Where the details and three rows fit, nothing moves (as on the board); on smaller phones the list starts at its heading, with the details one swipe up.
  - *Full height*: everything from the top, with a small body picture and **Show body** to return.
  - It moves by dragging its top edge (finger or mouse), with **Expand** and **Show body**, or with the grabber (click, or the arrow keys). A quick flick moves exactly one size.
  - It never loses its place: editors and searches keep its scroll position and any opened conditions. Once the learner scrolls, that position is kept when the size changes.
  - On short landscape screens it always leaves at least 160 px of the body in view, and the search moves into the header's search button.
- **The selected spot stays in view, at a useful size.** The camera centres the spot in whatever part of the viewer is uncovered: above the phone panel, above the on-screen keyboard, below the desktop toolbar.
  - When the panel grows or an editor opens, only that centring changes. The camera does not move, so the body is never shrunk and the learner's own rotation and zoom are kept.
  - Clicking the body moves closer only if the spot is shown too small; it never zooms out.
  - Choosing by name turns the patient only when the spot is hidden or seen edge-on, and frames the region (closer for fingers and toes, wider for the trunk). Locations on the front or back of the body are shown from that side, never from below. Automatic moves keep the viewing direction steady (no tilt while gliding).
- **The selection is drawn on the skin itself.** A coral area follows the body's surface, lit like the skin, with a soft edge and a lighter rim (the rim has a faint shimmer, switched off with reduced motion). It has one even colour: no gradient, so it never suggests pain intensity or likelihood. Coral is used for the selection only, never for a comparison status.
  - A white dot, a leader line and a label name it. The label sits up and to the left of the spot, as on the boards; where there is no room it moves to another side. It never covers the spot or the viewer's controls. When space is very short it shows the name alone; as a last resort only the dot shows.
- **Exact names first, plain words beside them.** Every location shows its exact anatomical name with an ordinary-language line under it ("Patella" / "Right kneecap · Front"). Search understands the same plain words ("kneecap", "heel", "funny bone"), body regions ("knee" lists every knee location) and sides ("left knee"). These plain words are a starting list for Eddie to review (§6).
- **Optional details as compact controls, one editor each.** Age and onset look like drop-downs and each opens its own editor: a small sheet on phones, a pop-over on desktop. Swelling stays a quiet line marked *Reference only*.
- **Quiet results.** Rows show the condition and one line: the recorded age range and onset, or, in amber, which detail differs ("Onset differs"). The exact comparison sentences, recorded swelling, other linked locations and the source row are one tap away. Groups have plain headings with small coloured dots. Nothing is scored or ranked.
- **Three colour languages, kept apart** (as in Milestone 3): coral for the selected location only, teal for controls and entered values, green / amber / grey dots for the dataset comparisons (always with words).

## 2. What changed

### The workspace
- **Header:** compact. Desktop: "PainMapper | Musculoskeletal learning", **About** and **•••**. Phones: "PainMapper", **•••**, and a search button when the search bar is tucked away.
- **••• menu:** *Start new case* ("Clears the location and details"), *Clear location* ("Keeps age, onset and swelling"), *Clear case details* ("Keeps the location") and *About PainMapper*. Items that would do nothing are shown disabled.
- **About PainMapper** (a dialog): what the tool is, how the comparisons work, the clinical-review status, what the 3D body does and does not show, credits, and the developer option to show the location spheres.
- **While an editor is open**, the rest of the page is set aside (it can't be clicked, tabbed to or read out); a tap outside just closes the editor.

### The 3D viewer
- **Look:** a deep navy stage with a faint floor glow, and a matte grey-blue "clay" body: one key light, two cool rim lights and soft reflections, all following the camera. Skin, hair, eyes and shorts use flat colours instead of the photo textures. This also lightened the work for the graphics chip (default view: 32 → 15 draw calls; texture memory about 380 → 147 MB).
- **Controls:** labelled **Front | Back** and **Whole body**; on desktop also **+**, **−**, **centre the selected location**, and the hint "Drag to rotate · Scroll to zoom". The patient's right and left are labelled at the edges and swap in the back view.
- **Miniature body:** a small picture of the whole patient with a coral mark on the chosen spot (desktop: bottom left of the viewer; phones: just above the panel, where there is room; full-height list: beside the location name). It is drawn from the 3D model itself, so the mark matches the spot. "R L" under it gives the sides; a back-of-body location shows the back picture, marked "L Back R". Pressing it shows the whole body.
- **Clicking where there is no location** no longer clears the selection. Clearing is always an explicit action.
- **The "light speck" on the back of the head** (Milestone 3 limitation) is fixed: it was head skin showing through gaps in the hair.
- **Smoothness:** the invisible location spheres no longer redraw while the view turns, and the selection label updates only what changed.

### Search
- One search field ("Find a body location"): under the header on phones, at the top left of the viewer on desktop.
- Results show a small picture of the area with the spot marked, the exact name and the plain description ("Kneecap · Knee, front").
- A location on both sides asks **Choose the patient's side: Right / Left** unless the search said it ("left knee").
- With nothing typed, it lists the locations near the current one, then every location by body region. A body part with no locations says so ("The dataset has no head locations.").
- On a landscape phone with the keyboard up, the results end above the keyboard and switch to compact rows.

### Case details and editors
- **Age:** type a whole number (0 means under 1 year), or use − and +; **Under 1 year** and **Not specified** buttons. Ages outside 0–18 are explained and never applied: an out-of-range or empty entry puts back the age the case had (for example, replacing 13 with 25 keeps 13). Age 0 always reads "Under 1 year", and "Not specified" stays a separate state.
- **Onset:** *Not specified* ("Unknown; onset is not compared"), *After injury* (compared with conditions recorded as traumatic), *No injury* (compared with conditions recorded as atraumatic).
- **Swelling:** *Not specified*, None, Mild, Moderate, Severe; reference only, never compared.
- Every valid change updates the results at once. **Done**, Escape or a tap outside closes the editor and puts focus back on the control that opened it. Editors fit between the header and the keyboard, and scroll when the window is short.

### Results
- Heading "Associated conditions · 5", "A–Z within groups" and the context line "Educational use · Not ranked by likelihood · Clinical review pending". Longer explanations moved to About.
- Groups: **Consistent with the case**, **Couldn't be compared**, **Differs from an entered detail** ("Still associated; not ruled out."). With nothing entered, one alphabetical list.
- A record that can't be compared says exactly what is missing ("Up to 18 years (minimum not recorded)", "Onset not recorded").
- "Also linked to" lists each other location once, spelled as in `locations.csv` (two records spell "Distal fibula" and "Epigastric region" in lower case; the data file is unchanged).
- **Presentation change for Eddie to confirm:** the Differs group is now listed open, like the others, as on the boards (Milestone 3 started it collapsed).

### Files (compared with the Milestone 3 checkpoint)
- **New (28):**
  - `src/components/`: `AboutDialog`, `AppMenu`, `BottomSheet`, `CameraRig`, `CaseControls`, `LocationHeader`, `LocationSearch`, `MiniLocator`, `SelectionTracker`, and `editors/` (`AgeEditor`, `ChoiceEditor`, `EditorSurface`).
  - `src/data/`: `caseDetails.js`, `locationNames.js`, `locationSearch.js`, `locationText.js`.
  - `src/layout/`: `useLayout.js`, `viewInsets.js`. `src/devHooks.js`.
  - `src/viewer/`: `bodyMaterial.js`, `framing.js`, `locatorSnapshot.js`, `locatorStore.js`, `surfaceAnchor.js`, `viewForSpot.js`.
  - `tools/`: `framing-checks.mjs`, `pick-equivalence-check.js`, `search-checks.mjs`.
- **Changed (15):** `index.html`, `src/App.css`, `src/App.jsx`, `src/index.css`, `src/modelLoader.js`, and in `src/components/`: `AnatomicalZones`, `AppHeader`, `BodyInteraction`, `ConditionResults`, `FloorShadow`, `icons`, `Model`, `ViewerLights`, `ViewerPanel`, `Zone`.
- **Removed (5):** `src/components/CameraControls`, `CasePanel`, `LocationPicker`, `PanelFooter`, `SectionNav`.

## 3. The body, the placements and the model

The brief asked to separate rendering or transform defects (engineering can fix them) from anatomical judgments (Eddie's call). An investigation measured every location against the model's own skeleton and skin.

**No transform defect.** The drawn model, the invisible picking copy and the 173 location spheres line up exactly (within 0.0000002 units). The 82 left/right pairs are exact mirrors, and the patient's left is on the correct side.

**Fixed in this milestone (rendering, no change to any location):**
- **Selected spots that showed nothing.** About half of the location centres sit slightly inside or outside the skin (up to about 7 cm on this model). Superior Shoulder, the three upper-back quadrants and Lateral Epicondyle were buried deep enough that Milestone 3 drew nothing visible. The selection is now drawn at the nearest visible skin, so every location shows.
- **Spots under the shorts** (Groin, Gluteal, Pubic, Suprapubic) are drawn on the visible outer layer, not hidden under it.
- **The marker floating or sinking.** Milestone 3 drew the location sphere itself (a red ball that hovered in front of or sank into the skin, showed through to the far side at the wrist and toes, and read like a "hot spot"). It is replaced by the on-skin drawing.
- **Pubic Region turned the camera underneath the patient** (its spot faces downwards between the thighs). Front and back locations are now always shown from that side.
- **Search picking the wrong one.** Typing "pubic region" and pressing Enter selected Suprapubic Region (the old list sorted by body region first). Exact names now always come first; a check covers every location.

**Demonstrable placement problems, NOT changed** (the positions are protected, and where each spot should go is Eddie's call):
1. **The hip and pelvis group sits about 15 cm too low on this model.** Groin is on the upper inner thigh at the shorts' hem; Anterior Proximal Thigh is at mid-thigh; the Greater Trochanteric spot is well below the hip joint; Gluteal Region is below the buttock fold. As a result, a click on the hip crease selects Left/Right Lower Abdomen, and a click on the side of the hip selects a Flank.
2. **Pubic Region's centre lies between the thighs,** below the trunk, so from the front its patch looks like a "bow tie" at the crotch.
3. **Hand and foot locations were placed for a different pose** (palms forward, feet flat). This model has palms down and pointed feet, so:
   - no finger has a location on it (Ring finger sits on the palm near the knuckles);
   - the palm/back-of-hand and thumb-side/little-finger-side spots are turned by about 90°;
   - the toe locations float above the toes, and the "Plantar" (sole) spots sit on the top or outer side of the foot.
4. **A click on the kneecap selects Patellar Facet, never Patella** (Patella is reachable through Nearby or search).
5. **Anterior Neck lands on the chin and lips; Calcaneal Region on the outer heel.**

The investigation proposes fixes (lift and re-fit the hip group; re-register the hand and foot spots to the model's bones), but they change where locations are, so they wait for Eddie's answers (§6). After any such change the selection check must be re-run.

**What the model can support.** The file (about 54 MB, 94% textures) contains only an outer skin, plus hair, eyes, teeth and underwear. There are **no bones, muscles or organs**; the skeleton inside it is a set of invisible joints with no shapes. So:
- The on-skin selection, the clay look and the miniature body work with it (done).
- **Muscle or bone layers would need a new 3D asset:** one named shape per structure, in exactly this pose, scale and position (or the skin and every location re-placed to match a new one); a licence that allows public web use; and, for this paediatric dataset, child anatomy with open growth plates (this model is an adult man). Each location would then need a reviewed link to its structures in a separate table, approved by Eddie before learners see it.
- The textures could be shrunk to cut the download from 54 MB to roughly 15–20 MB with no visible change in the normal view (measured). That is not done here because the model file is protected; it is the biggest remaining phone risk (§5).

## 4. How it was checked

**Test environment for every check and measurement below:** this PC (Windows 11 Home 10.0.26200; NVIDIA GeForce RTX 4080 SUPER graphics), **Microsoft Edge 157.0.4341.60** running headless (Chromium engine, WebGL 2 through Direct3D 11), against the local development server and, for performance, a local production build. Phones and tablets were **emulated** (screen size, pixel density, touch input, mobile browser identity); the on-screen keyboard was **simulated** with a development hook. **No physical phone, no Safari or Firefox, and no screen reader were used** (§5).

**Automated checks (all passing):**
- `node tools/data-checks.mjs`: 507 passed (location matching and the comparison rules, unchanged).
- `node tools/search-checks.mjs`: 824 passed (every exact name finds itself first, plain words, regions, sides, misspellings).
- `node tools/framing-checks.mjs`: 38 passed (camera framing arithmetic).
- `tools/selection-check.js` in the browser: 77,850 simulated clicks over the body, 0 on the wrong side, no location unreachable (same as Milestone 3).
- `tools/pick-equivalence-check.js`: 77,850 rays; the faster picking added in this milestone returns exactly the same locations (0 differences).
- Lint: no problems. Production build: succeeds.

**Browser journeys (scripts driving the real interface, with screenshots):**
| What | Result |
|---|---|
| Core journeys, desktop and phone: search, side choice, focus, age and onset editors, Patella 13 after injury = 3 / 2, expanding rows, Nearby, side switch, Front/Back, Whole body, Start new case, panel sizes by button and by touch drag, editors keeping panel size, scroll and opened rows, the summoned phone search returning focus | 37 / 37 |
| 18 locations across all body regions, phone compact and reading plus desktop: spot centred in the uncovered area and labelled | 54 / 54 |
| States: data and model failures (retry, focus), reduced motion, simulated keyboard, enlarged text, 320×640, 768×1024, 844×390, 900×700, 1024×768 | 33 / 33 |
| Age typing sequences (deleting, retyping, out of range, steppers, Under 1 year) | 12 / 12 |
| Landscape phones with the keyboard up (844×390, 932×430): search results and the age editor above the keyboard | 15 / 15 |
| Phone error card above the panel, very small landscape screens (533×320 to 568×320), clicks through the corner figure, "Also linked to" spelling | 22 / 22 |
| Every location (98), phone and desktop: label shown, never over the spot or a control | 98 / 98 on each |

**The brief's checklist:**
| Item | Where it was checked |
|---|---|
| Selection, nearby, front/back and sides | Core journeys; regions; selection check |
| Search and keyboard | Core journeys; search checks (824); keyboard-only review |
| Editors keeping position | Core journeys (panel size, scroll, opened rows kept) |
| Panel movement | Buttons, grabber keys, touch drags and flicks |
| Long lists, unknown and uncomparable records, all-differ cases | Data checks; review with 25 case fixtures (for example Groin with an injury only: all 18 differ) |
| Anatomy above partial panels | Regions (compact and reading), the corner figure's room check |
| Narrow screens, software keyboard, enlarged text | States; landscape keyboard; edge cases |
| Reduced motion | States (camera arrives at once, transitions off) |
| Loading and failure states | States; edge cases |

**Independent review.** Six reviewers each tested one area in the running app (data and clinical wording, accessibility, phone layout, the 3D viewer, desktop fidelity, robustness) and reported 74 issues. A second reviewer then tried to disprove each one: 37 were confirmed, and the other 37 had already been fixed by then or could not be reproduced. All confirmed issues were fixed and re-tested, except one low-priority item listed in §5.

**Performance** (same PC and browser; a production build served locally, unless noted):
- **Loading:** the interface is usable (search and conditions available) after 0.3 s. The 3D patient appears after 1.8 s from this PC's own server, and after 10.5 s with the connection limited to 50 Mbit/s; the 54 MB model file is 9.7 s of that. The app's own code is 370 KB compressed.
- **Turning the patient and moving the phone panel:** every frame kept pace with the display (144 frames a second here: 6.9 ms typical, 7.0 ms at the 95th percentile), on desktop and on the emulated phone at 3× pixel density.
- **With the processor slowed 4×** (an imitation of a mid-range phone's processor, not of its graphics chip): still no frame over 33 ms (worst 13.9 ms). In development mode the same phone run had 3 slow frames while dragging the panel (worst 160 ms), caused by React's development-only checks; the production build has none.
- **Search:** results appear 8–31 ms after typing (63 ms in development mode with the slowed processor).
- **Drawing work** (zoomed on the knee): 5–6 draw calls, about 5,000–7,000 triangles, 18 textures, 8 shader programs. On phones the drawing resolution is capped at 2× and lowered automatically if frames start to slow.

## 5. Limitations and what still needs a real phone

**Check on a physical phone (not possible in this environment):**
- **Download and first view on mobile data.** The 54 MB model is the largest risk (about 10 s at 50 Mbit/s here; much longer on a weak connection). Shrinking its textures (§3) would help, if Eddie agrees to change the model file.
- **Smoothness and memory on a real phone's graphics chip.** Here the GPU is a desktop card; the slowed-down runs in §4 only imitate a slower processor.
- **Touch feel:** dragging and flicking the panel, rotating and pinch-zooming the body, tapping small spots.
- **The real on-screen keyboard** in iPhone Safari and Android Chrome (how each resizes the page), including landscape.
- **iPhone notch and home bar areas**, the browser's address bar appearing and hiding.
- **Safari and Firefox** generally (only Chromium-based Edge was used).
- **A screen reader** (VoiceOver, TalkBack): the structure was checked by reading the page's accessibility information, not by listening.

**Remaining differences from the boards (section 7 shows them side by side):**
- *Limits of the 3D asset (not fixable without a new or edited model):*
  - The model stands in an A-pose with arms out, so the whole body is framed smaller and the miniature figure is wider than the boards' arms-down mannequin.
  - It is a realistic adult man with hair and shorts, not the boards' smooth mannequin; the clay look brings it close but not identical.
  - Where spots land on the skin follows the protected placement data (§3), for example the Pubic "bow tie" and fingers on the palm.
- *Deliberate, from the brief (not on the boards):* the Nearby locations row with the Right/Left switch, the **Clear** and **Clear details** actions, the patient's right/left labels on desktop, the phone's Whole body button, and the side choice's "Back to results".
- *Smaller implementation differences:* on phones the reading size scrolls the details out of view to show three results (the extra Nearby row does not leave room for both); the 3D view is framed slightly wider than the boards' close-ups (the boards zoom further in the editing view); the Whole body button is a filled pill rather than an outline.

**Known issue (low priority):** turning a phone between portrait and landscape rebuilds the panel, so a half-typed search and the list's scroll position are lost.

## 6. For Eddie

**New in this milestone (no medical content was added; these need his eye):**
1. **The plain-language names** in `src/data/locationNames.js`: one per location (for example Patella → "kneecap", Calcaneal Region → "heel", Popliteal Fossa → "back of the knee"), plus extra search words. They are everyday lay terms only. 24 are marked `confirm: true` because the lay term is a judgment, for example Patellar Facet ("underside of the kneecap"), the upper-back "quadrants" ("left upper back"…), Medial Epicondyle ("inner elbow bump", also found by "funny bone"), Medial Tarsals (Plantar) ("arch of the foot"), and the armpit and lower-belly names. Locations with no honest lay term have none.
2. **Body-region words** ("knee", "back", "arm", "ribs", "spine"…): which locations each one lists. 30 of the 45 are judgment calls and are marked `judgment: true`; their results are titled "Locations related to …" rather than presented as anatomy. "Belly button" lists every abdomen location and says no location is specific to it.
3. **"Differs" now starts open** (Milestone 3: collapsed). Every condition is listed either way; this only changes what shows first.
4. **The placement questions** from §3 (what each label should mark):
   - **Groin:** the inguinal crease, the upper inner thigh near the adductor origin, or both?
   - **Pubic Region:** the skin over the pubic symphysis?
   - **How Suprapubic, Left/Right Lower Abdomen, Pubic Region and Groin divide** the lower abdomen.
   - **Anterior Proximal Thigh:** the upper third of the front of the thigh?
   - **Greater Trochanteric region:** centred on the trochanter, at hip-joint level on the side?
   - **Gluteal Region:** from the iliac crest to the buttock fold?
   - **Hand and foot terms:** do palmar, dorsal, radial, ulnar, plantar and the finger and toe names keep their anatomical meaning on this palms-down, pointed-foot model (so the spots should move onto the fingers, toes and soles)?
   - **Kneecap:** should a click on the kneecap select Patella or Patellar Facet?
5. **Future anatomy layers** (§3): whether muscle or bone views are wanted, for which age bands, and from which licensed source.

**Still open from earlier milestones** (Milestone 2 §3; summarised in Milestone 3 §5): age ranges as inclusive limits, onset flags taken literally, the meaning of the Swelling column, ordering and "can't-miss" flags, ages 19–21, the belly button and Epigastric Region, empty locations, and the rows and spellings to confirm. This milestone settles none of them.

## 7. Screenshots and recording

All in `docs/screenshots/`. Each comparison shows the Astra board on the left and the running app on the right, in the same state (Patella, 13 years, after injury), at a comparable size: the desktop board beside a 1440 × 900 window; the phone boards beside a 390 × 790 phone screen (the boards' own proportions).

**Board beside app:**
| File | State |
|---|---|
| `m4-compare-desktop.png` | Desktop: Patella selected, 13 years, after injury, results grouped 3 / 2 |
| `m4-compare-phone-explore.png` | Phone, explore (nothing selected) |
| `m4-compare-phone-search.png` | Phone, search "kneecap" with the side choice |
| `m4-compare-phone-selected.png` | Phone, selected location, compact panel |
| `m4-compare-phone-reading.png` | Phone, reading size: anatomy above, results below |
| `m4-compare-phone-list.png` | Phone, full-height list |
| `m4-compare-phone-edit.png` | Phone, editing the age |

**More of the running app:**
| File | State |
|---|---|
| `m4-desktop-age-editor.png` | Desktop age editor (pop-over under its control) |
| `m4-desktop-row-open.png` | A "differs" row opened: the exact comparison sentences and the source row |
| `m4-phone-back-of-body.png` | A back-of-body location chosen by name (left heel): the patient turns, and the corner figure shows the back ("L Back R") |
| `m4-phone-journey.apng` | Recording (animated PNG; open it in a browser): tap the knee, switch to Patella through Nearby, open the panel, set age 13 and after injury, expand the list, return to the body, and turn the patient with a finger while the label stays on the knee |

**Remaining differences** are listed in §5: the model's pose and look (asset), the features the brief added (Nearby with the side switch, the clear actions, side labels on desktop), and a few smaller layout choices.

## 8. How to return to the Milestone 3 checkpoint

`.backup/milestone-3-checkpoint-2026-11-18.zip` holds the working Milestone 3 version: 56 files, verified byte for byte when saved (18 November), with a file list and checksums inside (`CHECKPOINT-MANIFEST.txt`). It leaves out `node_modules` and the 3D model, which haven't changed.

1. Stop the dev server (Ctrl+C in its window).
2. Extract the zip over the `PainMapper-main` folder, replacing files. This restores the 15 changed files and the five components Milestone 4 removed (`CameraControls`, `CasePanel`, `LocationPicker`, `PanelFooter`, `SectionNav`). It also places `CHECKPOINT-MANIFEST.txt` in the folder, which you can delete.
3. Delete the Milestone 4 additions:
   - in `src/components/`: `AboutDialog.jsx`, `AppMenu.jsx`, `BottomSheet.jsx`, `CameraRig.jsx`, `CaseControls.jsx`, `LocationHeader.jsx`, `LocationSearch.jsx`, `MiniLocator.jsx`, `SelectionTracker.jsx`;
   - the folders `src/components/editors/`, `src/layout/` and `src/viewer/`;
   - in `src/data/`: `caseDetails.js`, `locationNames.js`, `locationSearch.js`, `locationText.js`;
   - `src/devHooks.js`;
   - in `tools/`: `framing-checks.mjs`, `pick-equivalence-check.js` and `search-checks.mjs`;
   - optionally, this note and the `m4-` screenshots and recording in `docs/screenshots/` (documentation only).
4. Run `npm run dev` and open http://localhost:5173/PainMapper/.

The Milestone 2 and 1 checkpoints and the original download are still in `.backup/`; see `milestone-3-finished-experience.md` §7.
