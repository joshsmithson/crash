interface UserAvatarProps {
  username: string;
  avatarUrl?: string;
  level?: number;
  size?: "sm" | "md" | "lg";
  showLevel?: boolean;
  isAdmin?: boolean;
  className?: string;
}

const SIZES = {
  sm: { container: "w-7 h-7", text: "text-[10px]", badge: "w-3.5 h-3.5 text-[7px]", offset: "-bottom-0.5 -right-0.5" },
  md: { container: "w-9 h-9", text: "text-xs", badge: "w-4 h-4 text-[8px]", offset: "-bottom-0.5 -right-0.5" },
  lg: { container: "w-14 h-14", text: "text-lg", badge: "w-5 h-5 text-[9px]", offset: "-bottom-1 -right-1" },
};

/**
 * Generate a consistent color from a username string.
 */
function usernameToColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

export function UserAvatar({
  username,
  avatarUrl,
  level,
  size = "md",
  showLevel = true,
  isAdmin = false,
  className = "",
}: UserAvatarProps) {
  const sizeConfig = SIZES[size];
  const bgColor = usernameToColor(username);
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className={`relative inline-flex ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className={`${sizeConfig.container} rounded-full object-cover border-2 ${
            isAdmin ? "border-gold" : "border-border"
          }`}
        />
      ) : (
        <div
          className={`
            ${sizeConfig.container} rounded-full flex items-center justify-center font-bold
            ${sizeConfig.text} border-2 ${isAdmin ? "border-gold" : "border-border"}
          `}
          style={{ backgroundColor: `${bgColor}30`, color: bgColor }}
        >
          {initial}
        </div>
      )}

      {/* Level badge */}
      {showLevel && level !== undefined && level > 0 && (
        <div
          className={`
            absolute ${sizeConfig.offset} ${sizeConfig.badge}
            rounded-full flex items-center justify-center font-bold
            ${
              level >= 50
                ? "bg-gold text-bg"
                : level >= 20
                ? "bg-primary text-bg"
                : "bg-surface border border-border text-text-secondary"
            }
          `}
          title={`Level ${level}`}
        >
          {level}
        </div>
      )}

      {/* Admin badge */}
      {isAdmin && (
        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-gold flex items-center justify-center">
          <svg className="w-2 h-2 text-bg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
