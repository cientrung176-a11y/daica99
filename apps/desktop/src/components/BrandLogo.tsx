type Props = {
  variant?: 'full' | 'mark';
  size?: number;
  className?: string;
};

export default function BrandLogo({ variant = 'full', size, className = '' }: Props) {
  if (variant === 'mark') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={size ?? 40}
        height={size ?? 40}
        className={className}
        fill="none"
        aria-label="ĐẠI CA 99 BẮC NINH logo mark"
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="50" fill="#E0F7FA" />
        {/* Teal 'b' letter */}
        <rect x="14" y="12" width="13" height="66" rx="6.5" fill="#00ACC1" />
        <path d="M27 30 A 20 19 0 1 1 27 60" stroke="#00ACC1" strokeWidth="13" strokeLinecap="round" />
        {/* Green pharmaceutical circle */}
        <circle cx="66" cy="46" r="26" fill="#43A047" />
        {/* Bowl of Hygieia — white */}
        <rect x="64" y="27" width="4" height="30" rx="2" fill="white" />
        <path d="M68 33 Q76 33 76 39 Q76 45 68 45" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M64 45 Q56 47 56 53 Q56 59 64 59" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="57" y="55" width="18" height="4" rx="2" fill="white" />
        <path d="M59 59 L73 59 L71 65 Q66 69 61 65 Z" fill="white" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 200"
      width={size ?? 120}
      height={size ?? 134}
      className={className}
      fill="none"
      aria-label="ĐẠI CA 99 BẮC NINH full logo"
    >
      {/* Teal 'b' vertical stroke */}
      <rect x="8" y="8" width="22" height="110" rx="11" fill="#00ACC1" />
      {/* Teal 'b' belly arc */}
      <path
        d="M30 38 A 38 34 0 1 1 30 106"
        stroke="#00ACC1" strokeWidth="22" fill="none" strokeLinecap="round"
      />
      {/* Green pharmaceutical circle (overlapping) */}
      <circle cx="110" cy="72" r="48" fill="#43A047" />
      {/* Bowl of Hygieia — white */}
      {/* Staff */}
      <rect x="107" y="38" width="6" height="54" rx="3" fill="white" />
      {/* Upper snake coil (sweeps right) */}
      <path d="M113 46 Q124 46 124 55 Q124 64 113 64" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower snake coil (sweeps left) */}
      <path d="M107 64 Q96 66 96 75 Q96 84 107 84" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Snake head */}
      <circle cx="113" cy="46" r="3.5" fill="white" />
      {/* Bowl rim */}
      <rect x="98" y="90" width="26" height="5" rx="2.5" fill="white" />
      {/* Bowl cup */}
      <path d="M100 95 L122 95 L119 106 C116 113 106 113 103 106 Z" fill="white" />
      {/* BAC HA text */}
      <text
        x="88"
        y="186"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="18"
        fill="#E53935"
        textAnchor="middle"
        letterSpacing="3"
      >
        BAC HA
      </text>
    </svg>
  );
}
