import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import AboutDialog from './components/AboutDialog'
import AppHeader from './components/AppHeader'
import BottomSheet from './components/BottomSheet'
import CaseControls from './components/CaseControls'
import ConditionResults from './components/ConditionResults'
import AgeEditor from './components/editors/AgeEditor'
import ChoiceEditor from './components/editors/ChoiceEditor'
import { ChevronIcon, ChevronUpIcon } from './components/icons'
import LocationHeader, { NearbyLocations } from './components/LocationHeader'
import LocationSearch from './components/LocationSearch'
import MiniLocator from './components/MiniLocator'
import ViewerPanel from './components/ViewerPanel'
import { hasCaseDetails } from './data/caseDetails'
import {
  EMPTY_CASE,
  ONSET,
  organizeConditions,
  SWELLING_LEVELS,
  SWELLING_UNKNOWN,
} from './data/caseMatching'
import {
  getDifferentialDiagnoses,
  loadCsv,
  LOCATION_CSV_PATH,
  parseLocationsCsv,
  parsePathologiesCsv,
  PATHOLOGY_CSV_PATH,
} from './data/csvLoader'
import { buildSearchIndex, describeLocation } from './data/locationSearch'
import { zoneArea, zoneSubtitle } from './data/locationText'
import {
  buildLocationEntries,
  buildZones,
  counterpartZone,
} from './data/zones'
import { registerDevHook } from './devHooks'
import { simulateDataError } from './devSimulation'
import {
  DEFAULT_VIEW_DIRECTION,
  MODEL_CENTER,
} from './interaction/viewDirection'
import { nearbyZonesFor } from './interaction/zonePicking'
import {
  useFinePointer,
  useKeyboardInset,
  useLayoutMode,
} from './layout/useLayout'
import { keyboardInset, setViewInsetsProvider } from './layout/viewInsets'
import { getModelProgress, subscribeToModelProgress } from './modelLoader'
import { frameSizeFor } from './viewer/framing'
import './App.css'

// Camera directions for the view buttons (slightly above, like the default).
const FRONT_DIRECTION = [...DEFAULT_VIEW_DIRECTION]
const BACK_DIRECTION = [
  DEFAULT_VIEW_DIRECTION[0],
  DEFAULT_VIEW_DIRECTION[1],
  -DEFAULT_VIEW_DIRECTION[2],
]

// Each zoom button press brings the camera 25% closer (or further away).
const ZOOM_STEP = 0.75

// All matching records, in the dataset's own matching logic.
const ALL_MATCHES = Infinity

// Covers at the top of the wide viewer (search and toolbar row) and at its
// bottom (hint), so the patient is framed between them.
const WIDE_TOP_COVER = 84
const WIDE_BOTTOM_COVER = 44

// Room for the Front/Back control under the phone's search bar.
const NARROW_CONTROL_ROW = 52

// Each choice says what it is compared with; every condition stays listed.
const ONSET_CHOICES = [
  { value: ONSET.UNKNOWN, label: 'Not specified', description: 'Unknown; onset is not compared.' },
  { value: ONSET.INJURY, label: 'After injury', description: 'Compared with whether each condition is recorded as traumatic.' },
  { value: ONSET.NO_INJURY, label: 'No injury', description: 'Compared with whether each condition is recorded as atraumatic.' },
]

const SWELLING_CHOICES = [
  { value: SWELLING_UNKNOWN, label: 'Not specified' },
  ...SWELLING_LEVELS.map((level) => ({ value: level, label: level })),
]

// On touch screens, focusing a text field opens the keyboard unasked.
function usesTouch() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
}

// What screen readers hear when the results change.
function resultsAnnouncement(selectedZone, organized) {
  if (!selectedZone) return ''

  const { all, detailsEntered, consistent, unchecked, differs } = organized
  const base = `${all.length} associated ${all.length === 1 ? 'condition' : 'conditions'} for ${selectedZone.locationName}.`

  if (!detailsEntered) return base

  return `${base} ${consistent.length} consistent, ${unchecked.length > 0 ? `${unchecked.length} could not be compared, ` : ''}${differs.length} differ from an entered detail.`
}

