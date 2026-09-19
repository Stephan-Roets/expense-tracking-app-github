import { cn } from '@/lib/utils'

type Zone =
  | 'front'
  | 'rear'
  | 'front-left'
  | 'rear-left'
  | 'front-right'
  | 'rear-right'
  | 'roof'
  | 'undercarriage'

const ZONES: Record<string, Zone> = {
  EXTERIOR_FRONT: 'front',
  EXTERIOR_REAR: 'rear',
  EXTERIOR_FRONT_LEFT: 'front-left',
  EXTERIOR_REAR_LEFT: 'rear-left',
  EXTERIOR_FRONT_RIGHT: 'front-right',
  EXTERIOR_REAR_RIGHT: 'rear-right',
  EXTERIOR_TOP: 'roof',
  EXTERIOR_UNDERCARRIAGE: 'undercarriage',
}

// Highlight rectangles (within the car body bounds) for each zone.
// Body spans x: 6..42, y: 4..68. Mid-x = 24.
const HIGHLIGHTS: Record<Zone, { x: number; y: number; w: number; h: number }[]> = {
  front: [{ x: 6, y: 4, w: 36, h: 20 }],
  rear: [{ x: 6, y: 48, w: 36, h: 20 }],
  'front-left': [{ x: 6, y: 4, w: 18, h: 28 }],
  'front-right': [{ x: 24, y: 4, w: 18, h: 28 }],
  'rear-left': [{ x: 6, y: 40, w: 18, h: 28 }],
  'rear-right': [{ x: 24, y: 40, w: 18, h: 28 }],
  roof: [{ x: 12, y: 22, w: 24, h: 28 }],
  undercarriage: [{ x: 6, y: 4, w: 36, h: 64 }],
}

export function VehicleSideDiagram({
  sectionType,
  className,
}: {
  sectionType: string
  className?: string
}) {
  const zone = ZONES[sectionType]
  if (!zone) return null

  const clipId = `car-body-${zone}`

  return (
    <svg
      viewBox="0 0 48 72"
      className={cn('h-6 w-6 shrink-0', className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="6" y="4" width="36" height="64" rx="11" />
        </clipPath>
      </defs>

      {/* highlighted zone(s), clipped to the car body */}
      <g clipPath={`url(#${clipId})`}>
        {HIGHLIGHTS[zone].map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            className="fill-current"
            opacity={0.85}
          />
        ))}
      </g>

      {/* car body outline */}
      <rect
        x="6"
        y="4"
        width="36"
        height="64"
        rx="11"
        stroke="currentColor"
        strokeWidth="2"
        opacity={0.55}
      />
      {/* windshield / cabin lines to imply a top-down car */}
      <path
        d="M13 24 L35 24 M13 48 L35 48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
    </svg>
  )
}
