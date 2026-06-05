function SkeletonBlock({ h = 16, w = "100%", r = 8, mb = 0 }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, marginBottom: mb }} />;
}

export default function SkeletonPage({ wide = false }) {
  return (
    <div className={wide ? "page-wide" : "page"} style={{ animation: "none" }}>
      {/* hero shape */}
      <SkeletonBlock h={180} r={16} mb={28} />
      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        <SkeletonBlock h={88} r={12} />
        <SkeletonBlock h={88} r={12} />
        <SkeletonBlock h={88} r={12} />
      </div>
      {/* table card */}
      <div className="card">
        {[100, 75, 88, 60, 82].map((w, i) => (
          <SkeletonBlock key={i} h={18} w={`${w}%`} mb={14} />
        ))}
      </div>
    </div>
  );
}
