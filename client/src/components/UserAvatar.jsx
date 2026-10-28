export default function UserAvatar({ user, size = 28, showStatus = false, online = true }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative inline-flex" title={user?.name}>
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          backgroundColor: user?.color || "#555",
        }}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-panel ${
            online ? "bg-status-success" : "bg-text-muted"
          }`}
        />
      )}
    </div>
  );
}
