/** 1–10 score tile. Call List = filled blue; Review List = outlined. */
export default function ScoreBadge({ score, list, size = "sm" }: { score: number; list: "call" | "review"; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-20 w-20 rounded-2xl" : "h-12 w-12 rounded-xl";
  const tone = list === "call" ? "bg-blue text-white" : "bg-white text-ink ring-1 ring-inset ring-border";
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center ${dims} ${tone}`} aria-label={`Score ${score} of 10, ${list === "call" ? "Call List" : "Review List"}`}>
      <span className={`font-bold leading-none ${size === "lg" ? "text-4xl" : "text-xl"}`}>{score}</span>
      <span className={`font-semibold ${size === "lg" ? "mt-1 text-xs" : "text-[10px]"} ${list === "call" ? "text-blue-100" : "text-muted"}`}>of 10</span>
    </div>
  );
}
