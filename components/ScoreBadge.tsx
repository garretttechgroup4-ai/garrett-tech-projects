import { scoreProperty, type BandId } from "@/lib/scoring";

const BAND_CLASS: Record<BandId, string> = {
  hot: "bg-red-600 text-white",
  warm: "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300",
  cold: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

/** Deal score as a compact tile: big number, band label underneath. */
export default function ScoreBadge({ signals, size = "sm" }: { signals: string[]; size?: "sm" | "lg" }) {
  const { score, band } = scoreProperty({ signals });
  const dims = size === "lg" ? "h-20 w-20 rounded-2xl" : "h-12 w-12 rounded-xl";
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center ${dims} ${BAND_CLASS[band.id]}`} aria-label={`Deal score ${score}, ${band.label}`}>
      <span className={`font-bold leading-none ${size === "lg" ? "text-3xl" : "text-lg"}`}>{score}</span>
      <span className={`font-semibold uppercase tracking-wide ${size === "lg" ? "mt-1 text-xs" : "text-[10px]"}`}>{band.label}</span>
    </div>
  );
}
