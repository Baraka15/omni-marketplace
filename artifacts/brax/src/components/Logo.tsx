interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: "text-lg", sub: "text-[9px]", tagline: "text-[8px]" },
  md: { icon: 32, text: "text-xl", sub: "text-[10px]", tagline: "text-[9px]" },
  lg: { icon: 44, text: "text-2xl", sub: "text-xs", tagline: "text-[10px]" },
  xl: { icon: 64, text: "text-4xl", sub: "text-sm", tagline: "text-xs" },
};

export default function Logo({ size = "md", showTagline = false, className = "" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LixarIcon size={s.icon} />
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight text-foreground ${s.text}`}>
          Lixar <span className="text-primary">Gramz</span>
        </span>
        <span className={`font-medium text-muted-foreground ${s.sub}`}>
          powered by <span className="text-primary font-semibold">BraxAI</span>
        </span>
        {showTagline && (
          <span className={`text-muted-foreground/60 mt-0.5 ${s.tagline}`}>
            Move Goods. Build Wealth. Scale Africa.
          </span>
        )}
      </div>
    </div>
  );
}

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <LixarIcon size={size} className={className} />;
}

function LixarIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="10" fill="hsl(165 100% 39%)" />
      <path
        d="M10 24L24 10L38 24L24 38L10 24Z"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 10L38 24L24 38"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 24L24 18L30 24"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M20 26L32 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
