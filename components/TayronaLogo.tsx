interface TayronaLogoProps {
  size?: number;
}

export default function TayronaLogo({ size = 80 }: TayronaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tayronaGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5c842" />
          <stop offset="50%" stopColor="#d4a04e" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="tayronaGoldLight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5c842" />
          <stop offset="60%" stopColor="#d4a04e" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      {/* Triple spiral / triskelion - 3 interlocking spirals from center */}
      {/* Spiral 1 - top */}
      <path
        d="M50 50 C50 38, 58 28, 50 20 C42 12, 28 18, 26 30 C24 42, 34 52, 50 50"
        stroke="url(#tayronaGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Spiral 2 - bottom right */}
      <path
        d="M50 50 C60 56, 72 54, 76 64 C80 74, 70 84, 58 80 C46 76, 44 64, 50 50"
        stroke="url(#tayronaGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Spiral 3 - bottom left */}
      <path
        d="M50 50 C40 56, 28 54, 24 64 C20 74, 30 84, 42 80 C54 76, 56 64, 50 50"
        stroke="url(#tayronaGoldLight)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner connecting arcs for depth */}
      <path
        d="M50 50 C50 44, 54 36, 50 30 C46 24, 36 28, 36 36 C36 44, 44 50, 50 50"
        stroke="url(#tayronaGold)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M50 50 C56 54, 64 56, 66 64 C68 72, 60 76, 54 72 C48 68, 48 58, 50 50"
        stroke="url(#tayronaGold)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M50 50 C44 54, 36 56, 34 64 C32 72, 40 76, 46 72 C52 68, 52 58, 50 50"
        stroke="url(#tayronaGoldLight)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="url(#tayronaGold)" />
      {/* Outer circle border */}
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke="url(#tayronaGold)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}
