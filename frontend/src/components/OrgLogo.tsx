import { useProtectedImage } from "../lib/images";

interface OrgLogoProps {
  url?: string | null;
  name: string;
  className?: string;
}

/** Organisation logo, or the first letter of its name when it has none. */
export default function OrgLogo({
  url,
  name,
  className = "w-8 h-8",
}: OrgLogoProps) {
  const src = useProtectedImage(url);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-border/60 bg-brand-card text-brand-primary font-bold ${className}`}
    >
      {src ? (
        <img src={src} alt={`${name} logo`} className="w-full h-full object-contain" />
      ) : (
        <span>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
