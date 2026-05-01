export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navbar skeleton */}
      <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5" />

      {/* Hero skeleton — photo/video only */}
      <div className="pt-16">
        <div className="relative min-h-[65vh] bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}
