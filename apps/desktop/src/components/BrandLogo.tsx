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
        {/* Shield background */}
        <path
          d="M50 4 L88 16 C92 17 94 21 94 25 L94 50 C94 74 74 92 50 96 C26 92 6 74 6 50 L6 25 C6 21 8 17 12 16 Z"
          fill="#0D9488"
        />
        {/* Subtle inner highlight */}
        <path
          d="M50 8 L84 19 C86 20 88 22 88 25 L88 50 C88 70 71 86 50 90 C29 86 12 70 12 50 L12 25 C12 22 14 20 16 19 Z"
          fill="#14B8A6"
        />
        {/* Medical cross */}
        <rect x="41" y="28" width="18" height="44" rx="3" fill="white" />
        <rect x="28" y="41" width="44" height="18" rx="3" fill="white" />
        {/* Circuit / network nodes */}
        <circle cx="20" cy="22" r="4" fill="white" />
        <circle cx="80" cy="22" r="4" fill="white" />
        <circle cx="20" cy="78" r="4" fill="white" />
        <circle cx="80" cy="78" r="4" fill="white" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 100"
      width={size ?? 200}
      height={size ?? 77}
      className={className}
      fill="none"
      aria-label="ĐẠI CA 99 BẮC NINH full logo"
    >
      {/* Mark */}
      <g transform="translate(4, 4) scale(0.92)">
        {/* Shield background */}
        <path
          d="M50 4 L88 16 C92 17 94 21 94 25 L94 50 C94 74 74 92 50 96 C26 92 6 74 6 50 L6 25 C6 21 8 17 12 16 Z"
          fill="#0D9488"
        />
        {/* Subtle inner highlight */}
        <path
          d="M50 8 L84 19 C86 20 88 22 88 25 L88 50 C88 70 71 86 50 90 C29 86 12 70 12 50 L12 25 C12 22 14 20 16 19 Z"
          fill="#14B8A6"
        />
        {/* Medical cross */}
        <rect x="41" y="28" width="18" height="44" rx="3" fill="white" />
        <rect x="28" y="41" width="44" height="18" rx="3" fill="white" />
        {/* Circuit nodes */}
        <circle cx="20" cy="22" r="4" fill="white" />
        <circle cx="80" cy="22" r="4" fill="white" />
        <circle cx="20" cy="78" r="4" fill="white" />
        <circle cx="80" cy="78" r="4" fill="white" />
      </g>

      {/* Text */}
      <text
        x="114"
        y="42"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontWeight="700"
        fontSize="26"
        fill="#0F172A"
        letterSpacing="1.5"
      >
        ĐẠI CA 99
      </text>
      <text
        x="114"
        y="72"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontWeight="500"
        fontSize="18"
        fill="#64748B"
        letterSpacing="3"
      >
        BẮC NINH
      </text>
      {/* Accent line */}
      <rect x="114" y="80" width="40" height="3" rx="1.5" fill="#0D9488" />
    </svg>
  );
}
