# PainMapper: baseline report

**Date:** 17 November 2026
**Purpose:** Record how the existing app behaves *before* any changes, so later work can be checked against it. Producing this report changed none of the app's source code, medical data, or settings.

---

## 1. Which version this describes

- The local copy in `Desktop\PainMapper-main` is **byte-for-byte identical** to the published site, https://eddiere.github.io/PainMapper/: the same `locations.csv`, `pathologies.csv`, and `model.glb`, and the same compiled app code (bundle `index-4xJz6SSi.js`).
- Toolchain: Node.js 26.13.1 (LTS). Dependencies were installed exactly from Eddie's `package-lock.json` with `npm ci`.
- Checks: the production build (`vite build`) succeeds, and lint (`eslint .`) passes with no warnings.

## 2. How to run it locally

1. Open the `PainMapper-main` folder in File Explorer.
2. Click the address bar, type `cmd`, and press Enter. A Command Prompt opens in that folder.
   (Use Command Prompt, not PowerShell. PowerShell's default settings can block `npm` on Windows.)
3. Type `npm run dev` and press Enter.
4. Open **http://localhost:5173/PainMapper/** in a browser.
5. To stop it, press Ctrl+C in that window.

## 3. What works (tested by clicking in a browser)

| Check | Result |
|---|---|
| App loads at the local address | Yes |
| Data loads | Yes. The sidebar shows "98 anatomical locations loaded / 272 pathology records loaded" |
| 3D model loads and renders | Yes. The 3D area is blank for a few seconds while the 54 MB model loads, with no loading indicator |
| "Show anatomical nodes" toggle | Yes. Shows the orange clickable spots |
| Hovering a spot | Yes. The cursor changes to a pointer |
| Clicking left kneecap | Selected "Patella / Knee". Listed: Knee Contusion; Patella Fracture; Osteochondritis Dissecans |
| Clicking left groin | Selected "Groin / Hip". Listed: Femoral Neck Fracture; Slipped Capital Femoral Epiphysis; Legg-Calve-Perthes Disease |
| Camera re-centres on the selected spot | Yes |
| Clicking empty space clears the selection | Yes. Back to "None" |
| Browser console errors | None. One harmless deprecation warning from the 3D library (`THREE.Clock`) |
| Narrow window (about 535 px) | The layout stacks: 3D view on top, sidebar below. Results are below the fold, so you have to scroll |

**Not tested:** rotating the body by dragging, touch devices, browsers other than the built-in one, and load time over a real internet connection.

## 4. How the differential is chosen today

`getDifferentialDiagnoses` in `src/data/csvLoader.js` (lines 94–114):

1. It keeps every row of `pathologies.csv` whose Location 1, 2, or 3 matches the clicked location's name (capitalization is ignored).
2. It keeps those rows **in the order they appear in the spreadsheet**.
3. It shows **the first 3** (the limit is set in `src/App.jsx`, line 90).

**Age Minimum/Maximum, Traumatic/Atraumatic, and Swelling are read in (`csvLoader.js`, lines 44–48) but never used anywhere.** The app also has no screen for entering case details. The list is therefore not a ranking by likelihood, and it has not been clinically validated. It is the first three matching rows of the spreadsheet.

What this means in practice (computed by running the app's own code against all 98 locations):

- **57 of 98 locations** have more than 3 matching records, so most of their records are never shown.
  - *Groin:* 18 records; the 3 shown are always Femoral Neck Fracture, SCFE, and LCP, for any age. Septic Arthritis (0–5) and Transient Synovitis (3–8) are never shown.
  - *Patellar Facet:* 8 records; Septic Arthritis, JIA, Lyme Arthritis, OCD, and Reactive Arthritis are never shown.
- **7 locations have no records**, so clicking them shows "No pathologies are currently mapped": Left Upper Quadrant and Right Upper Quadrant (upper back); the Pointer, Middle, and Ring fingers; All Fingers Carpal-Metacarpal; and All Toes Tarsometatarsal Joint.
- The full per-location output is in the appendix.

## 5. Issues found

### Selecting a location
1. **Clicks pass through the body.** The body model doesn't block clicks, so clicking the front can select a spot on the back. *Confirmed by a real click:* clicking the belly button from the default front view selected **"Midline Lower Quadrant – Lower Back"** and listed Spondylolysis, Spondylolisthesis, and Disc Herniation. A simulation found 11 back locations that can be hit this way from the front.
2. **Some spots can't be clicked.** The clickable spots are invisible spheres, and some sit inside others. A simulation fired clicks from 96 angles around the body using the app's real spot positions and the same 3D library:
   - **Ring finger** and **All Toes MTP Joint** could not be selected from any angle.
   - **Patellar Facet** sits directly behind Patella. It can't be selected from the front, and from other angles only a thin rim catches clicks. That puts its 8 records out of practical reach.
3. **No indication of which side or which spot.** The sidebar shows "Patella" but not *left* or *right*, although the app knows. With the debug toggle off, the selected spot isn't highlighted on the body.
4. **Small, crowded targets** on the fingers and toes.

### Content and presentation
5. **The "enter case details" step doesn't exist yet.** There are no inputs for age, mechanism, swelling, and so on.
6. **No indication that results are hidden.** For example, the screen doesn't say "showing 3 of 18".
7. **The notes column is never read.** The code looks for a column named `Unnamed: 9`, but the spreadsheet's 10th column has no name. Four notes are silently dropped, for example "Can be stress or acute-trauma related".
8. **The model is an adult man**, although the app is for pediatrics.
9. **The model file is 54 MB.** It loads quickly on this computer, but on a typical home connection it will probably take tens of seconds (an estimate; not measured). There is no loading indicator in the 3D area.
10. **The developer-only "Debug display" panel is visible to learners.**
11. **The README is the default Vite template**, with no project documentation.

## 6. Questions for Eddie (clinical judgment)

1. **Ranking:** How should the differential be chosen? Should age be a hard filter or only a soft one? Should mechanism (traumatic or atraumatic) filter or just reorder? How should Swelling be used?
2. **How many to show:** Should it stay at 3, show all matches, or show a top group plus "more"?
3. **Can't-miss diagnoses:** Should conditions like septic arthritis, osteomyelitis, malignancy, and SCFE always appear or be flagged, whatever their position in the list?
4. **Swelling column:** Does it mean the swelling typically expected with the condition (None/Mild/Moderate/Severe)? How should it be compared with a case?
5. **Empty locations:** Should the 7 locations with no records (listed in section 4) have conditions, or be removed?
6. **Repeated conditions:** Some conditions appear in several rows with different ages and sites (for example, Septic Arthritis appears 5 times, with ages 0–18 at the knee and ankle, 0–5 at the hip and shoulder, and 0–10 at the elbow). Are those per-site differences intended?
7. **Rows worth confirming:** These may be data-entry slips. They are for Eddie to judge, not conclusions:
   - Retrocalcaneal Bursitis (ankle row): both Traumatic and Atraumatic are FALSE.
   - Contusion (Anterior Proximal Thigh): marked atraumatic only, while the other contusions are marked traumatic.
   - Ulnar Collateral Ligament Injury: mapped only to Lateral Epicondyle.
   - Deltoid Ligament Sprain: mapped to Lateral Malleolus and Anterior Ankle.
   - Slipping Rib Syndrome (axillary row): blank minimum age, which the app reads as 0.
   - Developmental Dysplasia of the Hip: has no location; its note says "remove?".
   - Inguinal Ligament Strain: lists Left Lower Abdomen twice (harmless).
8. **Notes:** Should the notes column be shown to learners?
9. **Spelling fixes:** Are these OK to correct? They appear on screen as written: Anuerysmal → Aneurysmal; Comparement → Compartment; Back Pian → Back Pain; Subacromonial/Impingment → Subacromial/Impingement; Tarsal Coaltion → Tarsal Coalition; Osteocondrosis → Osteochondrosis; de Quiervain → de Quervain; "All Toes Metasarsal" → Metatarsal (this is a location name, so it must change in three files together); and Legg-Calvé-Perthes, which is spelled two different ways.

---

## Appendix: current output for every location

Generated by running the app's own code (`parseLocationsCsv`, `parsePathologiesCsv`, `getDifferentialDiagnoses`) on the current CSVs. "Shown" is exactly what the sidebar displays. "Not shown" lists matching records the app never displays. This table is the "before" reference: any future change to diagnosis behaviour should be compared against it.

_98 locations, 272 pathology records._

| Region | Location | Records | Shown (first 3 in spreadsheet order) | Not shown |
|---|---|---|---|---|
| Knee | Tibial Tubercle | 2 | Osgood-Schlatter Apophysitis; Tibial Tuberosity Avulsion Fracture | — |
| Knee | Patellar Tendon | 4 | Osgood-Schlatter Apophysitis; Sinding-Larsen-Johansson Syndrome; Patellar Tendonitis | Patellar Tendon Strain |
| Knee | Distal Pole of Patella | 1 | Sinding-Larsen-Johansson Syndrome | — |
| Knee | Quadriceps Tendon | 2 | Quadriceps Tendonitis; Quadriceps Strain | — |
| Knee | Lateral Knee Joint Line | 4 | Lateral Meniscus Tear; ACL Tear; PCL Tear | LCL Sprain |
| Knee | Medial Knee Joint Line | 4 | Medial Meniscus Tear; ACL Tear; PCL Tear | MCL Sprain |
| Knee | Popliteal Fossa | 4 | ACL Tear; PCL Tear; Proximal Gastrocnemius Strain | Hamstring Strain |
| Knee | Patellar Facet | 8 | Patellofemoral Knee Pain Syndrome; Patellar Subluxation; Patellar Dislocation | Septic Arthritis; Juvenile Idiopathic Arthritis; Lyme Arthritis; Osteochondritis Dissecans; Reactive Arthritis |
| Knee | Patella | 5 | Knee Contusion; Patella Fracture; Osteochondritis Dissecans | Reactive Arthritis; Contusion |
| Knee | Distal IT Band | 2 | Distal IT Band Syndrome; Sciatica | — |
| Knee | Hoffa's Fat Pad | 1 | Hoffa's Fat Pad Impingement | — |
| Knee | Distal Femur | 6 | Osteomyelitis; Slipped Capital Femoral Epiphysis; Legg-Calvé-Perthes disease | Osteosarcoma; Osteochondroma; Osteoid Osteoma |
| Knee | Proximal Tibia | 4 | Osteomyelitis; Osteosarcoma; Osteochondroma | Osteoid Osteoma |
| Knee | Proximal Fibula | 1 | Osteochondroma | — |
| Ankle | Lateral Malleolus | 8 | Lateral Ankle Sprain; Deltoid Ligament Sprain; Achilles Tendonitis | Sever's Disease; Peroneal Tendinopathy; Os Trigonum; Os Subfibulare; Ankle Contusion |
| Ankle | Medial Malleolus | 7 | Achilles Tendonitis; Sever's Disease; Shin Splints (Medial Tibial Stress Syndrome) | Postero-medial Tendonitis (FHL, Tibialis Posterior, FDL); Os Subtibiale; Accessory Navicular Bone; Ankle Contusion |
| Ankle | Tibiotalar Articulation | 9 | Syndesmotic Ankle Sprain; Distal Tibia Fracture (Avulsion, Stress, SH); Talar Fracture | Posterior Ankle Impingement; Osteomyelitis; Septic Arthritis; Juvenile Idiopathic Arthritis; Anuerysmal Bone Cyst; Reactive Arthritis |
| Ankle | Distal Achilles | 6 | Achilles Tendonitis; Sever's Disease; Achilles Tendon Rupture | Retrocalcaneal Bursitis; Posterior Ankle Impingement; Os Trigonum |
| Ankle | Fibulotalar Articulation | 2 | Distal Fibula Fracture (Avulsion, Stress, SH); Peroneal Tendinopathy | — |
| Ankle | Anterior Ankle | 4 | Lateral Ankle Sprain; Deltoid Ligament Sprain; Anterior Ankle Impingement | Tarsal Coalition |
| Ankle | Distal Tibia | 5 | Shin Splints (Medial Tibial Stress Syndrome); Syndesmotic Ankle Sprain; Distal Tibia Fracture (Avulsion, Stress, SH) | Osteomyelitis; Anuerysmal Bone Cyst |
| Ankle | Distal Fibula | 5 | Syndesmotic Ankle Sprain; Distal Fibula Fracture (Avulsion, Stress, SH); Osteomyelitis | Anuerysmal Bone Cyst; Ankle Contusion |
| Ankle | Calcaneal Region | 7 | Calcaneal Fracture; Retrocalcaneal Bursitis; Tarsal Tunnel Syndrome | Posterior Ankle Impingement; Os Trigonum; Unicameral Bone Cyst; Tarsal Coalition |
| Hip | Groin | 18 | Femoral Neck Fracture; Slipped Capital Femoral Epiphysis; Legg-Calve-Perthes Disease | Pubic Stress Fracture; Psoas Tendinopathy; Partial/Complete Labral Tear; Sacroiliitis; Adductor Tendinopathy; Juvenile Idiopathic Arthritis; Septic Arthritis; Osteomyelitis; Osteoid Osteoma; Osteochondroma; Chondrosarcoma; Transient Synovitis; Femoroacetabular Impingement; Ewing Sarcoma; Snapping Hip Syndrome |
| Hip | Anterior Proximal Thigh | 11 | Femoral Neck Fracture; Slipped Capital Femoral Epiphysis; Psoas Tendinopathy | Partial/Complete Labral Tear; Contusion; Sacroiliitis; Osteoid Osteoma; Osteochondroma; Femoroacetabular Impingement; Snapping Hip Syndrome; Iliopsoas Bursitis |
| Hip | Lateral Proximal Thigh/Greater Trochanteric Region | 7 | Proximal IT Band Syndrome; Legg-Calve-Perthes Disease; Sciatica | Partial/Complete Labral Tear; Referred Low Back Pain; Greater Trochanteric Pain Syndrome; Snapping Hip Syndrome |
| Hip | Gluteal Region | 11 | Slipped Capital Femoral Epiphysis; Deep Gluteal Syndrome; Hamstring Tendinopathy | Sciatica; Sacroiliitis; Disc Herniation with Nerve Impingement; Osteoid Osteoma; Chondrosarcoma; Referred Low Back Pain; Ewing Sarcoma; Greater Trochanteric Pain Syndrome |
| Hip | Pubic Region | 6 | Femoral Neck Fracture; Pubic Stress Fracture; Pubalgia | Adductor Tendinopathy; Chondrosarcoma; Ewing Sarcoma |
| Abdomen | Epigastric Region | 6 | Abdominal Wall Muscle Strain/Tear; Myofascial Pain Syndrome; Rectus Sheath Hematoma | Thoracic Radiculopathy; Diastasis Recti; Abdominal Comparement Syndrome |
| Abdomen | Suprapubic Region | 5 | Sports Hernia/Athletic Pubalgia; Rectus Abdominis Tendinopathy; Psoas Strain | Iliacus Strain; Diastasis Recti |
| Abdomen | Left Flank | 1 | Slipping Rib Syndrome | — |
| Abdomen | Right Flank | 2 | Slipping Rib Syndrome; Thoracic Radiculopathy | — |
| Abdomen | Right Lower Abdomen | 10 | Abdominal Wall Muscle Strain/Tear; Sports Hernia/Athletic Pubalgia; Rectus Abdominis Tendinopathy | Myofascial Pain Syndrome; Rectus Sheath Hematoma; Psoas Strain; Iliacus Strain; Inguinal Ligament Strain; Acute Cutaneous Nerve Entrapment Syndrome; Exercise-Induced Transient Abdominal Pain |
| Abdomen | Left Lower Abdomen | 11 | Abdominal Wall Muscle Strain/Tear; Sports Hernia/Athletic Pubalgia; Rectus Abdominis Tendinopathy | Myofascial Pain Syndrome; Rectus Sheath Hematoma; Thoracic Radiculopathy; Psoas Strain; Iliacus Strain; Inguinal Ligament Strain; Acute Cutaneous Nerve Entrapment Syndrome; Exercise-Induced Transient Abdominal Pain |
| Chest | Left Chest | 7 | Costochondritis; Pectoral Muscle Strain; Precordial Catch Syndrome | SC Joint Dislocation; Tietze Syndrome; Rib/Chest Contusion; Post-viral Chest Wall Inflammation |
| Chest | Right Axillary | 3 | Slipping Rib Syndrome; Rib Fracture; Serratus Anterior Strain | — |
| Chest | Left Axillary | 3 | Slipping Rib Syndrome; Rib Fracture; Serratus Anterior Strain | — |
| Chest | Sternal Area | 7 | Costochondritis; Precordial Catch Syndrome; SC Joint Dislocation | Tietze Syndrome; Rib/Chest Contusion; Post-viral Chest Wall Inflammation; Sternal Fracture |
| Chest | Right Chest | 6 | Costochondritis; Pectoral Muscle Strain; SC Joint Dislocation | Tietze Syndrome; Rib/Chest Contusion; Post-viral Chest Wall Inflammation |
| Neck | Posterior Neck | 8 | Muscle Strain; Postural Fatigue Syndrome; Myofascial Pain | Levator Scapulae Syndrome; Facet Joint Irritation; Cervical Strain; Cervical Stress Reaction; Spinous Process Apophysitis |
| Neck | Lateral Neck | 9 | Muscle Strain; Acute Torticollis; Postural Fatigue Syndrome | Myofascial Pain; Levator Scapulae Syndrome; Facet Joint Irritation; Cervical Strain; Cervical Stress Reaction; Spinous Process Apophysitis |
| Neck | Anterior Neck | 1 | Acute Torticollis | — |
| Upper Back | Left Upper Quadrant | 0 | — | — |
| Upper Back | Midline Upper Quadrant | 5 | Scheuermann Disease; Spinal Epidural Abscess; Vertebral Osteomyelitis | Postural Back Pain; Compression Fracture |
| Upper Back | Right Upper Quadrant | 0 | — | — |
| Upper Back | Left Center Quadrant | 1 | Transverse Process Fracture | — |
| Upper Back | Midline Center Quadrant | 5 | Scheuermann Disease; Spinal Epidural Abscess; Vertebral Osteomyelitis | Postural Back Pain; Compression Fracture |
| Upper Back | Right Center Quadrant | 1 | Transverse Process Fracture | — |
| Lower Back | Left Lower Quadrant | 10 | Spondylolysis; Spondylolisthesis; Disc Herniation | Nonspecific Mechanical Back Pian/ Muscle Strain; Sacroiliitis; Lumbar Radiculopathy; Iliac Crest Apophysitis; Facet Joint Irritation; Myofascial Pain Syndrome; Ankylosing Spondylitis |
| Lower Back | Midline Lower Quadrant | 10 | Spondylolysis; Spondylolisthesis; Disc Herniation | Nonspecific Mechanical Back Pian/ Muscle Strain; Sacroiliitis; Lumbar Radiculopathy; Spinal Epidural Abscess; Vertebral Osteomyelitis; Compression Fracture; Ankylosing Spondylitis |
| Lower Back | Right Lower Quadrant | 10 | Spondylolysis; Spondylolisthesis; Disc Herniation | Nonspecific Mechanical Back Pian/ Muscle Strain; Sacroiliitis; Lumbar Radiculopathy; Iliac Crest Apophysitis; Facet Joint Irritation; Myofascial Pain Syndrome; Ankylosing Spondylitis |
| Shoulder | Anterior Shoulder | 9 | AC Joint Dislocation; GH Anterior Joint Dislocation; Rotator Cuff Tendinopathy | Humerus Fracture; Biceps Tendinopathy; Cervical Radiculopathy; SLAP Tear; Brachial Plexus Injury; Septic Arthritis |
| Shoulder | Lateral Shoulder | 18 | AC Joint Dislocation; GH Anterior Joint Dislocation; Rotator Cuff Strain | Rotator Cuff Tear; Rotator Cuff Tendinopathy; Clavicle Fracture; Humerus Fracture; Deltoid Tear/Strain; Triceps Tendinopathy; Glenohumeral Subluxation; Proximal Humeral Epiphysiolysis; Subacromonial Bursitis/Impingment; Peripheral Nerve Impingement; Shoulder Contusion; Clavicular Apophysitis; Septic Arthritis; Osteomyelitis; Vascular Thoracic Outlet Syndrome |
| Shoulder | Posterior Shoulder | 8 | Scapular Dyskinesia; Triceps Tendinopathy; Trapezius Tear/Strain | SLAP Tear; Glenohumeral Subluxation; Peripheral Nerve Impingement; Osteomyelitis; GH Posterior Joint Dislocation |
| Shoulder | Superior Shoulder | 9 | AC Joint Dislocation; Rotator Cuff Tendinopathy; Clavicle Fracture | Deltoid Tear/Strain; Neurogenic Thoracic Outlet Syndrome; Cervical Radiculopathy; Brachial Plexus Injury; Clavicular Apophysitis; Vascular Thoracic Outlet Syndrome |
| Shoulder | Inferior Axillary Region | 1 | GH Anterior Joint Dislocation | — |
| Shoulder | Scapular Region | 7 | Scapular Dyskinesia; Neurogenic Thoracic Outlet Syndrome; Cervical Radiculopathy | Triceps Tendinopathy; Trapezius Tear/Strain; Peripheral Nerve Impingement; Shoulder Contusion |
| Elbow | Antecubital Region | 11 | Distal Biceps Strain/Tear; Proximal Radius Fracture; Radial Head Subluxation | Elbow Dislocation; Distal Biceps Tendinopathy; Pronator Syndrome; Posterior Interosseus Nerve Syndrome; Septic Arthritis; Osteomyelitis; Juvenile Idiopathic Arthritis; Cervical Radiculopathy |
| Elbow | Medial Epicondyle | 6 | Medial Epicondyle Apophysitis; Medial Condyle Humerus Fracture; Medial Epicondyle Avulsion Fracture | Proximal Ulna Fracture; Osteochondritis Dissecans; Ulnar Neuritis/Subluxation |
| Elbow | Lateral Epicondyle | 9 | Lateral Epicondyle Apophysitis; Proximal Radius Fracture; Ulnar Collateral Ligament Injury | Panner Disease; Lateral Condyle Humerus Fracture; Elbow Dislocation; Posterior Interosseus Nerve Syndrome; Elbow Contusion; Cervical Radiculopathy |
| Elbow | Posterior Cubital Region | 9 | Olecranon Bursitis; Olecranon Apophysitis; Elbow Dislocation | Triceps Tendinopathy; Ulnar Neuritis/Subluxation; Elbow Contusion; Septic Arthritis; Osteomyelitis; Juvenile Idiopathic Arthritis |
| Wrist | Anterior Wrist | 11 | Distal Radius Fracture; Carpal Tunnel Syndrome; Radial Dislocation | Carpal Fracture; Ulnar Tunnel Syndrome; Wrist Contusion; Juvenile Idiopathic Arthritis; Kienbock Disease; Hamate Fracture; Flexor Carpi Radialis Tendinopathy; Flexor Carpi Ulnaris Tendinopathy |
| Wrist | Posterior Wrist | 12 | Distal Radius Fracture; Wrist Sprain; Radial Dislocation | Carpal Fracture; Ganglion Cyst; Juvenile Idiopathic Arthritis; Kienbock Disease; Triquetrum Fracture; Hamate Fracture; Distal Radial Epiphysitis; de Quiervain Tenosynovitis; Intersection Syndrome of the Wrist |
| Wrist | Medial Wrist | 12 | Distal Ulnar Fracture; Ulnar Dislocation; Carpal Fracture | Ulnar Tunnel Syndrome; Kienbock Disease; TFCC Tear; Distal Radial Ulnar Joint Dislocation; Triquetrum Fracture; Hamate Fracture; Extensor Carpi Ulnaris Tendinopathy; Extensor Carpi Ulnaris Subluxation; Flexor Carpi Ulnaris Tendinopathy |
| Wrist | Lateral Wrist | 10 | Distal Radius Fracture; Scaphoid Fracture; Wrist Sprain | Radial Dislocation; Wrist Contusion; Ganglion Cyst; Distal Radial Epiphysitis; de Quiervain Tenosynovitis; Intersection Syndrome of the Wrist; Flexor Carpi Radialis Tendinopathy |
| Wrist | Anterior/Posterior Scaphoid Region | 1 | Scaphoid Fracture | — |
| Hand | Radial Hand | 2 | UCL Injury; Flexor Tendon Laceration/Rupture | — |
| Hand | Ulnar Hand | 2 | Flexor Tendon Laceration/Rupture; Hand/Finger Contusion | — |
| Hand | Palmar Region | 6 | Metacarpal Fracture; CMC Joint Fracture; Flexor Tendon Laceration/Rupture | Hand/Finger Contusion; Trigger Finger/Thumb; Ganglion Cyst |
| Hand | Dorsal Hand | 5 | Metacarpal Fracture; Middle Phalanx Fracture; Extensor Tendon Laceration/Rupture | Hand/Finger Contusion; Ganglion Cyst |
| Finger | Thumb (Anterior/Posterior) | 2 | UCL Injury; Trigger Finger/Thumb | — |
| Finger | Pointer (Anterior/Posterior) | 0 | — | — |
| Finger | Middle (Anterior/Posterior) | 0 | — | — |
| Finger | Ring (Anterior/Posterior) | 0 | — | — |
| Finger | Pinky (Anterior/Posterior) | 1 | Jersey Finger (FDP Avulsion) | — |
| Finger | All Fingers DIP | 3 | DIP Dislocation; Mallet Finger (Extensor Avulsion); Jersey Finger (FDP Avulsion) | — |
| Finger | All Fingers PIP (No Thumb) | 2 | PIP Dislocation; Boutonniere Injury | — |
| Finger | All Fingers MCP | 1 | MCP Dislocation | — |
| Finger | All Fingers Proximal Phalanx | 1 | Proximal Phalanx Fracture | — |
| Finger | All Fingers Middle Phalanx (No Thumb) | 1 | Middle Phalanx Fracture | — |
| Finger | All Fingers Distal Phalanx | 1 | Distal Phalanx Fracture | — |
| Finger | All Fingers Metacarpal | 1 | Metacarpal Fracture | — |
| Finger | All Fingers Carpal-Metacarpal | 0 | — | — |
| Foot | Medial Tarsals (Plantar) | 9 | Calcaneal Stress Fracture; Tarsal Coaltion; Navicular Osteocondrosis | Navicular Stress Fracture; Metatarsal Stress Fracture; Freiburg Disease; Osteochondritis Dissecans (Talus); Tarsal Tunnel Syndrome; Foot Contusion |
| Foot | Lateral Tarsals (Plantar) | 10 | Jones Fracture; Peroneal Tendinopathy; Peroneal Tendon Rupture | Tarsometatarsal Dislocation; Tarsal Coaltion; Cuboid Syndrome; Metatarsal Stress Fracture; Iselin Disease; Osteochondritis Dissecans (Talus); Sinus Tarsi Syndrome |
| Foot | Medial Tarsals (Dorsal) | 8 | Talar Fracture; Calcaneal Stress Fracture; Tarsal Coaltion | Navicular Osteocondrosis; Navicular Stress Fracture; Midfoot Sprain; Freiburg Disease; Tarsal Tunnel Syndrome |
| Foot | Lateral Tarsals (Dorsal) | 9 | Talar Fracture; Lateral Ankle Sprain; Peroneal Tendinopathy | Peroneal Tendon Rupture; Tarsometatarsal Dislocation; Cuboid Syndrome; Midfoot Sprain; Iselin Disease; Sinus Tarsi Syndrome |
| Toe | All Toes Proximal Phalanx | 1 | Proximal Phalanx Fracture | — |
| Toe | All Toes Middle Phalanx | 1 | Middle Phalanx Fracture | — |
| Toe | All Toes Distal Phalanx | 1 | Distal Phalanx Fracture | — |
| Toe | PIP Joint | 1 | PIP Dislocation | — |
| Toe | DIP Joint | 1 | DIP Dislocation | — |
| Foot | Plantar Forefoot | 9 | Flexor Tendon Rupture; Plantar Fasciitis; Heel Pad Syndrome | Midfoot Sprain; Sesamoiditis; MTP Sprain; Flexor Tendonopathy; Baxter Nerve Entrapment; Foot Contusion |
| Foot | Dorsal Forefoot | 3 | Metatarsal Fracture; Extensor Tendon Rupture; Extensor Tendonopathy | — |
| Toe | All Toes Metasarsal | 8 | Jones Fracture; Metatarsal Fracture; Metatarsal Stress Fracture | Iselin Disease; Freiburg Disease; Sesamoiditis; Flexor Tendonopathy; Extensor Tendonopathy |
| Toe | All Toes MTP Joint | 3 | MTP Dislocation; Tarsometatarsal Dislocation; MTP Sprain | — |
| Toe | All Toes Tarsometatarsal Joint | 0 | — | — |
| Foot | Plantar Calcaneal Region | 8 | Calcaneal Fracture; Plantar Fasciitis; Calcaneal Stress Fracture | Heel Pad Syndrome; Retrocalcaneal Bursitis; Haglund Deformity; Baxter Nerve Entrapment; Sinus Tarsi Syndrome |
