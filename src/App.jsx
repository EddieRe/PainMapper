import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useState } from 'react'
import { useGLTF } from '@react-three/drei'
import './App.css'

const zoneLabels = {
  left_knee_anterior: 'Left knee - anterior',
  left_knee_medial: 'Left knee - medial',
  left_knee_lateral: 'Left knee - lateral',
  left_knee_distal_it_band: 'Left knee - distal IT band',
  left_knee_tibial_tubercle: 'Left knee - tibial tubercle',
  right_knee_anterior: 'Right knee - anterior',
  right_knee_medial: 'Right knee - medial',
  right_knee_lateral: 'Right knee - lateral',
  right_knee_distal_it_band: 'Right knee - distal IT band',
  right_knee_tibial_tubercle: 'Right knee - tibial tubercle',
}

function Model() {
  const { scene } = useGLTF('/models/model.glb')

  return (
    <primitive 
      object={scene} 
      scale={1.2} 
      position={[0, -1.5, 0]} 
    />
  )
}

function Zone({ id, position, scale = [1, 1, 1], color = 'orange', selected, onSelect }) {
  return (
    <mesh
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
    >
      <sphereGeometry args={[0.12, 24, 24]} />
      <meshStandardMaterial
        color={selected ? 'red' : color}
        transparent
        opacity={0.45}
      />
    </mesh>
  )
}

function KneeZones({ selectedZone, onSelect }) {
  return (
    <group>
      {/* Patient LEFT knee zones (viewer sees these on the right side) */}
      <Zone
        id="left_knee_anterior"
        position={[0.18, -1.08, 0.08]}
        scale={[1.0, 0.8, 0.8]}
        selected={selectedZone === 'left_knee_anterior'}
        onSelect={onSelect}
      />

      <Zone
        id="left_knee_medial"
        position={[0.10, -1.08, -0.02]}
        scale={[0.8, 0.8, 0.8]}
        selected={selectedZone === 'left_knee_medial'}
        onSelect={onSelect}
      />

      <Zone
        id="left_knee_lateral"
        position={[0.26, -1.08, -0.02]}
        scale={[0.8, 0.8, 0.8]}
        selected={selectedZone === 'left_knee_lateral'}
        onSelect={onSelect}
      />

      <Zone
        id="left_knee_distal_it_band"
        position={[0.30, -0.96, 0.00]}
        scale={[0.7, 0.7, 0.7]}
        selected={selectedZone === 'left_knee_distal_it_band'}
        onSelect={onSelect}
      />

      <Zone
        id="left_knee_tibial_tubercle"
        position={[0.18, -1.24, 0.06]}
        scale={[0.7, 0.7, 0.7]}
        selected={selectedZone === 'left_knee_tibial_tubercle'}
        onSelect={onSelect}
      />

      {/* Patient RIGHT knee zones (viewer sees these on the left side) */}
      <Zone
        id="right_knee_anterior"
        position={[-0.18, -1.08, 0.08]}
        scale={[1.0, 0.8, 0.8]}
        selected={selectedZone === 'right_knee_anterior'}
        onSelect={onSelect}
      />

      <Zone
        id="right_knee_medial"
        position={[-0.10, -1.08, -0.02]}
        scale={[0.8, 0.8, 0.8]}
        selected={selectedZone === 'right_knee_medial'}
        onSelect={onSelect}
      />

      <Zone
        id="right_knee_lateral"
        position={[-0.26, -1.08, -0.02]}
        scale={[0.8, 0.8, 0.8]}
        selected={selectedZone === 'right_knee_lateral'}
        onSelect={onSelect}
      />

      <Zone
        id="right_knee_distal_it_band"
        position={[-0.30, -0.96, 0.00]}
        scale={[0.7, 0.7, 0.7]}
        selected={selectedZone === 'right_knee_distal_it_band'}
        onSelect={onSelect}
      />

      <Zone
        id="right_knee_tibial_tubercle"
        position={[-0.18, -1.24, 0.06]}
        scale={[0.7, 0.7, 0.7]}
        selected={selectedZone === 'right_knee_tibial_tubercle'}
        onSelect={onSelect}
      />
    </group>
  )
}

function BodyMarker({ position, label, onSelect }) {
  return (
    <mesh position={position} onClick={(e) => {
      e.stopPropagation()
      onSelect(label)
    }}>
      <sphereGeometry args={[0.08, 24, 24]} />
      <meshStandardMaterial />
      <Html distanceFactor={10}>
        <div style={{
          background: 'white',
          padding: '2px 6px',
          borderRadius: '6px',
          fontSize: '12px',
          border: '1px solid #ccc',
          whiteSpace: 'nowrap'
        }}>
          {label}
        </div>
      </Html>
    </mesh>
  )
}

export default function App() {
  const [selectedZone, setSelectedZone] = useState(null)

  return (
    <div className="app-shell">
      <div className="viewer-panel">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 5, 4]} intensity={1.5} />

          <Model />
          <KneeZones selectedZone={selectedZone} onSelect={setSelectedZone} />

          <OrbitControls
            enablePan={false}
            target={[0, -0.8, 0]}
          />
        </Canvas>
      </div>

      <aside className="sidebar">
        <h2>Pain Mapper</h2>
        <p><strong>Selected zone:</strong> {selectedZone ?? 'none'}</p>
      </aside>
    </div>
  )
}