import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useState } from 'react'
import { useGLTF } from '@react-three/drei'
import './App.css'

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
  const [selectedLocation, setSelectedLocation] = useState('none')

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'grid', gridTemplateColumns: '1fr 320px' }}>
      <div>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 5, 4]} intensity={1.5} />
          <Model onSelect={setSelectedLocation} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      <div style={{
        padding: '20px',
        borderLeft: '1px solid #ddd',
        fontFamily: 'Arial, sans-serif',
        background: '#fafafa'
      }}>
        <h2>Pain Mapper Prototype</h2>
        <p><strong>Selected location:</strong> {selectedLocation}</p>
        <p>This is the earliest prototype.</p>
        <p>Right now it lets you:</p>
        <ul>
          <li>rotate the patient</li>
          <li>zoom in and out</li>
          <li>click a body location</li>
        </ul>
        <p>Next, you will replace these simple markers with real pain zones on your actual 3D model.</p>
      </div>
    </div>
  )
}