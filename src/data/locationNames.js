/*
 * Familiar names for the dataset's locations, for search and for the
 * ordinary-language line under each exact anatomical name.
 *
 * Generated from the Milestone 4 alias review (widely used lay terms only;
 * no clinical content). Entries marked confirm: true are the ones Eddie
 * should check first; every lay term is awaiting his review. The exact
 * anatomical names, regions and locations themselves come from
 * public/data/locations.csv and are unchanged.
 *
 * LOCATION_NAMES[exact name] = {
 *   common     lay name as it reads inside a sentence ("kneecap"), or null
 *   region     the data's region
 *   face       'front' | 'back' | 'both' | 'n/a' (which view shows it)
 *   description  "Kneecap · Knee, front" (search results)
 *   aliases    extra search words
 *   area       body-part word used when there is no lay name and the data
 *              region would mislead (hand and foot bones filed under
 *              Finger and Toe)
 *   confirm    true when the lay term needs Eddie's confirmation
 * }
 * REGION_TERMS: a body-region word and the locations it offers. Words that
 * are judgment calls (judgment: true) are shown as "Locations related to …",
 * never as a fact about anatomy; a note is shown with the results.
 * The comments are the reviewer's notes for Eddie.
 */

export const LOCATION_NAMES = {
  // Bony bump at the top of the shin, just below the kneecap.
  "Tibial Tubercle": { common: "bump below the kneecap", region: "Knee", face: "front", description: "Bump below the kneecap · Knee, front", aliases: ["bump below kneecap","bump below knee","knee bump","top of shin"] },
  "Patellar Tendon": { common: "tendon below the kneecap", region: "Knee", face: "front", description: "Tendon below the kneecap · Knee, front", aliases: ["kneecap tendon","tendon below kneecap","below kneecap"] },
  "Distal Pole of Patella": { common: "bottom of the kneecap", region: "Knee", face: "front", description: "Bottom of the kneecap · Knee, front", aliases: ["bottom of kneecap","lower kneecap","kneecap tip"] },
  "Quadriceps Tendon": { common: "tendon above the kneecap", region: "Knee", face: "front", description: "Tendon above the kneecap · Knee, front", aliases: ["quad tendon","tendon above kneecap","above kneecap"] },
  "Lateral Knee Joint Line": { common: "outer side of the knee joint", region: "Knee", face: "n/a", description: "Outer side of the knee joint · Knee, outer side", aliases: ["outer knee","outside of knee","side of knee"] },
  "Medial Knee Joint Line": { common: "inner side of the knee joint", region: "Knee", face: "n/a", description: "Inner side of the knee joint · Knee, inner side", aliases: ["inner knee","inside of knee","side of knee"] },
  "Popliteal Fossa": { common: "back of the knee", region: "Knee", face: "back", description: "Back of the knee · Knee, back", aliases: ["back of knee","behind knee","knee pit","hollow of knee"] },
  // The joint surface on the underside of the kneecap; lay users cannot tell it apart from "kneecap". A click on the kneecap selects this spot first (docs/milestone-1-selection.md). Eddie to confirm the wording.
  "Patellar Facet": { common: "underside of the kneecap", region: "Knee", face: "front", description: "Underside of the kneecap · Knee, front", aliases: ["under kneecap","behind kneecap","underneath kneecap"], confirm: true },
  "Patella": { common: "kneecap", region: "Knee", face: "front", description: "Kneecap · Knee, front", aliases: ["kneecap","knee cap"] },
  // "IT band" is widely used by runners and is already in the name; "iliotibial band" is just the spelled-out abbreviation.
  "Distal IT Band": { common: "lower IT band", region: "Knee", face: "n/a", description: "Lower IT band, outer thigh · Knee, outer side", aliases: ["itb","iliotibial band","outer thigh","outside of thigh"] },
  // No everyday name; the description is positional only. Learner synonym, not added: "infrapatellar fat pad". Search must ignore apostrophes so "hoffas" and the phone keyboard's curly "hoffa’s" match (both fail today).
  "Hoffa's Fat Pad": { common: null, region: "Knee", face: "front", description: "Fat pad just below the kneecap · Knee, front", aliases: ["fat pad","knee fat pad"] },
  "Distal Femur": { common: "lower thigh bone", region: "Knee", face: "both", description: "Lower end of the thigh bone · Knee, above the joint", aliases: ["thigh bone","lower thigh","above knee"] },
  // With Tibial Tubercle and Distal Tibia, the only shin spots: the data has no mid-shin (tibial shaft) location.
  "Proximal Tibia": { common: "top of the shin bone", region: "Knee", face: "both", description: "Top of the shin bone · Knee, below the joint", aliases: ["shin bone","top of shin","upper shin","below knee"] },
  // No everyday name for the fibula. "Calf bone" exists in dictionaries but is rarely used and suggests the calf muscle, so it is not offered.
  "Proximal Fibula": { common: null, region: "Knee", face: "n/a", description: "Top of the thin outer leg bone · Knee, outer side below the joint", aliases: ["outer leg bone","below knee"] },
  "Lateral Malleolus": { common: "outer ankle bone", region: "Ankle", face: "n/a", description: "Outer ankle bone · Ankle, outer side", aliases: ["outer ankle","outside of ankle","outer ankle bone","ankle bone"] },
  "Medial Malleolus": { common: "inner ankle bone", region: "Ankle", face: "n/a", description: "Inner ankle bone · Ankle, inner side", aliases: ["inner ankle","inside of ankle","inner ankle bone","ankle bone"] },
  // The main hinge joint of the ankle. On the model it sits at the front of the ankle, next to Anterior Ankle.
  "Tibiotalar Articulation": { common: "ankle joint", region: "Ankle", face: "front", description: "Main ankle joint · Ankle, front", aliases: ["ankle joint","main ankle joint"] },
  "Distal Achilles": { common: "lower Achilles tendon", region: "Ankle", face: "back", description: "Lower Achilles tendon, just above the heel · Ankle, back", aliases: ["achilles tendon","heel cord","above heel","back of ankle"] },
  // No everyday name; the description is positional only.
  "Fibulotalar Articulation": { common: null, region: "Ankle", face: "n/a", description: "Outer part of the ankle joint · Ankle, outer side", aliases: ["outer ankle joint","outer ankle"] },
  "Anterior Ankle": { common: "front of the ankle", region: "Ankle", face: "front", description: "Front of the ankle · Ankle, front", aliases: ["front of ankle"] },
  // Bare "shin" is handled by the "shin" region term so it lists both ends of the bone, not this one first.
  "Distal Tibia": { common: "lower shin bone", region: "Ankle", face: "both", description: "Lower end of the shin bone · Ankle, above the joint", aliases: ["lower shin","shin bone","above ankle"] },
  // No everyday name; the description is positional only.
  "Distal Fibula": { common: null, region: "Ankle", face: "n/a", description: "Lower end of the thin outer leg bone · Ankle, outer side above the joint", aliases: ["outer lower leg","above outer ankle"] },
  // Data region is Ankle. Plantar Calcaneal Region (Foot) is the bottom of the heel. "heel" finds nothing today.
  "Calcaneal Region": { common: "heel", region: "Ankle", face: "back", description: "Heel · Ankle, back of the heel", aliases: ["heel","heel bone","back of heel"] },
  // Already everyday language: the UI can hide the common-name part when it equals the name and show just "Hip, front".
  "Groin": { common: "groin", region: "Hip", face: "front", description: "Groin · Hip, front", aliases: ["hip crease","front of hip"] },
  "Anterior Proximal Thigh": { common: "front of the upper thigh", region: "Hip", face: "front", description: "Front of the upper thigh · Hip, front", aliases: ["front of thigh","upper thigh"] },
  // "Hip bone" is loose lay usage (it can also mean the front of the pelvis); Eddie to confirm offering it here. Learner word "trochanter" already matches the name.
  "Lateral Proximal Thigh/Greater Trochanteric Region": { common: "outer hip", region: "Hip", face: "n/a", description: "Outer hip, top of the thigh · Hip, outer side", aliases: ["outer hip","side of hip","outside of hip","outer thigh","hip bone"], confirm: true },
  "Gluteal Region": { common: "buttock", region: "Hip", face: "back", description: "Buttock · Hip, back", aliases: ["buttock","bottom","butt","bum","glute"] },
  "Pubic Region": { common: "pubic area", region: "Hip", face: "front", description: "Pubic area · Hip, front, midline", aliases: ["pubic bone","pubic area"] },
  // Clicks on the belly button land here (docs/milestone-1-selection.md). Whether that is acceptable is an open question for Eddie, so "belly button" is only offered through the flagged "belly button" region term.
  "Epigastric Region": { common: "upper belly", region: "Abdomen", face: "front", description: "Upper belly · Abdomen, front, midline", aliases: ["upper belly","upper tummy","upper stomach","upper abdomen","pit of stomach"] },
  "Suprapubic Region": { common: "lower belly", region: "Abdomen", face: "front", description: "Lower belly, just above the pubic bone · Abdomen, front, midline", aliases: ["lower belly","lower tummy","lower stomach","lower abdomen","above pubic bone"] },
  // Mirror pair with Right Flank (separate rows: 1 vs 2 linked conditions).
  "Left Flank": { common: "side", region: "Abdomen", face: "n/a", description: "Side, between the ribs and hip · Abdomen, left side", aliases: ["side","side of waist","side of belly","side of body"] },
  // Mirror pair with Left Flank (separate rows: 2 vs 1 linked conditions).
  "Right Flank": { common: "side", region: "Abdomen", face: "n/a", description: "Side, between the ribs and hip · Abdomen, right side", aliases: ["side","side of waist","side of belly","side of body"] },
  // Clinicians may type "RLQ" or "right lower quadrant" for this front spot, but in this dataset "Right Lower Quadrant" is a LOWER BACK location. Not added; Eddie to decide whether "RLQ" should also offer this spot.
  "Right Lower Abdomen": { common: "lower right belly", region: "Abdomen", face: "front", description: "Lower right belly · Abdomen, front", aliases: ["lower belly","lower tummy","lower stomach"], confirm: true },
  // Same "LLQ" / "left lower quadrant" collision as Right Lower Abdomen; Eddie to decide.
  "Left Lower Abdomen": { common: "lower left belly", region: "Abdomen", face: "front", description: "Lower left belly · Abdomen, front", aliases: ["lower belly","lower tummy","lower stomach"], confirm: true },
  // Already everyday language. Mirror pair with Right Chest (7 vs 6 linked conditions).
  "Left Chest": { common: "left chest", region: "Chest", face: "front", description: "Left chest · Chest, front", aliases: ["pec","chest muscle"] },
  // On the model this spot sits on the side of the chest just below the armpit hollow, higher than Inferior Axillary Region (zone coordinates and headless-Edge views). The data files it under Chest and the lower spot under Shoulder. Eddie to confirm which spot "armpit" should lead to.
  "Right Axillary": { common: "armpit area", region: "Chest", face: "n/a", description: "Armpit area, side of the chest · Chest, right side", aliases: ["armpit","underarm","side of chest"], confirm: true },
  // See Right Axillary.
  "Left Axillary": { common: "armpit area", region: "Chest", face: "n/a", description: "Armpit area, side of the chest · Chest, left side", aliases: ["armpit","underarm","side of chest"], confirm: true },
  // "sternum" is handled by the word-variant rule (sternum → sternal); it finds nothing today.
  "Sternal Area": { common: "breastbone", region: "Chest", face: "front", description: "Breastbone · Chest, front, midline", aliases: ["breastbone","breast bone","middle of chest","center of chest","centre of chest"] },
  // Already everyday language. Mirror pair with Left Chest.
  "Right Chest": { common: "right chest", region: "Chest", face: "front", description: "Right chest · Chest, front", aliases: ["pec","chest muscle"] },
  "Posterior Neck": { common: "back of the neck", region: "Neck", face: "back", description: "Back of the neck · Neck, back, midline", aliases: ["back of neck","nape","nape of neck"] },
  "Lateral Neck": { common: "side of the neck", region: "Neck", face: "n/a", description: "Side of the neck · Neck, side", aliases: ["side of neck"] },
  // "Throat" is everyday language for the front of the neck but can suggest the inside of the throat, which this dataset does not cover. Eddie to confirm.
  "Anterior Neck": { common: "front of the neck", region: "Neck", face: "front", description: "Front of the neck · Neck, front, midline", aliases: ["front of neck","throat"], confirm: true },
  // NAME COLLISION: "left upper quadrant" (LUQ) normally means the abdomen; here it is the upper back. The lay line must say "back". Eddie to decide whether to rename or add a hint. 0 linked conditions.
  "Left Upper Quadrant": { common: "left upper back", region: "Upper Back", face: "back", description: "Left upper back · Upper back, left of the spine", aliases: ["upper back"], confirm: true },
  // "Between the shoulder blades" is a lay position phrase; Eddie to confirm it fits this row (on the model it sits about level with the upper shoulder blades).
  "Midline Upper Quadrant": { common: "middle of the upper back", region: "Upper Back", face: "back", description: "Middle of the upper back · Upper back, over the spine", aliases: ["upper back","upper spine","between shoulder blades"], confirm: true },
  // NAME COLLISION with the abdominal "right upper quadrant" (RUQ). 0 linked conditions. Today "right upper quadrant" also lists Right Center Quadrant because the region "Upper Back" supplies the word "upper".
  "Right Upper Quadrant": { common: "right upper back", region: "Upper Back", face: "back", description: "Right upper back · Upper back, right of the spine", aliases: ["upper back"], confirm: true },
  // The data puts this "Center" row in Upper Back; on the model it sits mid-back (about level with the lower shoulder blades), so "mid back" is offered. Eddie to confirm.
  "Left Center Quadrant": { common: "left mid back", region: "Upper Back", face: "back", description: "Left mid back · Upper back, left of the spine", aliases: ["mid back","middle back"], confirm: true },
  // See Left Center Quadrant.
  "Midline Center Quadrant": { common: "middle of the mid back", region: "Upper Back", face: "back", description: "Middle of the mid back · Upper back, over the spine", aliases: ["mid back","middle back","mid spine"], confirm: true },
  // See Left Center Quadrant.
  "Right Center Quadrant": { common: "right mid back", region: "Upper Back", face: "back", description: "Right mid back · Upper back, right of the spine", aliases: ["mid back","middle back"], confirm: true },
  // NAME COLLISION with the abdominal "left lower quadrant" (LLQ); today that search returns this back spot only.
  "Left Lower Quadrant": { common: "left lower back", region: "Lower Back", face: "back", description: "Left lower back · Lower back, left of the spine", aliases: ["lower back","low back"], confirm: true },
  "Midline Lower Quadrant": { common: "middle of the lower back", region: "Lower Back", face: "back", description: "Middle of the lower back · Lower back, over the spine", aliases: ["lower back","low back","lower spine","small of back","lumbar"] },
  // NAME COLLISION with the abdominal "right lower quadrant" (RLQ); today that search returns this back spot only.
  "Right Lower Quadrant": { common: "right lower back", region: "Lower Back", face: "back", description: "Right lower back · Lower back, right of the spine", aliases: ["lower back","low back"], confirm: true },
  "Anterior Shoulder": { common: "front of the shoulder", region: "Shoulder", face: "front", description: "Front of the shoulder · Shoulder, front", aliases: ["front of shoulder"] },
  // Learner synonym, not added: "deltoid".
  "Lateral Shoulder": { common: "outer shoulder", region: "Shoulder", face: "n/a", description: "Outer shoulder · Shoulder, outer side", aliases: ["outer shoulder","side of shoulder","outside of shoulder"] },
  "Posterior Shoulder": { common: "back of the shoulder", region: "Shoulder", face: "back", description: "Back of the shoulder · Shoulder, back", aliases: ["back of shoulder"] },
  // "Collarbone" is offered through the flagged "collarbone" region term, not as an alias.
  "Superior Shoulder": { common: "top of the shoulder", region: "Shoulder", face: "n/a", description: "Top of the shoulder · Shoulder, top", aliases: ["top of shoulder"] },
  // The name says armpit, but on the model the spot sits on the side of the chest below the armpit, lower than Right/Left Axillary; the data files it under Shoulder. Eddie to confirm the lay wording.
  "Inferior Axillary Region": { common: "below the armpit", region: "Shoulder", face: "n/a", description: "Below the armpit · Shoulder, side of the chest", aliases: ["armpit","underarm","below armpit"], confirm: true },
  // "scapula" already matches the name by prefix.
  "Scapular Region": { common: "shoulder blade", region: "Shoulder", face: "back", description: "Shoulder blade · Shoulder, back", aliases: ["shoulder blade","shoulderblade"] },
  // "Inner elbow" is ambiguous in lay use (the crease or the inner bony bump), so it is given to both this spot and Medial Epicondyle.
  "Antecubital Region": { common: "elbow crease", region: "Elbow", face: "front", description: "Elbow crease · Elbow, front", aliases: ["elbow crease","inside of elbow","inner elbow","crook of elbow","front of elbow","elbow pit"] },
  // "Funny bone" is the everyday name for the spot just behind this bump; Eddie to confirm offering it here.
  "Medial Epicondyle": { common: "inner elbow bump", region: "Elbow", face: "n/a", description: "Inner elbow bump · Elbow, inner side", aliases: ["inner elbow","inner elbow bump","funny bone"], confirm: true },
  // "Tennis elbow" is a condition name and is deliberately not an alias.
  "Lateral Epicondyle": { common: "outer elbow bump", region: "Elbow", face: "n/a", description: "Outer elbow bump · Elbow, outer side", aliases: ["outer elbow","outside of elbow","outer elbow bump"] },
  // Learner synonym, not added: "olecranon".
  "Posterior Cubital Region": { common: "point of the elbow", region: "Elbow", face: "back", description: "Point of the elbow · Elbow, back", aliases: ["back of elbow","elbow point","point of elbow","tip of elbow"] },
  "Anterior Wrist": { common: "palm side of the wrist", region: "Wrist", face: "front", description: "Palm side of the wrist · Wrist, front", aliases: ["palm side of wrist","inner wrist","underside of wrist","front of wrist","wrist crease"] },
  "Posterior Wrist": { common: "back of the wrist", region: "Wrist", face: "back", description: "Back of the wrist · Wrist, back", aliases: ["back of wrist","top of wrist"] },
  "Medial Wrist": { common: "pinky side of the wrist", region: "Wrist", face: "n/a", description: "Pinky side of the wrist · Wrist, side", aliases: ["pinky side of wrist","little finger side of wrist"] },
  "Lateral Wrist": { common: "thumb side of the wrist", region: "Wrist", face: "n/a", description: "Thumb side of the wrist · Wrist, side", aliases: ["thumb side of wrist"] },
  // No everyday name. "Base of the thumb" could also suggest the thumb's own base joint (part of All Fingers Carpal-Metacarpal). Learner synonym, not added: "snuffbox".
  "Anterior/Posterior Scaphoid Region": { common: null, region: "Wrist", face: "both", description: "Wrist bone at the base of the thumb · Wrist, thumb side, front and back", aliases: ["base of thumb","thumb side of wrist"], confirm: true },
  "Radial Hand": { common: "thumb side of the hand", region: "Hand", face: "n/a", description: "Thumb side of the hand · Hand, side", aliases: ["thumb side of hand"] },
  "Ulnar Hand": { common: "pinky side of the hand", region: "Hand", face: "n/a", description: "Pinky side of the hand · Hand, side", aliases: ["pinky side of hand","little finger side of hand"] },
  "Palmar Region": { common: "palm", region: "Hand", face: "front", description: "Palm · Hand, front", aliases: ["palm","palm of hand"] },
  "Dorsal Hand": { common: "back of the hand", region: "Hand", face: "back", description: "Back of the hand · Hand, back", aliases: ["back of hand","top of hand"] },
  // Search should not match the words "(No Thumb)" in two other names (today "thumb" lists them).
  "Thumb (Anterior/Posterior)": { common: "thumb", region: "Finger", face: "both", description: "Thumb · Finger, front and back", aliases: [] },
  // 0 linked conditions.
  "Pointer (Anterior/Posterior)": { common: "index finger", region: "Finger", face: "both", description: "Index finger · Finger, front and back", aliases: ["index finger","index","pointer finger","forefinger","first finger"] },
  // 0 linked conditions.
  "Middle (Anterior/Posterior)": { common: "middle finger", region: "Finger", face: "both", description: "Middle finger · Finger, front and back", aliases: ["middle finger","long finger"] },
  // 0 linked conditions.
  "Ring (Anterior/Posterior)": { common: "ring finger", region: "Finger", face: "both", description: "Ring finger · Finger, front and back", aliases: ["ring finger","fourth finger"] },
  "Pinky (Anterior/Posterior)": { common: "little finger", region: "Finger", face: "both", description: "Little finger · Finger, front and back", aliases: ["little finger","pinkie","small finger","fifth finger"] },
  // No settled everyday name ("top knuckle" is used for different joints by different people, so it is not offered).
  "All Fingers DIP": { common: null, region: "Finger", face: "both", description: "Joint nearest the fingernail · Finger, all fingers", aliases: ["end joint","last knuckle","end knuckle","fingertip joint"] },
  // No settled everyday name.
  "All Fingers PIP (No Thumb)": { common: null, region: "Finger", face: "both", description: "Middle joint of the finger · Finger, all four fingers", aliases: ["middle knuckle","middle joint","second knuckle"] },
  "All Fingers MCP": { common: "knuckles", region: "Finger", face: "both", description: "Knuckles, where the fingers join the hand · Finger, all fingers", aliases: ["knuckle","big knuckle","base of finger"] },
  // No everyday name; positional description only.
  "All Fingers Proximal Phalanx": { common: null, region: "Finger", face: "both", description: "Finger bone nearest the hand · Finger, all fingers", aliases: ["finger bone","base of finger"] },
  // No everyday name. "Middle" also names the middle finger; the secondary line keeps them apart.
  "All Fingers Middle Phalanx (No Thumb)": { common: null, region: "Finger", face: "both", description: "Middle bone of the finger · Finger, all four fingers", aliases: ["finger bone","middle of finger"] },
  "All Fingers Distal Phalanx": { common: "fingertips", region: "Finger", face: "both", description: "Fingertips · Finger, all fingers", aliases: ["fingertip","finger tip","tip of finger","end of finger"] },
  // No everyday name. The data files it under Finger, but these bones lie in the hand; the "hand" region term also offers it (flagged).
  "All Fingers Metacarpal": { common: null, region: "Finger", face: "both", description: "Long bones of the hand · Finger, in the hand behind the knuckles", aliases: ["hand bone"], area: "hand" },
  // No everyday name; "base of hand" is a loose position phrase. 0 linked conditions. Data region Finger; it sits in the hand.
  "All Fingers Carpal-Metacarpal": { common: null, region: "Finger", face: "both", description: "Base of the hand bones, near the wrist · Finger, in the hand", aliases: ["base of hand"], area: "hand", confirm: true },
  // "Arch" is the everyday word for the inner sole of the midfoot. "Instep" is used loosely for both the arch and the top of the midfoot, so it is only in the "midfoot" region term. Eddie to confirm.
  "Medial Tarsals (Plantar)": { common: "arch of the foot", region: "Foot", face: "n/a", description: "Arch of the foot · Foot, sole, inner side", aliases: ["arch","foot arch","inner sole"], confirm: true },
  "Lateral Tarsals (Plantar)": { common: "outer edge of the sole", region: "Foot", face: "n/a", description: "Outer edge of the sole · Foot, sole, outer side", aliases: ["outer sole","outer edge of foot","outside of foot"] },
  "Medial Tarsals (Dorsal)": { common: "top of the foot, inner side", region: "Foot", face: "front", description: "Top of the foot, inner side · Foot, top of the midfoot", aliases: ["top of foot","inner top of foot"] },
  "Lateral Tarsals (Dorsal)": { common: "top of the foot, outer side", region: "Foot", face: "front", description: "Top of the foot, outer side · Foot, top of the midfoot", aliases: ["top of foot","outer top of foot","outside of foot"] },
  // No everyday name; positional description only.
  "All Toes Proximal Phalanx": { common: null, region: "Toe", face: "both", description: "Toe bone nearest the foot · Toe, all toes", aliases: ["toe bone","base of toe"] },
  // No everyday name. The big toe has no middle bone, but unlike the finger version the name does not say so; Eddie to confirm the description.
  "All Toes Middle Phalanx": { common: null, region: "Toe", face: "both", description: "Middle bone of the toes · Toe, all toes", aliases: ["toe bone","middle of toe"], confirm: true },
  "All Toes Distal Phalanx": { common: "tips of the toes", region: "Toe", face: "both", description: "Tips of the toes · Toe, all toes", aliases: ["toe tip","tip of toe","end of toe"] },
  // No everyday name. The name does not say "toe"; the secondary line must. The finger joint of the same name is All Fingers PIP (No Thumb).
  "PIP Joint": { common: null, region: "Toe", face: "both", description: "First joint along the toe · Toe, all toes", aliases: ["toe joint","toe knuckle"] },
  // No everyday name. The name does not say "toe"; the finger joint of the same name is All Fingers DIP.
  "DIP Joint": { common: null, region: "Toe", face: "both", description: "Joint nearest the toenail · Toe, all toes", aliases: ["toe joint","end toe joint"] },
  "Plantar Forefoot": { common: "ball of the foot", region: "Foot", face: "n/a", description: "Ball of the foot · Foot, sole", aliases: ["ball of foot","front of sole"] },
  "Dorsal Forefoot": { common: "top of the foot", region: "Foot", face: "front", description: "Top of the foot, near the toes · Foot, top", aliases: ["top of foot","top of forefoot","front of foot"] },
  // Name is misspelled ("Metasarsal" for "Metatarsal"; baseline-report.md §6, Eddie's call). Until it is fixed, "metatarsal" must be an alias: today that search finds only All Toes Tarsometatarsal Joint (0 conditions) and hides this spot (8 conditions). Data region Toe; the bones lie in the foot.
  "All Toes Metasarsal": { common: null, region: "Toe", face: "both", description: "Long bones of the foot · Toe, in the foot behind the toes", aliases: ["metatarsal","foot bone","long foot bone"], area: "foot", confirm: true },
  // On the body it is reachable only through Nearby (docs/milestone-1-selection.md), so search is its main route.
  "All Toes MTP Joint": { common: "base of the toes", region: "Toe", face: "both", description: "Base of the toes, where they join the foot · Toe, all toes", aliases: ["base of toe","toe knuckle"] },
  // No everyday name. Learner synonym, not added: "Lisfranc". 0 linked conditions. Data region Toe; the joints lie in the midfoot.
  "All Toes Tarsometatarsal Joint": { common: null, region: "Toe", face: "both", description: "Midfoot joints where the long foot bones begin · Toe, in the foot", aliases: ["midfoot joint"], area: "foot", confirm: true },
  "Plantar Calcaneal Region": { common: "bottom of the heel", region: "Foot", face: "n/a", description: "Bottom of the heel · Foot, sole", aliases: ["bottom of heel","heel pad","under heel","heel"] },
}

