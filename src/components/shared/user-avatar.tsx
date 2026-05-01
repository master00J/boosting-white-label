import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
    "#22c55e", "#06b6d4", "#f97316", "#84cc16",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function UserAvatar({ src, name, size = 32, className }: UserAvatarProps) {
  if (src) {
    return (
      <div
        className={cn("relative rounded-full overflow-hidden flex-shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={name ?? "User"} fill className="object-cover" />
      </div>
    );
  }

  const initials = name ? getInitials(name) : "?";
  const color = name ? getAvatarColor(name) : "#6366f1";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 font-medium text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
        color,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}
