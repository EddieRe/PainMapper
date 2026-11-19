/*
 * Small inline icons (decorative: always paired with visible text or an
 * aria-label on the control that contains them).
 */

function Icon({ children, size = 16, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  )
}

export function ChevronIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  )
}

export function DiffersIcon(props) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  )
}

export function UnknownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 12h12" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  )
}

export function ResetIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Icon>
  )
}

export function PersonFrontIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v7" />
      <path d="M7 11h10" />
      <path d="m9 21 3-6 3 6" />
    </Icon>
  )
}

export function PersonBackIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="2.5" fill="currentColor" />
      <path d="M12 8v7" />
      <path d="M7 11h10" />
      <path d="m9 21 3-6 3 6" />
    </Icon>
  )
}

export function ZoomInIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  )
}

export function ZoomOutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function FocusIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </Icon>
  )
}

export function HelpIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4" />
      <path d="M12 17h.01" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  )
}

export function InfoIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  )
}

export function AlertIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Icon>
  )
}

export function PinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Icon>
  )
}

export function BodyIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M8 22v-7l-2-1 1.5-6h9L18 14l-2 1v7" />
    </Icon>
  )
}

export function ClipboardIcon(props) {
  return (
    <Icon {...props}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </Icon>
  )
}

export function MinusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  )
}

export function ChevronUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 15 6-6 6 6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="m15 6-6 6 6 6" />
    </Icon>
  )
}

export function MoreIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="3.5" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function PencilIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </Icon>
  )
}

// A standing figure inside a frame: "show the whole body".
export function WholeBodyIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <circle cx="12" cy="8" r="1.6" />
      <path d="M12 10.5v4.5" />
      <path d="M9.5 12h5" />
      <path d="m10.5 17.5 1.5-2.5 1.5 2.5" />
    </Icon>
  )
}

// Corner brackets around a dot: "centre the selected location".
export function FrameSelectionIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4" />
      <path d="M15 4h4a1 1 0 0 1 1 1v4" />
      <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
      <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function MouseIcon(props) {
  return (
    <Icon {...props}>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path d="M12 7v3" />
    </Icon>
  )
}

export function HandIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 11.5V7a1.5 1.5 0 0 1 3 0v7c0 3.9-2.6 7-6.5 7-2.4 0-3.9-1-5.3-2.9L3.6 15.4a1.5 1.5 0 0 1 2.4-1.8L8 15.5" />
    </Icon>
  )
}

export function ListIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4.5 6h.01" />
      <path d="M4.5 12h.01" />
      <path d="M4.5 18h.01" />
    </Icon>
  )
}
