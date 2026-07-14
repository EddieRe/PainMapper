import { useGLTF } from '@react-three/drei'

const MODEL_PATH = '/models/model.glb'

export default function Model() {
  const { scene } = useGLTF(MODEL_PATH)

  return (
    <primitive
      object={scene}
      scale={1.2}
      position={[0, -1.5, 0]}
    />
  )
}

useGLTF.preload(MODEL_PATH)