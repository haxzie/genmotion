type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Chat({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
      <path d="M8.5 10.5h7M8.5 14h4" />
    </svg>
  );
}
function Frame({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}
function Timeline({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="6" width="9" height="4" rx="1" />
      <rect x="8" y="14" width="11" height="4" rx="1" />
      <path d="M3 3v18" />
    </svg>
  );
}
function Export({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}
function Type({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 7V5h16v2M9 19h6M12 5v14" />
    </svg>
  );
}
function Mic({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function Palette({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.6 1.7-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7.4-9-7.4Z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
    </svg>
  );
}
function Sparkles({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </svg>
  );
}
function Wrench({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M15 6a4 4 0 0 0-5.3 5.3L4 17v3h3l5.7-5.7A4 4 0 0 0 18 9l-2 2-3-3 2-2Z" />
    </svg>
  );
}

export const ICONS = {
  chat: Chat,
  frame: Frame,
  timeline: Timeline,
  export: Export,
  type: Type,
  mic: Mic,
  palette: Palette,
  sparkles: Sparkles,
  wrench: Wrench,
} as const;

export type IconKey = keyof typeof ICONS;

export function FeatureIcon({
  name,
  className,
}: {
  name: IconKey;
  className?: string;
}) {
  const Cmp = ICONS[name];
  return <Cmp className={className} />;
}