export const REGION_TERMS = [
  // Fact: the dataset has no head or face locations (clicking the head clears the selection). Show an explanatory empty state such as "No head or face locations in this dataset" and suggest the neck rather than mapping. "face" also prefix-matches Patellar Facet; list that only below the message.
  { term: "head", title: "Head", synonyms: ["face","skull","scalp","forehead","jaw","chin","cheek","ear","eye","nose","mouth"], locations: [] },
  // Data region Neck.
  { term: "neck", title: "Neck", synonyms: [], locations: ["Posterior Neck","Lateral Neck","Anterior Neck"] },
  // Data region Shoulder (includes the shoulder blade and Inferior Axillary Region).
  { term: "shoulder", title: "Shoulder", synonyms: [], locations: ["Anterior Shoulder","Lateral Shoulder","Posterior Shoulder","Superior Shoulder","Inferior Axillary Region","Scapular Region"] },
  // No collarbone location exists. Its outer end meets the top of the shoulder and its inner end meets the breastbone; offer both as the nearest spots.
  { term: "collarbone", title: "Collarbone", synonyms: ["collar bone","clavicle"], locations: ["Superior Shoulder","Sternal Area"], judgment: true },
  // Which spot is "the armpit" is Eddie's call (see Right Axillary and Inferior Axillary Region).
  { term: "armpit", title: "Armpit", synonyms: ["underarm","axilla"], locations: ["Right Axillary","Left Axillary","Inferior Axillary Region"], judgment: true },
  // Data region Chest.
  { term: "chest", title: "Chest", synonyms: [], locations: ["Left Chest","Right Axillary","Left Axillary","Sternal Area","Right Chest"] },
  // No rib location exists; front, side and lower-side chest spots.
  { term: "ribs", title: "Ribs", synonyms: ["rib","rib cage","ribcage"], locations: ["Left Chest","Right Chest","Right Axillary","Left Axillary","Left Flank","Right Flank"], judgment: true },
  // Data region Abdomen. "Stomach" is included because families use it for the whole belly (search synonym only, never displayed).
  { term: "abdomen", title: "Abdomen", synonyms: ["belly","tummy","stomach","abdominal","abs"], locations: ["Epigastric Region","Suprapubic Region","Left Flank","Right Flank","Right Lower Abdomen","Left Lower Abdomen"] },
  // No periumbilical location exists; clicking the belly button selects Epigastric Region (docs/milestone-1-selection.md). Open question for Eddie (docs/milestone-3-finished-experience.md §5 item 7).
  { term: "belly button", title: "Belly button", synonyms: ["navel","umbilicus","tummy button"], locations: ["Epigastric Region","Suprapubic Region","Left Flank","Right Flank","Right Lower Abdomen","Left Lower Abdomen"], judgment: true, note: "No location in the dataset is specific to the belly button." },
  // Side of the trunk: the flanks first, then the side-of-chest spots.
  { term: "side", title: "Side", synonyms: ["flank","side of body","side of trunk"], locations: ["Left Flank","Right Flank","Right Axillary","Left Axillary"], judgment: true },
  // Upper Back and Lower Back regions plus the shoulder blade (data region Shoulder). When "back" is combined with a body part ("back of knee") it is a position word, not this term.
  { term: "back", title: "Back", synonyms: [], locations: ["Left Upper Quadrant","Midline Upper Quadrant","Right Upper Quadrant","Left Center Quadrant","Midline Center Quadrant","Right Center Quadrant","Left Lower Quadrant","Midline Lower Quadrant","Right Lower Quadrant","Scapular Region"], judgment: true },
  // Data region Upper Back plus the shoulder blade; the data's Upper Back also holds the mid-back ("Center") row.
  { term: "upper back", title: "Upper back", synonyms: [], locations: ["Left Upper Quadrant","Midline Upper Quadrant","Right Upper Quadrant","Left Center Quadrant","Midline Center Quadrant","Right Center Quadrant","Scapular Region"], judgment: true },
  // The "Center" row of the data's Upper Back region. Today "mid back" wrongly lists the three Midline spots because "mid" is a substring of "midline".
  { term: "mid back", title: "Mid back", synonyms: ["middle back","middle of back"], locations: ["Left Center Quadrant","Midline Center Quadrant","Right Center Quadrant"], judgment: true },
  // Data region Lower Back.
  { term: "lower back", title: "Lower back", synonyms: ["low back","lumbar","small of back"], locations: ["Left Lower Quadrant","Midline Lower Quadrant","Right Lower Quadrant"] },
  // The midline back spots plus the back of the neck.
  { term: "spine", title: "Spine", synonyms: ["backbone","spinal"], locations: ["Posterior Neck","Midline Upper Quadrant","Midline Center Quadrant","Midline Lower Quadrant"], judgment: true },
  // No tailbone location exists. Show an explanatory empty state and suggest Midline Lower Quadrant and Gluteal Region rather than mapping.
  { term: "tailbone", title: "Tailbone", synonyms: ["tail bone","coccyx"], locations: [], judgment: true },
  // Very broad (32 spots): show grouped by region and suggest narrowing ("shoulder", "elbow", "wrist", "hand", "finger").
  { term: "arm", title: "Arm", synonyms: ["arms","upper limb"], locations: ["Anterior Shoulder","Lateral Shoulder","Posterior Shoulder","Superior Shoulder","Inferior Axillary Region","Scapular Region","Antecubital Region","Medial Epicondyle","Lateral Epicondyle","Posterior Cubital Region","Anterior Wrist","Posterior Wrist","Medial Wrist","Lateral Wrist","Anterior/Posterior Scaphoid Region","Radial Hand","Ulnar Hand","Palmar Region","Dorsal Hand","Thumb (Anterior/Posterior)","Pointer (Anterior/Posterior)","Middle (Anterior/Posterior)","Ring (Anterior/Posterior)","Pinky (Anterior/Posterior)","All Fingers DIP","All Fingers PIP (No Thumb)","All Fingers MCP","All Fingers Proximal Phalanx","All Fingers Middle Phalanx (No Thumb)","All Fingers Distal Phalanx","All Fingers Metacarpal","All Fingers Carpal-Metacarpal"], judgment: true },
  // No upper-arm (humerus shaft) location exists; nearest shoulder and elbow spots.
  { term: "upper arm", title: "Upper arm", synonyms: [], locations: ["Anterior Shoulder","Lateral Shoulder","Posterior Shoulder","Antecubital Region","Posterior Cubital Region"], judgment: true },
  // Data region Elbow.
  { term: "elbow", title: "Elbow", synonyms: [], locations: ["Antecubital Region","Medial Epicondyle","Lateral Epicondyle","Posterior Cubital Region"] },
  // No forearm location exists; nearest elbow and wrist spots.
  { term: "forearm", title: "Forearm", synonyms: ["lower arm"], locations: ["Antecubital Region","Posterior Cubital Region","Anterior Wrist","Posterior Wrist","Medial Wrist","Lateral Wrist"], judgment: true },
  // Data region Wrist.
  { term: "wrist", title: "Wrist", synonyms: [], locations: ["Anterior Wrist","Posterior Wrist","Medial Wrist","Lateral Wrist","Anterior/Posterior Scaphoid Region"] },
  // Data region Hand plus the two hand-bone spots the data files under Finger.
  { term: "hand", title: "Hand", synonyms: [], locations: ["Radial Hand","Ulnar Hand","Palmar Region","Dorsal Hand","All Fingers Metacarpal","All Fingers Carpal-Metacarpal"], judgment: true },
  // Data region Finger (it also holds the two hand-bone spots).
  { term: "finger", title: "Finger", synonyms: [], locations: ["Thumb (Anterior/Posterior)","Pointer (Anterior/Posterior)","Middle (Anterior/Posterior)","Ring (Anterior/Posterior)","Pinky (Anterior/Posterior)","All Fingers DIP","All Fingers PIP (No Thumb)","All Fingers MCP","All Fingers Proximal Phalanx","All Fingers Middle Phalanx (No Thumb)","All Fingers Distal Phalanx","All Fingers Metacarpal","All Fingers Carpal-Metacarpal"] },
  // "Knuckle" most often means the big knuckles (MCP), listed first.
  { term: "knuckle", title: "Knuckle", synonyms: [], locations: ["All Fingers MCP","All Fingers PIP (No Thumb)","All Fingers DIP"], judgment: true },
  // No nail location; the nail sits on the end bone of the finger.
  { term: "fingernail", title: "Fingernail", synonyms: ["finger nail"], locations: ["All Fingers Distal Phalanx"], judgment: true },
  // Data region Hip.
  { term: "hip", title: "Hip", synonyms: [], locations: ["Groin","Anterior Proximal Thigh","Lateral Proximal Thigh/Greater Trochanteric Region","Gluteal Region","Pubic Region"] },
  // Groin is the exact match; the others are its own nearby spots (nearbyZonesFor).
  { term: "groin", title: "Groin", synonyms: [], locations: ["Groin","Pubic Region","Anterior Proximal Thigh","Suprapubic Region"], judgment: true },
  // No pelvis location; the spots around it.
  { term: "pelvis", title: "Pelvis", synonyms: ["pelvic"], locations: ["Pubic Region","Suprapubic Region","Groin","Gluteal Region","Lateral Proximal Thigh/Greater Trochanteric Region"], judgment: true },
  // Thigh spots are split between Hip and Knee in the data; there is no mid-thigh or back-of-thigh spot.
  { term: "thigh", title: "Thigh", synonyms: ["upper leg"], locations: ["Anterior Proximal Thigh","Lateral Proximal Thigh/Greater Trochanteric Region","Distal IT Band","Distal Femur","Quadriceps Tendon"], judgment: true },
  // No back-of-thigh location exists; nearest spots above (buttock) and below (back of the knee).
  { term: "back of thigh", title: "Back of thigh", synonyms: ["hamstring"], locations: ["Gluteal Region","Popliteal Fossa"], judgment: true },
  // Very broad (43 spots): show grouped by region and suggest narrowing.
  { term: "leg", title: "Leg", synonyms: ["legs","lower limb"], locations: ["Groin","Anterior Proximal Thigh","Lateral Proximal Thigh/Greater Trochanteric Region","Gluteal Region","Pubic Region","Tibial Tubercle","Patellar Tendon","Distal Pole of Patella","Quadriceps Tendon","Lateral Knee Joint Line","Medial Knee Joint Line","Popliteal Fossa","Patellar Facet","Patella","Distal IT Band","Hoffa's Fat Pad","Distal Femur","Proximal Tibia","Proximal Fibula","Lateral Malleolus","Medial Malleolus","Tibiotalar Articulation","Distal Achilles","Fibulotalar Articulation","Anterior Ankle","Distal Tibia","Distal Fibula","Calcaneal Region","Medial Tarsals (Plantar)","Lateral Tarsals (Plantar)","Medial Tarsals (Dorsal)","Lateral Tarsals (Dorsal)","Plantar Forefoot","Dorsal Forefoot","Plantar Calcaneal Region","All Toes Proximal Phalanx","All Toes Middle Phalanx","All Toes Distal Phalanx","PIP Joint","DIP Joint","All Toes Metasarsal","All Toes MTP Joint","All Toes Tarsometatarsal Joint"], judgment: true },
  // Data region Knee.
  { term: "knee", title: "Knee", synonyms: [], locations: ["Tibial Tubercle","Patellar Tendon","Distal Pole of Patella","Quadriceps Tendon","Lateral Knee Joint Line","Medial Knee Joint Line","Popliteal Fossa","Patellar Facet","Patella","Distal IT Band","Hoffa's Fat Pad","Distal Femur","Proximal Tibia","Proximal Fibula"] },
  // Patella is the exact lay match; the other two are parts of the kneecap.
  { term: "kneecap", title: "Kneecap", synonyms: ["knee cap"], locations: ["Patella","Patellar Facet","Distal Pole of Patella"], judgment: true },
  // No mid-lower-leg spots: the data has only the bone ends near the knee and the ankle.
  { term: "lower leg", title: "Lower leg", synonyms: ["below knee"], locations: ["Tibial Tubercle","Proximal Tibia","Proximal Fibula","Distal Tibia","Distal Fibula","Distal Achilles"], judgment: true },
  // No mid-shin (tibial shaft) location exists, so "shin" offers the two ends of the shin bone and the bump below the kneecap.
  { term: "shin", title: "Shin", synonyms: ["shin bone"], locations: ["Tibial Tubercle","Proximal Tibia","Distal Tibia"], judgment: true },
  // No calf location exists; the back of the knee (top of the calf) and the lower Achilles tendon (bottom of the calf) are the nearest.
  { term: "calf", title: "Calf", synonyms: ["calf muscle"], locations: ["Popliteal Fossa","Distal Achilles"], judgment: true },
  // Data region Ankle (includes the heel and the lower ends of both leg bones).
  { term: "ankle", title: "Ankle", synonyms: [], locations: ["Lateral Malleolus","Medial Malleolus","Tibiotalar Articulation","Distal Achilles","Fibulotalar Articulation","Anterior Ankle","Distal Tibia","Distal Fibula","Calcaneal Region"] },
  // Both heel spots, plus the Achilles tendon just above the heel.
  { term: "heel", title: "Heel", synonyms: ["heel bone"], locations: ["Calcaneal Region","Plantar Calcaneal Region","Distal Achilles"], judgment: true },
  // Data region Foot plus the foot structures the data files under Toe and the heel (filed under Ankle).
  { term: "foot", title: "Foot", synonyms: [], locations: ["Medial Tarsals (Plantar)","Lateral Tarsals (Plantar)","Medial Tarsals (Dorsal)","Lateral Tarsals (Dorsal)","Plantar Forefoot","Dorsal Forefoot","Plantar Calcaneal Region","All Toes Metasarsal","All Toes Tarsometatarsal Joint","All Toes MTP Joint","Calcaneal Region"], judgment: true },
  // The four "Plantar" (sole) spots.
  { term: "sole", title: "Sole", synonyms: ["bottom of foot","underside of foot"], locations: ["Plantar Forefoot","Medial Tarsals (Plantar)","Lateral Tarsals (Plantar)","Plantar Calcaneal Region"] },
  // The three "Dorsal" (top of foot) spots.
  { term: "top of foot", title: "Top of foot", synonyms: [], locations: ["Dorsal Forefoot","Medial Tarsals (Dorsal)","Lateral Tarsals (Dorsal)"] },
  // "Instep" is used loosely for both the arch and the top of the midfoot.
  { term: "midfoot", title: "Midfoot", synonyms: ["instep","middle of foot"], locations: ["Medial Tarsals (Plantar)","Lateral Tarsals (Plantar)","Medial Tarsals (Dorsal)","Lateral Tarsals (Dorsal)","All Toes Tarsometatarsal Joint"], judgment: true },
  // Data region Toe (it also holds three foot structures).
  { term: "toe", title: "Toe", synonyms: [], locations: ["All Toes Proximal Phalanx","All Toes Middle Phalanx","All Toes Distal Phalanx","PIP Joint","DIP Joint","All Toes Metasarsal","All Toes MTP Joint","All Toes Tarsometatarsal Joint"] },
  // No location is specific to one toe: every toe spot covers all toes. Say so in the list.
  { term: "big toe", title: "Big toe", synonyms: ["great toe","little toe","pinky toe","baby toe"], locations: ["All Toes MTP Joint","All Toes Proximal Phalanx","All Toes Middle Phalanx","PIP Joint","DIP Joint","All Toes Distal Phalanx"], judgment: true },
  // No nail location; the nail sits on the end bone of the toe.
  { term: "toenail", title: "Toenail", synonyms: ["toe nail"], locations: ["All Toes Distal Phalanx"], judgment: true },
]
