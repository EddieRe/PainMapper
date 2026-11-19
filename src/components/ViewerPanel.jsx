import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { registerDevHook } from '../devHooks'
import { DEFAULT_CAMERA_POSITION } from '../interaction/viewDirection'
import { MODEL_SIZE_LABEL } from '../modelAsset'
import {
  getModelProgress,
  retryModel,
  subscribeToModelProgress,
} from '../modelLoader'
import { BASE_FOV_DEGREES } from '../viewer/framing'
import { createLocatorSnapshots } from '../viewer/locatorSnapshot'
import { setLocatorSnapshot } from '../viewer/locatorStore'
import { forgetOriginalModel, getOriginalSkinStatus } from '../viewer/originalSkin'
import {
  chooseSkin,
  getSkinChoice,
  resetSkinChoice,
  retryOriginalSkin,
  setSkinAvailable,
  subscribeToSkinChoice,
} from '../viewer/skinChoice'
import BodyInteraction from './BodyInteraction'
import CameraRig from './CameraRig'
import FloorShadow from './FloorShadow'
import {
  AlertIcon,
  FrameSelectionIcon,
  HandIcon,
  MinusIcon,
  MouseIcon,
  PlusIcon,
  WholeBodyIcon,
} from './icons'
import MiniLocator from './MiniLocator'
import SelectionTracker from './SelectionTracker'
import SkinControl from './SkinControl'
import ViewerLights from './ViewerLights'

/*
 * The 3D patient: the canvas, its controls and labels, and the loading and
 * failure states. Which patient side appears on each screen edge follows
 * the viewing direction (radiology convention: the patient's own right and
 * left).
 */
const ORIENTATION = {
  front: {
    view: 'Front view',
    left: "Patient's right",
    right: "Patient's left",
  },
  back: {
    view: 'Back view',
    left: "Patient's left",
    right: "Patient's right",
  },
  left: {
    view: "Patient's left side",
    left: 'Front',
    right: 'Back',
  },
  right: {
    view: "Patient's right side",
    left: 'Back',
    right: 'Front',
  },
}

// Created once: R3F compares camera options between renders.
const CAMERA_OPTIONS = {
  position: [...DEFAULT_CAMERA_POSITION],
  fov: BASE_FOV_DEGREES,
  near: 0.03,
  far: 60,
  manual: true,
}

