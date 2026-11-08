import type { SignalDef, Tone } from "@/lib/config";

const TONE_CLASS: Record<Tone, string> = {
  urgent: "bg-red-50 text-red-700 ring-red-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  info: "bg-blue-50 text-blue-800 ring-blue-200",
  positive: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export default function SignalTag({ signal, size = "sm" }: { signal: SignalDef; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${TONE_CLASS[signal.tone]} ${
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {signal.label}
    </span>
  );
}
