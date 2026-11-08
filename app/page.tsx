import DealFinder from "@/components/DealFinder";
import { currentSource } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col md:h-[calc(100dvh-64px)]">
      <DealFinder source={currentSource()} />
    </main>
  );
}
