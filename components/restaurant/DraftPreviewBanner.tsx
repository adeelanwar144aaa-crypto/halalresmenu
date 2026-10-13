export function DraftPreviewBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[100] border-b border-amber-500/40 bg-amber-300 px-4 py-2 text-center text-sm font-semibold tracking-wide text-amber-950"
    >
      DRAFT PREVIEW — not published to Supabase
    </div>
  );
}
