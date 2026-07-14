import { Canvas } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Vector3 } from 'three'
import AnatomicalZones from './components/AnatomicalZones'
import CameraControls from './components/CameraControls'
import Model from './components/Model'
import Sidebar from './components/Sidebar'
import {
  getDifferentialDiagnoses,
  loadCsv,
  LOCATION_CSV_PATH,
  parseLocationsCsv,
  parsePathologiesCsv,
  PATHOLOGY_CSV_PATH,
} from './data/csvLoader'
import './App.css'

const MODEL_CENTER = new Vector3(0, -0.45, 0)

export default function App() {
  const [locations, setLocations] = useState([])
  const [pathologies, setPathologies] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [showDebugNodes, setShowDebugNodes] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadAppData() {
      try {
        setLoading(true)
        setDataError(null)

        const [
          locationRows,
          pathologyRows,
        ] = await Promise.all([
          loadCsv(LOCATION_CSV_PATH),
          loadCsv(PATHOLOGY_CSV_PATH),
        ])

        if (cancelled) return

        setLocations(
          parseLocationsCsv(locationRows),
        )

        setPathologies(
          parsePathologiesCsv(pathologyRows),
        )
      } catch (error) {
        if (cancelled) return

        console.error(
          'Failed to load Pain Mapper data:',
          error,
        )

        setDataError(
          error instanceof Error
            ? error.message
            : 'The CSV data could not be loaded.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAppData()

    return () => {
      cancelled = true
      document.body.style.cursor = 'default'
    }
  }, [])

  const differentialDiagnoses = useMemo(
    () =>
      getDifferentialDiagnoses(
        pathologies,
        selectedZone?.locationName,
        3,
      ),
    [pathologies, selectedZone],
  )

  const focusTarget = useMemo(() => {
    if (!selectedZone?.position) {
      return MODEL_CENTER
    }

    return new Vector3(
      ...selectedZone.position,
    )
  }, [selectedZone])

  function clearSelection() {
    setSelectedZone(null)
  }

  return (
    <main className="app-shell">
      <section className="viewer-panel">
        <Canvas
          camera={{
            position: [0, 0, 5.5],
            fov: 50,
          }}
          onPointerMissed={clearSelection}
        >
          <color
            attach="background"
            args={['#282c31']}
          />

          <ambientLight intensity={1.4} />

          <directionalLight
            position={[4, 5, 4]}
            intensity={1.5}
          />

          <Model />

          <AnatomicalZones
            locations={locations}
            selectedZone={selectedZone}
            showDebugNodes={showDebugNodes}
            onSelect={setSelectedZone}
          />

          <CameraControls
            focusTarget={focusTarget}
          />
        </Canvas>
      </section>

      <Sidebar
        selectedZone={selectedZone}
        differentialDiagnoses={
          differentialDiagnoses
        }
        showDebugNodes={showDebugNodes}
        loading={loading}
        dataError={dataError}
        locationCount={locations.length}
        pathologyCount={pathologies.length}
        onShowDebugNodesChange={
          setShowDebugNodes
        }
      />
    </main>
  )
}