const GL_OPTIONS = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('The 3D patient model could not be loaded:', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function megabytes(bytes) {
  return (bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)
}

function LoadingOverlay() {
  const progress = useSyncExternalStore(
    subscribeToModelProgress,
    getModelProgress,
  )

  const determinate = progress.phase === 'downloading' && progress.total > 0
  const percent = determinate
    ? Math.min(100, Math.round((progress.received / progress.total) * 100))
    : null

  let detail = 'Starting download…'

  if (progress.phase === 'processing' || progress.phase === 'ready') {
    detail = 'Preparing the model…'
  } else if (determinate) {
    detail = `${megabytes(progress.received)} of ${megabytes(progress.total)} MB · ${percent}%`
  } else if (progress.received > 0) {
    detail = `${megabytes(progress.received)} MB received`
  }

  return (
    <div
      className="viewer-overlay"
      role="status"
    >
      <div className="status-card">
        <p className="status-title">Loading the 3D patient</p>

        <div
          className={`progress${determinate ? '' : ' is-indeterminate'}`}
          role="progressbar"
          aria-label="3D patient download"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <span
            className="progress-bar"
            style={determinate ? { width: `${percent}%` } : undefined}
          />
        </div>

        <p className="status-detail">{detail}</p>

        <p className="status-hint">
          The model is {MODEL_SIZE_LABEL}. You can search for a location
          while it loads.
        </p>
      </div>
    </div>
  )
}

// Highest pixel density used for the 3D view (sharp on phones without
// rendering 9 pixels per CSS pixel on 3× screens).
const MAX_DPR = 2
const MIN_DPR = 1

function startingDpr() {
  return typeof window === 'undefined'
    ? 1
    : Math.min(MAX_DPR, Math.max(MIN_DPR, window.devicePixelRatio || 1))
}

/*
 * The scene's root never moves. Without this, three.js recomputes the
 * world transform of every object (the patient, its 101 skeleton joints,
 * 173 location spheres) on every frame; with it, only things that move
 * (the camera-following lights, labels) update themselves.
 */
function freezeSceneRoot({ scene }) {
  scene.matrixAutoUpdate = false
  scene.updateMatrix()
}

// Development read-out of the renderer's work per frame (for measurements).
function RendererReadout() {
  const gl = useThree((state) => state.gl)

  useEffect(() => registerDevHook('renderer', () => ({
    dpr: gl.getPixelRatio(),
    drawingBuffer: [gl.domElement.width, gl.domElement.height],
    calls: gl.info.render.calls,
    triangles: gl.info.render.triangles,
    textures: gl.info.memory.textures,
    geometries: gl.info.memory.geometries,
    programs: gl.info.programs?.length ?? null,
  })), [gl])

  return null
}

/*
 * Makes the miniature body pictures once the model is ready (rendered
 * offscreen with the same renderer, so no second 3D context is needed).
 */
function LocatorSnapshotter({ modelGroup }) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    if (!modelGroup) return undefined

    let cancelled = false

    // Let the first frame of the patient render before the extra work.
    const timer = window.setTimeout(() => {
      if (cancelled) return

      try {
        setLocatorSnapshot(createLocatorSnapshots(gl, modelGroup))
      } catch (error) {
        console.warn('The miniature body picture could not be made:', error)
      }
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [gl, modelGroup])

  return null
}

export default function ViewerPanel({
  zones,
  selectedZone,
  selectionLabel,
  showDebugNodes,
  cameraRequest,
  layout,
  finePointer,
  covered = false,
  searchSlot,
  locatorFace,
  onBodySelect,
  onViewCommand,
  onUseSearch,
  onOrientationChange,
  onModelReady,
}) {
  const [orientation, setOrientation] = useState('front')
  const [modelStatus, setModelStatus] = useState('loading')
  const [modelGroup, setModelGroup] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [interacted, setInteracted] = useState(false)
  // Skin: Gray (default, not saved) or Original; originalAttempt restarts a
  // failed preparation ("Try again"). Shared with the "•••" menu's Skin
  // entry (viewer/skinChoice.js).
  const {
    appearance,
    attempt: originalAttempt,
    changed: skinChanged,
  } = useSyncExternalStore(subscribeToSkinChoice, getSkinChoice)
  // Lowered step by step if the device can't keep a smooth frame rate,
  // raised again when it can (drei's PerformanceMonitor).
  const [dpr, setDpr] = useState(startingDpr)
  const overlayRef = useRef(null)
  const retryButtonRef = useRef(null)
  const retrying = useRef(false)

  const handleModelReady = useCallback(({ group }) => {
    setModelGroup(group)
    setModelStatus('ready')
    onModelReady?.()
  }, [onModelReady])

  const handleModelError = useCallback(() => {
    setModelStatus('error')
  }, [])

  const handleOrientation = useCallback((next) => {
    setOrientation(next)
    onOrientationChange?.(next)
  }, [onOrientationChange])

  const handleUserMove = useCallback(() => setInteracted(true), [])

  // The skin can be changed (here and from the "•••" menu) only while the
  // 3D patient is ready and in view (not behind the phone panel at full
  // height); a 3D view that goes away leaves Gray behind.
  useEffect(() => {
    setSkinAvailable(modelStatus === 'ready' && !covered)

    return () => setSkinAvailable(false)
  }, [modelStatus, covered])

  useEffect(() => resetSkinChoice, [])

  // Development read-out for automated checks: the skin asked for, what is
  // shown, and the preparation's status (read when asked).
  useEffect(() => registerDevHook('skin', () => {
    const appearanceStatus = getOriginalSkinStatus()

    return {
      appearance,
      originalAttempt,
      shownAppearance: appearance === 'original' && appearanceStatus.phase === 'ready' ? 'original' : 'neutral',
      appearanceStatus,
    }
  }), [appearance, originalAttempt])

  // "Try again" disappears while the model reloads. If the retry fails
  // again, put keyboard focus back on it rather than leaving it on the page.
  useEffect(() => {
    if (modelStatus === 'loading' || !retrying.current) return

    retrying.current = false

    if (modelStatus === 'error') retryButtonRef.current?.focus()
  }, [modelStatus])

  function retry() {
    retrying.current = true
    retryModel()
    setModelStatus('loading')
    setModelGroup(null)
    setAttempt((value) => value + 1)
    // A reloaded model starts Gray, as every load does, and nothing made for
    // the old model is kept.
    forgetOriginalModel()
    resetSkinChoice()
  }

  const labels = ORIENTATION[orientation]
  const ready = modelStatus === 'ready'
  const wide = layout === 'wide'

  return (
    <section
      className={`viewer viewer-${layout}`}
      aria-label="3D patient"
      // Phones, list at full height: the viewer is completely covered, so
      // its controls leave the Tab order too.
      inert={covered}
    >
      <div className="viewer-backdrop" aria-hidden="true" />

      <div
        className="viewer-canvas"
        onPointerDown={() => setInteracted(true)}
      >
        <ModelErrorBoundary
          key={attempt}
          onError={handleModelError}
        >
          <Canvas
            camera={CAMERA_OPTIONS}
            gl={GL_OPTIONS}
            dpr={dpr}
            onCreated={freezeSceneRoot}
          >
            <PerformanceMonitor
              flipflops={4}
              onDecline={() => setDpr((value) => Math.max(MIN_DPR, Math.round((value - 0.25) * 4) / 4))}
              onIncline={() => setDpr((value) => Math.min(startingDpr(), Math.round((value + 0.25) * 4) / 4))}
              onFallback={() => setDpr(MIN_DPR)}
            />

            <RendererReadout />

            <ViewerLights />

            <Suspense fallback={null}>
              <BodyInteraction
                zones={zones}
                selectedZone={selectedZone}
                showDebugNodes={showDebugNodes}
                hoverEnabled={finePointer}
                viewRequestId={cameraRequest?.id}
                onSelect={onBodySelect}
                onModelReady={handleModelReady}
                appearance={appearance}
                originalAttempt={originalAttempt}
              />

              <FloorShadow />
            </Suspense>

            <CameraRig
              request={cameraRequest}
              onOrientationChange={handleOrientation}
              onUserMove={handleUserMove}
            />

            <SelectionTracker
              zone={ready ? selectedZone : null}
              overlayRef={overlayRef}
            />

            <LocatorSnapshotter modelGroup={modelGroup} />
          </Canvas>
        </ModelErrorBoundary>
      </div>

      {/* Wide screens: the search comes first in the focus order and sits on
          its own layer (z-index) above the viewer's controls and label, so
          its open results are never covered. */}
      {wide && searchSlot && (
        <div className="viewer-search">{searchSlot}</div>
      )}

      {/* The selected location's label, kept on the body by SelectionTracker. */}
      <div
        ref={overlayRef}
        className="selection-overlay"
        data-visible="false"
        aria-hidden="true"
      >
        <svg className="selection-leader">
          <line x1="0" y1="0" x2="0" y2="0" />
        </svg>

        <span className="selection-dot" />

        {selectionLabel && (
          <span className="selection-label">
            <span className="selection-label-name">{selectionLabel.name}</span>
            {selectionLabel.area && (
              <>
                <span className="selection-label-separator">{' · '}</span>
                <span className="selection-label-area">{selectionLabel.area}</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="viewer-chrome">
        {ready && (
          <>
            <div
              className="viewer-toolbar"
              role="group"
              aria-label="3D view"
            >
              <div
                className="segmented"
                role="group"
                aria-label="Side of the patient shown"
              >
                <button
                  type="button"
                  className="segmented-option"
                  aria-pressed={orientation === 'front'}
                  onClick={() => onViewCommand('front')}
                >
                  Front
                </button>

                <button
                  type="button"
                  className="segmented-option"
                  aria-pressed={orientation === 'back'}
                  onClick={() => onViewCommand('back')}
                >
                  Back
                </button>
              </div>

              {wide && (
                <>
                  <span
                    className="toolbar-divider"
                    aria-hidden="true"
                  />

                  <button
                    type="button"
                    className="viewer-button"
                    onClick={() => onViewCommand('whole-body')}
                  >
                    <WholeBodyIcon size={20} />
                    Whole body
                  </button>
                </>
              )}
            </div>

            {!wide && (
              <button
                type="button"
                className="viewer-icon-button viewer-whole-body"
                aria-label="Show the whole body"
                title="Whole body"
                onClick={() => onViewCommand('whole-body')}
              >
                <WholeBodyIcon size={22} />
              </button>
            )}

            <p
              className="visually-hidden"
              aria-live="polite"
            >
              {labels.view}
            </p>

            <span
              className="edge-label edge-label-left"
              aria-hidden="true"
            >
              {labels.left}
            </span>

            <span
              className="edge-label edge-label-right"
              aria-hidden="true"
            >
              {labels.right}
            </span>

            {wide && (
              <div
                className="zoom-controls"
                role="group"
                aria-label="Zoom"
              >
                <button
                  type="button"
                  className="viewer-icon-button"
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={() => onViewCommand('zoom-in')}
                >
                  <PlusIcon size={22} />
                </button>

                <button
                  type="button"
                  className="viewer-icon-button"
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => onViewCommand('zoom-out')}
                >
                  <MinusIcon size={22} />
                </button>

                <button
                  type="button"
                  className="viewer-icon-button"
                  aria-label="Centre the selected location"
                  title="Centre the selected location"
                  disabled={!selectedZone}
                  onClick={() => onViewCommand('focus')}
                >
                  <FrameSelectionIcon size={22} />
                </button>
              </div>
            )}

            {/* Bottom-right corner (wide: under the zoom buttons; phones:
                just above the panel, opposite the small body figure). */}
            <SkinControl
              appearance={appearance}
              changed={skinChanged}
              onChoose={chooseSkin}
              onRetry={retryOriginalSkin}
            />

            {wide && selectedZone && (
              <div className="viewer-locator">
                <MiniLocator
                  zone={selectedZone}
                  face={locatorFace}
                  label="Show the whole body"
                  onActivate={() => onViewCommand('whole-body')}
                />
              </div>
            )}

            {wide && (
              <p
                className={`viewer-hint${interacted ? ' is-dismissed' : ''}`}
                aria-hidden="true"
              >
                {finePointer ? <MouseIcon size={18} /> : <HandIcon size={18} />}
                <span>
                  {finePointer
                    ? 'Drag to rotate · Scroll to zoom'
                    : 'Drag to rotate · Pinch to zoom'}
                </span>
              </p>
            )}
          </>
        )}
      </div>

      {modelStatus === 'loading' && <LoadingOverlay />}

      {modelStatus === 'error' && (
        <div
          className="viewer-overlay"
          role="alert"
        >
          <div className="status-card status-card-error">
            <AlertIcon
              className="status-icon"
              size={22}
            />

            <p className="status-title">
              The 3D patient couldn’t be loaded
            </p>

            {/* Phones with a location chosen: shorter, to fit above the
                panel (the conditions are already showing). */}
            {(wide || !selectedZone) && (
              <p className="status-hint">
                Check the connection and try again. You can still choose a
                location with the search and review its conditions.
              </p>
            )}

            <div className="status-actions">
              <button
                ref={retryButtonRef}
                type="button"
                className="button button-primary"
                onClick={retry}
              >
                Try again
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={onUseSearch}
              >
                Use the search
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
