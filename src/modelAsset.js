import { simulateModelError } from './devSimulation'

// The 3D patient model (about 54 MB, mostly skin and hair textures).
// import.meta.env.DEV is false in production builds, so this branch is removed.
export const MODEL_PATH = import.meta.env.DEV && simulateModelError()
  ? `${import.meta.env.BASE_URL}models/missing-model.glb`
  : `${import.meta.env.BASE_URL}models/model.glb`

export const MODEL_SIZE_LABEL = 'about 54 MB'
