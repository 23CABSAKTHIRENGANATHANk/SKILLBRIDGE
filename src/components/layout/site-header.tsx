import { Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sparkles,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ApiClient } from "@/lib/api-client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const nav = [
  { to: "/jobs", label: "Explore Jobs" },
  { to: "/dashboard", label: "For Students" },
  { to: "/recruiter", label: "For Recruiters" },
  { to: "/company", label: "Company Profile" },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDark((d) => !d)}
      className="transition-transform duration-200 hover:rotate-12"
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchNotifs = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sb_auth_token") || ""}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Fallback
    }
  };

  const checkCurrentUser = () => {
    const token = localStorage.getItem("sb_auth_token");
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser(payload);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    checkCurrentUser();
    fetchNotifs();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleQuickLogin = async (email: string, role: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("sb_auth_token", data.token);
        checkCurrentUser();
        fetchNotifs();
        setShowAuthModal(false);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sb_auth_token");
    setCurrentUser(null);
    setShowAuthModal(false);
    window.location.reload();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("http://localhost:8000/api/notifications/read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sb_auth_token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header
      className={`sb-navbar sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl ${
        scrolled
          ? "scrolled border-border/60 bg-background/92 shadow-sm backdrop-blur-2xl"
          : "border-transparent"
      }`}
      style={{
        animation: "sb-slide-down 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="SkillBridge home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="link-underline rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {/* Notifications Trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Notifications, ${unreadCount} unread`}
              onClick={() => {
                setShowNotifications((s) => !s);
                fetchNotifs();
              }}
              className="relative group"
            >
              <Bell className="size-4 transition-transform duration-200 group-hover:rotate-12" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
              )}
            </Button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                className="absolute right-0 top-12 z-50 w-80 rounded-2xl border bg-card p-4 shadow-xl sm:w-96"
                style={{ animation: "sb-scale-in 200ms ease-out both" }}
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-display text-sm font-bold">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <CheckCheck className="size-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`rounded-xl border p-3 transition-colors ${
                          notif.is_read ? "bg-background/40 opacity-75" : "border-primary/30 bg-primary-soft/30"
                        }`}
                      >
                        <p className="font-semibold text-foreground">{notif.title}</p>
                        <p className="mt-1 text-muted-foreground leading-relaxed">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-muted-foreground">No new notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Auth Dialog Trigger */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="User Account"
            onClick={() => setShowAuthModal(true)}
            className={`transition-colors ${currentUser ? "text-primary font-bold" : ""}`}
          >
            <User className="size-4" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-6 grid gap-1 px-4">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Auth & Role Switcher Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setShowAuthModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl"
            style={{ animation: "sb-scale-in 200ms ease-out both" }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <h3 className="font-display text-lg font-bold">Account & Roles</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {currentUser ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border bg-primary-soft/40 p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Logged In As</p>
                  <p className="mt-1 font-bold text-foreground text-sm">{currentUser.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
                    Role: {currentUser.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4 mr-2" /> Log Out
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Select a live demo account or authenticate to access role-specific workflows:
                </p>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student@skillbridge.dev", "student")}
                    className="flex items-center justify-between rounded-xl border bg-secondary/60 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary-soft"
                  >
                    <div>
                      <p className="font-bold text-sm">Arjun Kumar</p>
                      <p className="text-xs text-muted-foreground">student@skillbridge.dev</p>
                    </div>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("recruiter@northwind.dev", "recruiter")}
                    className="flex items-center justify-between rounded-xl border bg-secondary/60 p-3 text-left transition-all hover:border-accent/50 hover:bg-accent-soft"
                  >
                    <div>
                      <p className="font-bold text-sm">Northwind Labs Recruiter</p>
                      <p className="text-xs text-muted-foreground">recruiter@northwind.dev</p>
                    </div>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">Recruiter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin@skillbridge.dev", "admin")}
                    className="flex items-center justify-between rounded-xl border bg-secondary/60 p-3 text-left transition-all hover:border-foreground/30 hover:bg-secondary"
                  >
                    <div>
                      <p className="font-bold text-sm">SkillBridge Platform Admin</p>
                      <p className="text-xs text-muted-foreground">admin@skillbridge.dev</p>
                    </div>
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold text-foreground">Admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
