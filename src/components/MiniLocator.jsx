import { useLocatorSnapshot } from '../viewer/locatorStore'

/*
 * A small picture of the whole patient with a dot on the selected location,
 * for orientation while the 3D view is zoomed in or hidden. The picture is
 * rendered from the 3D model itself (front or back), so the dot sits where
 * the location really is.
 *
 * Shown as a button when `onActivate` is given (e.g. "Show the whole body").
 * Purely decorative otherwise.
 */

function sideLetters(face) {
  return face === 'back' ? ['L', 'R'] : ['R', 'L']
}

export default function MiniLocator({
  zone,
  face = 'front',
  variant = 'corner',
  label,
  onActivate,
}) {
  const snapshot = useLocatorSnapshot()
  const picture = snapshot?.[face]

  if (!picture) return null

  const point = zone ? snapshot.project(zone.position, face) : null
  const [leftLetter, rightLetter] = sideLetters(face)

  const content = (
    <>
      <span
        className="mini-locator-figure"
        style={{ aspectRatio: `${picture.aspect}` }}
      >
        <img
          src={picture.url}
          alt=""
          draggable="false"
        />

        {point && (
          <span
            className="mini-locator-dot"
            style={{ left: `${point.u * 100}%`, top: `${point.v * 100}%` }}
          />
        )}
      </span>

      {variant === 'corner' && (
        <span
          className="mini-locator-sides"
          aria-hidden="true"
        >
          <span>{leftLetter}</span>
          {face === 'back' && <span className="mini-locator-face">Back</span>}
          <span>{rightLetter}</span>
        </span>
      )}
    </>
  )

  if (!onActivate) {
    return (
      <span
        className={`mini-locator mini-locator-${variant}`}
        aria-hidden="true"
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`mini-locator mini-locator-${variant}`}
      aria-label={label}
      title={label}
      onClick={onActivate}
    >
      {content}
    </button>
  )
}

/*
 * A square crop of the miniature around a location, for search results.
 * Falls back to a plain tile until the model has loaded.
 */
export function LocatorThumb({ zone, face = 'front' }) {
  const snapshot = useLocatorSnapshot()
  const picture = snapshot?.[face]

  if (!picture || !zone) {
    return (
      <span
        className="locator-thumb is-placeholder"
        aria-hidden="true"
      />
    )
  }

  const { u, v } = snapshot.project(zone.position, face)
  // Show a window 34% of the figure's width wide, centred on the location
  // where possible (sizes in tile widths; the tile is square).
  const share = 0.34
  const imageWidth = 1 / share
  const imageHeight = imageWidth / picture.aspect
  const clamp01 = (value) => Math.min(1, Math.max(0, value))
  const px = clamp01(((u * imageWidth) - 0.5) / (imageWidth - 1))
  const py = imageHeight > 1
    ? clamp01(((v * imageHeight) - 0.5) / (imageHeight - 1))
    : 0.5
  // Where the location ends up inside the tile after clamping at the edges.
  const dotX = u * imageWidth + px * (1 - imageWidth)
  const dotY = v * imageHeight + py * (1 - imageHeight)

  return (
    <span
      className="locator-thumb"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${picture.url})`,
        backgroundSize: `${imageWidth * 100}% auto`,
        backgroundPosition: `${px * 100}% ${py * 100}%`,
      }}
    >
      <span
        className="locator-thumb-dot"
        style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%` }}
      />
    </span>
  )
}
