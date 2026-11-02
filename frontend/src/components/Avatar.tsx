import { useProtectedImage } from "../lib/images";

interface AvatarProps {
  /** Relative API path from the backend (avatar_url). */
  url?: string | null;
  name: string;
  /** Tailwind size classes, e.g. "w-10 h-10". */
  className?: string;
  textClassName?: string;
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Round avatar: the user's picture when they have one, otherwise their initials. */
export default function Avatar({
  url,
  name,
  className = "w-10 h-10",
  textClassName = "text-xs",
}: AvatarProps) {
  const src = useProtectedImage(url);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-brand-primary/30 bg-brand-primary/10 text-brand-primary font-bold rounded-full ${className} ${textClassName}`}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}
