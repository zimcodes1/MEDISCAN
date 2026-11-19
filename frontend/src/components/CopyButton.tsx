import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies `text` to the clipboard and says so for a moment. */
export default function CopyButton({
  text,
  label = "Copy link",
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // clipboard blocked (http, or permissions): the link is still selectable in the box beside it
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 transition-colors cursor-pointer shrink-0"
    >
      {state === "copied" ? <Check size={14} /> : <Copy size={14} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : label}
    </button>
  );
}
