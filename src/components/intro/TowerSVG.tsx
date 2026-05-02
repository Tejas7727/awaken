interface Props {
  litFloors: number[]; // 0-based floor indices that glow amber
}

// Stone course data: [y, leftX, rightX] — slight irregularity baked in
const COURSES: [number, number, number][] = [
  [463, 29, 167], [447, 29, 167], [432, 30, 166], [416, 30, 166],
  [401, 31, 165], [386, 31, 165], [370, 32, 164], [354, 32, 164],
  [338, 33, 163], [322, 33, 163], [306, 34, 162], [290, 35, 162],
  [274, 35, 161], [258, 36, 161], [242, 36, 160], [226, 37, 160],
  [210, 37, 159], [194, 38, 159], [178, 38, 158], [162, 39, 158],
  [147, 39, 157], [132, 40, 157], [117, 41, 156], [102, 41, 156],
  [88, 42, 155],  [75, 43, 154],
];

// Vertical joint lines: [x, yTop, yBottom]
const JOINTS: [number, number, number][] = [
  [55, 480, 447], [82, 480, 463], [110, 463, 432], [138, 447, 416],
  [65, 432, 401], [95, 416, 386], [125, 401, 370], [50, 386, 354],
  [78, 370, 338], [107, 354, 322], [137, 338, 306], [58, 322, 290],
  [88, 306, 274], [118, 290, 258], [148, 274, 242], [62, 258, 226],
  [92, 242, 210], [122, 226, 194], [152, 210, 178], [55, 194, 162],
  [85, 178, 147], [115, 162, 132], [145, 147, 117], [70, 132, 102],
  [100, 117, 88], [130, 102, 75],
];

// Windows: [cx, cy] for each floor 0–7
const WINDOWS: [number, number][] = [
  [99, 454], [99, 402], [99, 350], [99, 298],
  [99, 246], [99, 194], [99, 142], [99, 90],
];

export default function TowerSVG({ litFloors }: Props) {
  return (
    <svg
      viewBox="0 0 200 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-full h-full"
    >
      <defs>
        <filter id="mist-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="win-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="mist-grad" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#4A3520" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0F0A06" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Mist at base */}
      <ellipse cx="99" cy="492" rx="110" ry="28" fill="url(#mist-grad)" filter="url(#mist-blur)" />
      <ellipse cx="82"  cy="487" rx="75"  ry="18" fill="#2A1A0A" fillOpacity="0.5" filter="url(#mist-blur)" />
      <ellipse cx="118" cy="490" rx="60"  ry="14" fill="#2A1A0A" fillOpacity="0.4" filter="url(#mist-blur)" />

      {/* Tower main silhouette */}
      <path
        d={[
          'M 28 480',
          'L 29 430 L 30 375 L 31 320 L 33 265 L 34 210 L 35 158 L 37 108 L 38 60',
          // battlements
          'L 44 60',
          'L 44 30 L 57 30 L 57 60',
          'L 73 60 L 73 30 L 86 30 L 86 60',
          'L 101 60 L 101 30 L 114 30 L 114 60',
          'L 130 60 L 130 30 L 162 30 L 162 60',
          // right wall down
          'L 163 108 L 163 158 L 165 210 L 165 265 L 165 320 L 166 375 L 167 430 L 168 480',
          'Z',
        ].join(' ')}
        fill="#150F0A"
      />

      {/* Stone courses */}
      {COURSES.map(([y, lx, rx], i) => (
        <line
          key={i}
          x1={lx} y1={y} x2={rx} y2={y}
          stroke="#D4A553"
          strokeOpacity="0.10"
          strokeWidth="0.6"
        />
      ))}

      {/* Vertical joints */}
      {JOINTS.map(([x, yt, yb], i) => (
        <line
          key={i}
          x1={x} y1={yt} x2={x} y2={yb}
          stroke="#D4A553"
          strokeOpacity="0.06"
          strokeWidth="0.5"
        />
      ))}

      {/* Battlement detail lines */}
      <line x1="44" y1="30" x2="162" y2="30" stroke="#D4A553" strokeOpacity="0.15" strokeWidth="0.5" />
      <line x1="44" y1="60" x2="162" y2="60" stroke="#D4A553" strokeOpacity="0.15" strokeWidth="0.5" />

      {/* Floor divider lines */}
      {[428, 376, 324, 272, 220, 168, 116].map((y, i) => {
        const lx = 29 + (480 - y) * 0.038;
        const rx = 168 - (480 - y) * 0.033;
        return (
          <line
            key={i}
            x1={lx} y1={y} x2={rx} y2={y}
            stroke="#D4A553"
            strokeOpacity="0.18"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Windows — dark when unlit, amber when lit */}
      {WINDOWS.map(([cx, cy], i) => {
        const lit = litFloors.includes(i);
        return (
          <g key={i} filter={lit ? 'url(#win-glow)' : undefined}>
            {lit && (
              <ellipse
                cx={cx} cy={cy}
                rx={10} ry={14}
                fill="#D4A553"
                fillOpacity="0.25"
              />
            )}
            <ellipse
              cx={cx} cy={cy}
              rx={7} ry={10}
              fill={lit ? '#D4A553' : '#1E1409'}
              fillOpacity={lit ? 0.9 : 1}
              stroke="#B8924A"
              strokeOpacity={lit ? 0.7 : 0.2}
              strokeWidth="0.8"
            />
          </g>
        );
      })}

      {/* Tower outline — thin warm edge */}
      <path
        d={[
          'M 28 480',
          'L 29 430 L 30 375 L 31 320 L 33 265 L 34 210 L 35 158 L 37 108 L 38 60',
          'L 44 60 L 44 30 L 57 30 L 57 60 L 73 60 L 73 30 L 86 30 L 86 60',
          'L 101 60 L 101 30 L 114 30 L 114 60 L 130 60 L 130 30 L 162 30 L 162 60',
          'L 163 108 L 163 158 L 165 210 L 165 265 L 165 320 L 166 375 L 167 430 L 168 480',
        ].join(' ')}
        stroke="#B8924A"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