// Puts the cursor in the search after New case or Clear without popping its
// list open over the panel the learner just reset. Typing or the arrow keys
// open it as usual (see LocationSearch's focus handler).
function focusSearchQuietly(input) {
  if (!input) return

  input.dataset.quietFocus = 'true'
  input.focus({ preventScroll: true })
  delete input.dataset.quietFocus
}

function useElementHeight(ref) {
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current

    if (!element) return undefined

    const update = () => setHeight(element.clientHeight)

    update()

    const observer = new ResizeObserver(update)

    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return height
}

export default function App() {
  const [locations, setLocations] = useState([])
  const [pathologies, setPathologies] = useState([])
  const [dataStatus, setDataStatus] = useState('loading')
  const [dataError, setDataError] = useState(null)
  const [dataAttempt, setDataAttempt] = useState(0)

  const [selectedZone, setSelectedZone] = useState(null)
  // Every location at the chosen spot (the chosen one plus overlapping or
  // adjacent ones), offered as "Nearby locations".
  const [spotOptions, setSpotOptions] = useState([])
  const [caseDetails, setCaseDetails] = useState(EMPTY_CASE)
  const [showDebugNodes, setShowDebugNodes] = useState(false)
  const [cameraRequest, setCameraRequest] = useState(null)
  const [focusRequest, setFocusRequest] = useState(0)

  const [sheetState, setSheetState] = useState('compact')
  const [editor, setEditor] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSummoned, setSearchSummoned] = useState(false)
  const [about, setAbout] = useState({ open: false, section: null })
  const [expanded, setExpanded] = useState({ key: '', ids: new Set() })

  const layout = useLayoutMode()
  const finePointer = useFinePointer()
  const keyboard = useKeyboardInset()

  // While the 3D patient can't be loaded, prompts point to the search.
  const modelUnavailable = useSyncExternalStore(
    subscribeToModelProgress,
    () => getModelProgress().phase === 'error',
  )

  const cameraRequestId = useRef(0)
  const lastNonFullSheet = useRef('compact')
  const retryingData = useRef(false)
  const dataRetryButtonRef = useRef(null)
  const returnFocusTo = useRef(null)

  const stageRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchBarRef = useRef(null)
  const sheetRef = useRef(null)
  const editorRef = useRef(null)
  const nameRef = useRef(null)
  const promptRef = useRef(null)
  const resultsHeadingRef = useRef(null)
  const panelBodyRef = useRef(null)

  const stageHeight = useElementHeight(stageRef)
  const wide = layout === 'wide'

  // ---- Data ---------------------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function loadAppData() {
      try {
        setDataStatus('loading')
        setDataError(null)

        if (import.meta.env.DEV && simulateDataError()) {
          throw new Error('Simulated data failure (development only).')
        }

        const [locationRows, pathologyRows] = await Promise.all([
          loadCsv(LOCATION_CSV_PATH),
          loadCsv(PATHOLOGY_CSV_PATH),
        ])

        if (cancelled) return

        const parsedLocations = parseLocationsCsv(locationRows)

        if (parsedLocations.length === 0) {
          throw new Error('No locations were found in locations.csv.')
        }

        setLocations(parsedLocations)

        // Each record keeps its position in the spreadsheet as a stable id
        // (spreadsheet row = id + 2, after the header row).
        setPathologies(
          parsePathologiesCsv(pathologyRows).map((pathology, index) => ({
            ...pathology,
            id: index,
          })),
        )

        setDataStatus('ready')
      } catch (error) {
        if (cancelled) return

        console.error('Failed to load PainMapper data:', error)

        setDataError(
          error instanceof Error
            ? error.message
            : 'The CSV data could not be loaded.',
        )
        setDataStatus('error')
      }
    }

    loadAppData()

    return () => {
      cancelled = true
    }
  }, [dataAttempt])

  // The banner's "Try again" disappears while the data reloads. Afterwards,
  // keyboard focus returns to it if the retry failed, or moves to the start
  // of the panel if it worked.
  useEffect(() => {
    if (dataStatus === 'loading' || !retryingData.current) return

    retryingData.current = false

    if (dataStatus === 'error') {
      dataRetryButtonRef.current?.focus()
    } else if (usesTouch()) {
      promptRef.current?.focus({ preventScroll: true })
    } else {
      focusSearchQuietly(searchInputRef.current)
    }
  }, [dataStatus])

  const zones = useMemo(() => buildZones(locations), [locations])

  // Location names as locations.csv spells them, for the condition records'
  // "Also linked to" lists (a few record cells differ only in letter case).
  const locationSpelling = useMemo(
    () => new Map(locations.map((location) => [location.name.toLowerCase(), location.name])),
    [locations],
  )

  const conditionCounts = useMemo(
    () => new Map(
      locations.map((location) => [
        location.name,
        getDifferentialDiagnoses(pathologies, location.name, ALL_MATCHES).length,
      ]),
    ),
    [locations, pathologies],
  )

  const conditionCountFor = useCallback(
    (name) => conditionCounts.get(name) ?? 0,
    [conditionCounts],
  )

  const locationEntries = useMemo(
    () => buildLocationEntries(locations, zones, conditionCountFor),
    [locations, zones, conditionCountFor],
  )

  const searchIndex = useMemo(
    () => (locationEntries.length > 0 ? buildSearchIndex(locationEntries) : null),
    [locationEntries],
  )

  const organized = useMemo(
    () => organizeConditions(
      selectedZone
        ? getDifferentialDiagnoses(pathologies, selectedZone.locationName, ALL_MATCHES)
        : [],
      caseDetails,
    ),
    [pathologies, selectedZone, caseDetails],
  )

  const counterpart = useMemo(
    () => counterpartZone(selectedZone, zones),
    [selectedZone, zones],
  )

  // For a location with no conditions: nearby locations that have some.
  const nearbySuggestions = useMemo(
    () => spotOptions
      .filter((zone) => zone.id !== selectedZone?.id)
      .map((zone) => ({ zone, count: conditionCountFor(zone.locationName) }))
      .filter(({ count }) => count > 0),
    [spotOptions, selectedZone, conditionCountFor],
  )

  const locationKey = selectedZone?.locationName ?? ''
  const expandedIds = expanded.key === locationKey ? expanded.ids : new Set()

  const toggleExpanded = useCallback((id) => {
    setExpanded((current) => {
      const ids = new Set(current.key === locationKey ? current.ids : [])

      if (ids.has(id)) ids.delete(id)
      else ids.add(id)

      return { key: locationKey, ids }
    })
  }, [locationKey])

  // Each new location starts its results at the top (on a phone panel at
  // the reading size, with its first results in view, as when the panel is
  // opened). Changing a case detail leaves the scroll position alone.
  useEffect(() => {
    if (wide) {
      panelBodyRef.current?.scrollTo({ top: 0 })
      return
    }

    const sheet = sheetRef.current

    if (sheet?.state === 'reading') sheet.revealResults({ smooth: false })
    else sheet?.body?.scrollTo({ top: 0 })
  }, [locationKey, wide])

  // ---- Camera ---------------------------------------------------------------

  const requestCamera = useCallback((request) => {
    cameraRequestId.current += 1
    setCameraRequest({ id: cameraRequestId.current, ...request })
  }, [])

  function frameZone(zone, { mode = 'exact', direction = 'auto-if-hidden' } = {}) {
    requestCamera({
      target: zone.position,
      zone,
      direction,
      frame: frameSizeFor(zone.region),
      frameMode: mode,
    })
  }

  function handleViewCommand(command) {
    switch (command) {
      case 'front':
        requestCamera({ direction: FRONT_DIRECTION })
        break

      case 'back':
        requestCamera({ direction: BACK_DIRECTION })
        break

      case 'zoom-in':
        requestCamera({ zoomBy: ZOOM_STEP })
        break

      case 'zoom-out':
        requestCamera({ zoomBy: 1 / ZOOM_STEP })
        break

      case 'focus':
        if (selectedZone) frameZone(selectedZone)
        break

      case 'whole-body':
        requestCamera({
          target: MODEL_CENTER,
          direction: 'level',
          frame: 'fit',
          resetView: true,
        })
        break

      case 'reset':
        requestCamera({
          target: MODEL_CENTER,
          direction: [...DEFAULT_VIEW_DIRECTION],
          frame: 'fit',
          resetView: true,
        })
        break

      default:
        break
    }
  }

  // ---- Panel size (phones) ----------------------------------------------

  const changeSheet = useCallback((next) => {
    if (next !== 'full') lastNonFullSheet.current = next
    setSheetState(next)
  }, [])

  function expandSheet() {
    changeSheet(sheetState === 'compact' ? 'reading' : 'full')
  }

  function showBody() {
    changeSheet(lastNonFullSheet.current === 'full' ? 'compact' : lastNonFullSheet.current)
  }

  // ---- Selection ----------------------------------------------------------

  // Clicked on the body: the learner can see it, so keep the viewpoint and
  // only move closer if the spot is shown too small.
  const selectFromBody = useCallback((zone, options) => {
    setSelectedZone(zone)
    setSpotOptions(options)
    requestCamera({
      target: zone.position,
      frame: frameSizeFor(zone.region),
      frameMode: 'closer-only',
    })
    setSheetState((state) => (state === 'full' ? 'compact' : state))
  }, [requestCamera])

  // Chosen by name (search, nearby, side switch): turn the patient if the
  // spot is hidden.
  function selectWithoutClicking(zone, { frame = true, keepOptions = false } = {}) {
    setSelectedZone(zone)

    if (!keepOptions) setSpotOptions(nearbyZonesFor(zone, zones))

    if (frame) {
      frameZone(zone)
    } else {
      requestCamera({ target: zone.position, zone, direction: 'auto-if-hidden' })
    }
  }

  function pickFromSearch(zone) {
    summonedFrom.current = null
    selectWithoutClicking(zone)

    if (!wide && sheetState === 'full') changeSheet('compact')

    setFocusRequest((value) => value + 1)
  }

  function chooseZone(zone, source) {
    // A nearby option keeps the same set of options; a side switch gets the
    // options around the other side. Both keep the zoom.
    selectWithoutClicking(zone, { frame: false, keepOptions: source === 'nearby' })

    // The chosen nearby button disappears (it becomes the selection), so
    // move focus to the new location's name. The side switch keeps focus.
    if (source === 'nearby') setFocusRequest((value) => value + 1)
  }

  useEffect(() => {
    if (focusRequest) nameRef.current?.focus({ preventScroll: true })
  }, [focusRequest])

  function focusStart() {
    if (usesTouch()) {
      promptRef.current?.focus({ preventScroll: true })
    } else {
      focusSearchQuietly(searchInputRef.current)
    }
  }

  function clearLocation() {
    setSelectedZone(null)
    setSpotOptions([])
    setEditor(null)
    // Phones: back to the body with the search showing (the full-height
    // list has nothing to show without a location).
    changeSheet('compact')
    handleViewCommand('whole-body')
    window.requestAnimationFrame(focusStart)
  }

  function clearDetails() {
    setCaseDetails(EMPTY_CASE)
    setEditor(null)

    // "Clear details" disappears once nothing is entered: keep focus on the
    // details rather than losing it.
    window.requestAnimationFrame(() => {
      document.querySelector('.detail-chip[data-editor="age"]')?.focus({ preventScroll: true })
    })
  }

  function startNewCase() {
    setSelectedZone(null)
    setSpotOptions([])
    setCaseDetails(EMPTY_CASE)
    setEditor(null)
    setExpanded({ key: '', ids: new Set() })
    changeSheet('compact')
    handleViewCommand('reset')

    panelBodyRef.current?.scrollTo({ top: 0 })
    sheetRef.current?.body?.scrollTo({ top: 0 })

    window.requestAnimationFrame(focusStart)
  }

  // Phones: the control that brought up the tucked-away search (the header
  // button, "Change", "Use the search") gets focus back if the search is
  // closed without a pick.
  const summonedFrom = useRef(null)

  function openSearch(event) {
    summonedFrom.current = event?.currentTarget ?? null
    setSearchSummoned(true)

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true })
    })
  }

  // The search reports when its results open or close. Stable, so it only
  // runs on a real change (an unstable callback re-ran on every render and
  // hid a just-summoned phone search before it could take focus).
  const handleSearchOpenChange = useCallback((open) => {
    setSearchOpen(open)
    if (!open) setSearchSummoned(false)
  }, [])

  // A switch between the phone and wide arrangements (rotating a phone,
  // resizing a window) rebuilds the panel: close a detail editor first, as
  // the control it belongs to is replaced.
  const [layoutSeen, setLayoutSeen] = useState(layout)

  if (layoutSeen !== layout) {
    setLayoutSeen(layout)
    setEditor(null)
  }

  // A location chosen by name before the 3D model finished loading could
  // not be turned towards; frame it once the model is ready.
  const selectedRef = useRef(null)

  useLayoutEffect(() => {
    selectedRef.current = selectedZone
  })

  const handleModelReady = useCallback(() => {
    const zone = selectedRef.current

    if (zone) {
      requestCamera({
        target: zone.position,
        zone,
        direction: 'auto-if-hidden',
        frame: frameSizeFor(zone.region),
        frameMode: 'exact',
      })
    }
  }, [requestCamera])

  // ---- Editors -------------------------------------------------------------

  function openEditor(kind, anchor) {
    returnFocusTo.current = { element: anchor, kind }
    setEditor({ kind, anchor })
  }

  const closeEditor = useCallback(() => {
    setEditor(null)
  }, [])

  // Focus returns to the control that opened the editor once the panel is
  // interactive again (after the render that removes the editor). If that
  // control was replaced (the layout changed), its new copy takes focus.
  useEffect(() => {
    if (editor || !returnFocusTo.current) return

    const { element, kind } = returnFocusTo.current
    const target = element?.isConnected
      ? element
      : document.querySelector(`[data-editor="${kind}"]`)

    returnFocusTo.current = null
    target?.focus({ preventScroll: true })
  }, [editor])

  function updateCase(changes) {
    setCaseDetails((current) => ({ ...current, ...changes }))
  }

  // ---- What the viewer can see -------------------------------------------

  // Phones: the search bar floats over the viewer with the compact panel,
  // except on short screens (landscape), where the header's search button
  // brings it up instead and the body keeps the room.
  const shortStage = stageHeight > 0 && stageHeight < 420
  const searchBarVisible = !wide && !editor
    && ((sheetState === 'compact' && !shortStage) || searchSummoned || searchOpen)

  // A summoned search closed without a pick (Escape, Cancel): focus back to
  // the control that summoned it, unless focus has already moved on. Closed
  // while the bar stays (compact panel), there is nothing to return.
  useEffect(() => {
    if (!summonedFrom.current) return

    if (searchBarVisible) {
      if (!searchSummoned && !searchOpen) summonedFrom.current = null
      return
    }

    const from = summonedFrom.current
    const active = document.activeElement

    summonedFrom.current = null

    if (active && active !== document.body && !searchBarRef.current?.contains(active)) return

    // The header's search button is rebuilt when the bar hides.
    const target = from.isConnected
      ? from
      : document.querySelector('.app-header [aria-label="Find a body location"]')

    target?.focus({ preventScroll: true })
  }, [searchBarVisible, searchSummoned, searchOpen])

  const view = useRef({})
  const chrome = useRef([])

  // What the covers provider (below) needs to know, kept current after
  // every render.
  useLayoutEffect(() => {
    view.current = { wide, searchBarVisible, editorOpen: Boolean(editor) }
  })

  useEffect(() => setViewInsetsProvider((canvasRect) => {
    const state = view.current

    if (state.wide) {
      // The search and toolbar rows (one or two, depending on the width).
      // Looked up once and reused while they stay on the page.
      if (!chrome.current.every((element) => element?.isConnected)) {
        chrome.current = [
          document.querySelector('.viewer-search'),
          document.querySelector('.viewer-toolbar'),
        ]
      }

      let top = 0

      for (const element of chrome.current) {
        if (element) top = Math.max(top, element.getBoundingClientRect().bottom - canvasRect.top)
      }

      return {
        top: top > 0 ? top + 10 : WIDE_TOP_COVER,
        bottom: WIDE_BOTTOM_COVER,
        left: 0,
        right: 0,
      }
    }

    let top = NARROW_CONTROL_ROW

    if (state.searchBarVisible && searchBarRef.current) {
      top += Math.max(0, searchBarRef.current.getBoundingClientRect().bottom - canvasRect.top)
    }

    let bottomEdge = canvasRect.bottom

    const sheetCover = sheetRef.current?.element
    if (sheetCover && !state.editorOpen) {
      bottomEdge = Math.min(bottomEdge, sheetCover.getBoundingClientRect().top)
    }

    if (editorRef.current) {
      bottomEdge = Math.min(bottomEdge, editorRef.current.getBoundingClientRect().top)
    }

    const keyboardTop = window.innerHeight - keyboardInset()
    bottomEdge = Math.min(bottomEdge, keyboardTop)

    return {
      top,
      bottom: Math.max(0, canvasRect.bottom - bottomEdge) + 12,
      left: 0,
      right: 0,
    }
  }), [])

  useEffect(() => registerDevHook('zone', (name, side) => zones.find(
    (zone) => zone.locationName === name && (!side || zone.side === side),
  ) ?? null), [zones])

  useEffect(() => registerDevHook('app', () => ({
    layout,
    sheetState,
    editor: editor?.kind ?? null,
    searchOpen,
    selected: selectedZone?.locationName ?? null,
    side: selectedZone?.side ?? null,
    caseDetails,
    groups: {
      consistent: organized.consistent.length,
      unchecked: organized.unchecked.length,
      differs: organized.differs.length,
      total: organized.all.length,
    },
  })))

  // ---- Rendering ------------------------------------------------------------

  const describe = useCallback((name) => describeLocation(name), [])
  const subtitle = selectedZone ? zoneSubtitle(selectedZone) : ''
  const face = selectedZone && describe(selectedZone.locationName).face === 'back' ? 'back' : 'front'

  const caseInProgress = selectedZone !== null || hasCaseDetails(caseDetails)

  const menuItems = [
    {
      id: 'new-case',
      label: 'Start new case',
      hint: 'Clears the location and details',
      disabled: !caseInProgress,
      onSelect: startNewCase,
    },
    {
      id: 'clear-location',
      label: 'Clear location',
      hint: 'Keeps age, onset and swelling',
      disabled: !selectedZone,
      onSelect: clearLocation,
    },
    {
      id: 'clear-details',
      label: 'Clear case details',
      hint: 'Keeps the location',
      disabled: !hasCaseDetails(caseDetails),
      onSelect: clearDetails,
    },
    { separator: true },
    // The skin (Gray or Original): filled in by the header.
    { slot: 'skin' },
    { separator: true },
    {
      id: 'about',
      label: 'About PainMapper',
      onSelect: () => setAbout({ open: true, section: 'purpose' }),
    },
  ]

  const openAbout = useCallback((section) => setAbout({ open: true, section }), [])

  const search = (
    <div
      ref={searchBarRef}
      className={wide ? 'search-host search-host-wide' : 'search-host search-host-narrow'}
      hidden={!wide && !searchBarVisible}
    >
      <LocationSearch
        layout={layout}
        entries={locationEntries}
        index={searchIndex}
        selectedZone={selectedZone}
        spotOptions={spotOptions}
        disabled={dataStatus !== 'ready'}
        inputRef={searchInputRef}
        describe={describe}
        onPick={pickFromSearch}
        onOpenChange={handleSearchOpenChange}
      />
    </div>
  )

  const dataBanner = dataStatus === 'error' && (
    <div
      className="notice notice-error"
      role="alert"
    >
      <p className="notice-title">
        The location and condition data couldn’t be loaded.
      </p>

      <p className="notice-text">{dataError}</p>

      <button
        ref={dataRetryButtonRef}
        type="button"
        className="button button-primary"
        onClick={() => {
          retryingData.current = true
          setDataAttempt((value) => value + 1)
        }}
      >
        Try again
      </button>
    </div>
  )

  const fullSheet = !wide && sheetState === 'full'

  const locationHeader = (
    <LocationHeader
      zone={selectedZone}
      subtitle={subtitle}
      layout={layout}
      dataStatus={dataStatus}
      modelUnavailable={modelUnavailable}
      nameRef={nameRef}
      promptRef={promptRef}
      leading={fullSheet && selectedZone ? (
        <MiniLocator
          zone={selectedZone}
          face={face}
          variant="thumb"
          label="Show the body"
          onActivate={showBody}
        />
      ) : undefined}
      onChange={openSearch}
      onClear={clearLocation}
      onOpenAbout={openAbout}
    />
  )

  const panelBody = (
    <div className="panel-content">
      {/* Phones show the data-failure notice in the panel header instead,
          where the compact panel cannot hide it. */}
      {wide && dataBanner}

      {selectedZone && (
        <NearbyLocations
          zone={selectedZone}
          spotOptions={spotOptions}
          counterpart={counterpart}
          conditionCountFor={conditionCountFor}
          onChooseZone={chooseZone}
        />
      )}

      <CaseControls
        caseDetails={caseDetails}
        layout={layout}
        onOpenEditor={openEditor}
        onClearDetails={clearDetails}
        onOpenAbout={openAbout}
      />

      <ConditionResults
        selectedZone={selectedZone}
        organized={organized}
        dataStatus={dataStatus}
        modelUnavailable={modelUnavailable}
        nearbySuggestions={nearbySuggestions}
        locationSpelling={locationSpelling}
        expandedIds={expandedIds}
        headingRef={resultsHeadingRef}
        layout={layout}
        onToggleExpanded={toggleExpanded}
        onChooseZone={chooseZone}
        onOpenAbout={openAbout}
      />

      <footer className="panel-footer">
        <p>
          Educational use only · Not for clinical diagnosis ·{' '}
          <button
            type="button"
            className="link-button link-inline"
            onClick={() => openAbout('purpose')}
          >
            About PainMapper
          </button>
        </p>
      </footer>
    </div>
  )

  // "Show body" is always offered at full height (so the body can't be left
  // hidden); "Expand" only once a location is chosen.
  const sheetActions = (selectedZone || fullSheet) && (
    fullSheet ? (
      <button
        type="button"
        className="sheet-action"
        onClick={showBody}
      >
        Show body
        <ChevronIcon size={18} />
      </button>
    ) : (
      <button
        type="button"
        className="sheet-action"
        onClick={expandSheet}
      >
        <ChevronUpIcon size={18} />
        Expand
      </button>
    )
  )

  const editorSubtitle = selectedZone
    ? `${selectedZone.locationName} · ${zoneArea(selectedZone)}`
    : 'No location chosen yet'

  let editorView = null

  if (editor?.kind === 'age') {
    editorView = (
      <AgeEditor
        ref={editorRef}
        layout={layout}
        age={caseDetails.age}
        subtitle={editorSubtitle}
        anchor={editor.anchor}
        keyboardInset={keyboard}
        coarsePointer={!finePointer}
        onChange={(age) => updateCase({ age })}
        onClose={closeEditor}
      />
    )
  } else if (editor?.kind === 'onset') {
    editorView = (
      <ChoiceEditor
        ref={editorRef}
        layout={layout}
        title="Onset"
        subtitle={editorSubtitle}
        anchor={editor.anchor}
        keyboardInset={keyboard}
        value={caseDetails.onset}
        choices={ONSET_CHOICES}
        onChange={(onset) => updateCase({ onset })}
        onClose={closeEditor}
      />
    )
  } else if (editor?.kind === 'swelling') {
    editorView = (
      <ChoiceEditor
        ref={editorRef}
        layout={layout}
        title="Swelling"
        subtitle={editorSubtitle}
        anchor={editor.anchor}
        keyboardInset={keyboard}
        value={caseDetails.swelling}
        choices={SWELLING_CHOICES}
        note="Reference only: shown beside each condition’s recorded swelling and never compared. What the dataset’s swelling column means is awaiting clinical review."
        onChange={(swelling) => updateCase({ swelling })}
        onClose={closeEditor}
      />
    )
  }

  const selectionLabel = selectedZone
    ? {
      name: selectedZone.locationName,
      area: wide || editor ? zoneArea(selectedZone) : null,
    }
    : null

  // The small body picture above the phone panel, only where the uncovered
  // stage has room for it below the side labels (and the search bar, when it
  // shows): on short phones it would cover the labels, the selection and the
  // Front/Back control. Whole body stays in the toolbar.
  const showLocatorAbove = sheetState !== 'full'
  const locatorMinRoom = searchBarVisible ? 300 : 236

  // Changes in the results are announced from outside the panel, which is
  // inert while an editor is open on phones.
  const announcement = dataStatus === 'ready'
    ? resultsAnnouncement(selectedZone, organized)
    : ''

  return (
    <div
      className="app"
      data-layout={layout}
      data-sheet={wide ? undefined : sheetState}
      data-search={searchOpen ? 'open' : undefined}
      data-searchbar={!wide && searchBarVisible ? 'shown' : undefined}
      style={{ '--keyboard-inset': `${keyboard}px` }}
    >
      <AppHeader
        layout={layout}
        menuItems={menuItems}
        showSearchButton={!wide && !searchBarVisible && !editor}
        inert={Boolean(editor)}
        onSearch={openSearch}
        onOpenAbout={openAbout}
      />

      <main
        ref={stageRef}
        className="stage"
      >
        {/* Phones: the search comes first in reading and Tab order. */}
        {!wide && search}

        {/* Keyed, so the 3D view is moved rather than rebuilt when the
            arrangement changes. Like the header and the panel, it is inert
            while a detail editor (a modal dialog) is open. */}
        <div
          key="viewer"
          className="viewer-area"
          inert={Boolean(editor)}
        >
          <ViewerPanel
            zones={zones}
            selectedZone={selectedZone}
            selectionLabel={selectionLabel}
            showDebugNodes={showDebugNodes}
            cameraRequest={cameraRequest}
            layout={layout}
            finePointer={finePointer}
            covered={fullSheet}
            searchSlot={wide ? search : null}
            locatorFace={face}
            onBodySelect={selectFromBody}
            onViewCommand={handleViewCommand}
            onUseSearch={openSearch}
            onModelReady={handleModelReady}
          />
        </div>

        {wide ? (
          <aside
            className="panel"
            aria-label="Location, case details and associated conditions"
            inert={Boolean(editor)}
          >
            <div className="panel-header">{locationHeader}</div>

            <div
              ref={panelBodyRef}
              className="panel-body"
            >
              {panelBody}
            </div>
          </aside>
        ) : (
          <BottomSheet
            ref={sheetRef}
            state={sheetState}
            onStateChange={changeSheet}
            stageHeight={stageHeight}
            hidden={Boolean(editor)}
            label="Location, case details and associated conditions"
            header={{
              actions: sheetActions,
              content: (
                <>
                  {dataBanner}
                  {locationHeader}
                </>
              ),
            }}
            aboveMinRoom={locatorMinRoom}
            above={selectedZone && showLocatorAbove ? (
              <MiniLocator
                zone={selectedZone}
                face={face}
                label="Show the whole body"
                onActivate={() => handleViewCommand('whole-body')}
              />
            ) : null}
          >
            {panelBody}
          </BottomSheet>
        )}

        {editorView}
      </main>

      <AboutDialog
        open={about.open}
        section={about.section}
        locationCount={locations.length}
        conditionCount={pathologies.length}
        showDebugNodes={showDebugNodes}
        onShowDebugNodesChange={setShowDebugNodes}
        onClose={() => setAbout({ open: false, section: null })}
      />

      <p
        className="visually-hidden"
        aria-live="polite"
      >
        {announcement}
      </p>
    </div>
  )
}
