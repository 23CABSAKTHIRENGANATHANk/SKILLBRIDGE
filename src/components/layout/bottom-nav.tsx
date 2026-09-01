import { Link } from "@tanstack/react-router";
import { Bell, Briefcase, Home, LayoutList, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/dashboard", label: "Applications", icon: LayoutList },
  { to: "/recruiter", label: "Talent", icon: Bell },
  { to: "/company", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
