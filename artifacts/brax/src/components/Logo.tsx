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
      <OmniIcon size={s.icon} />
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-tight text-foreground ${s.text}`} style={{ letterSpacing: "-0.02em" }}>
          <span className="text-primary">OMNI</span>
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
  return <OmniIcon size={size} className={className} />;
}

function OmniIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill="hsl(165 100% 39%)" />
      {/* Outer ring */}
      <circle cx="24" cy="24" r="13" stroke="white" strokeWidth="2.5" fill="none" opacity="0.9" />
      {/* Inner ring */}
      <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2" fill="none" opacity="0.7" />
      {/* Cross lines */}
      <line x1="24" y1="7" x2="24" y2="41" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="7" y1="24" x2="41" y2="24" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="2.5" fill="white" />
    </svg>
  );
}
