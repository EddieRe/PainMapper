import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useState } from 'react'
import './App.css'

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

function SimpleBody({ onSelect }) {
  return (
    <group>
      {/* torso */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.45, 1.6, 8, 16]} />
        <meshStandardMaterial />
      </mesh>

      {/* head */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial />
      </mesh>

      {/* left arm */}
      <mesh position={[-0.7, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, 1.0, 8, 16]} />
        <meshStandardMaterial />
      </mesh>

      {/* right arm */}
      <mesh position={[0.7, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, 1.0, 8, 16]} />
        <meshStandardMaterial />
      </mesh>

      {/* left leg */}
      <mesh position={[-0.22, -1.35, 0]}>
        <capsuleGeometry args={[0.14, 1.3, 8, 16]} />
        <meshStandardMaterial />
      </mesh>

      {/* right leg */}
      <mesh position={[0.22, -1.35, 0]}>
        <capsuleGeometry args={[0.14, 1.3, 8, 16]} />
        <meshStandardMaterial />
      </mesh>

      {/* clickable regions */}
      <BodyMarker position={[-0.55, 0.65, 0.18]} label="left shoulder" onSelect={onSelect} />
      <BodyMarker position={[0.55, 0.65, 0.18]} label="right shoulder" onSelect={onSelect} />
      <BodyMarker position={[-0.42, 0.1, 0.18]} label="left wrist" onSelect={onSelect} />
      <BodyMarker position={[0.42, 0.1, 0.18]} label="right wrist" onSelect={onSelect} />
      <BodyMarker position={[-0.22, -0.75, 0.18]} label="left hip" onSelect={onSelect} />
      <BodyMarker position={[0.22, -0.75, 0.18]} label="right hip" onSelect={onSelect} />
      <BodyMarker position={[-0.22, -1.35, 0.18]} label="left knee" onSelect={onSelect} />
      <BodyMarker position={[0.22, -1.35, 0.18]} label="right knee" onSelect={onSelect} />
      <BodyMarker position={[-0.22, -2.0, 0.18]} label="left ankle/foot" onSelect={onSelect} />
      <BodyMarker position={[0.22, -2.0, 0.18]} label="right ankle/foot" onSelect={onSelect} />
      <BodyMarker position={[0, -0.2, -0.22]} label="back" onSelect={onSelect} />
      <BodyMarker position={[-0.62, 0.28, 0.18]} label="left hand" onSelect={onSelect} />
      <BodyMarker position={[0.62, 0.28, 0.18]} label="right hand" onSelect={onSelect} />
    </group>
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
          <SimpleBody onSelect={setSelectedLocation} />
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