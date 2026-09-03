import { Link, useNavigate } from "@tanstack/react-router";
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
  GraduationCap,
  Briefcase,
  AlertTriangle,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sb_theme");
    if (savedTheme) {
      setDark(savedTheme === "dark");
      return;
    }
    setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem("sb_theme")) setDark(event.matches);
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current;
      window.localStorage.setItem("sb_theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="transition-transform duration-200 hover:rotate-12"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await ApiClient.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Fallback
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    setNotifications([]);
    setUnreadCount(0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    if (isAuthenticated) {
      fetchNotifs();
    }
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated, fetchNotifs]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchNotifs();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, fetchNotifs]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      setShowAccountModal(false);
      toast.success("Signed out successfully");
      navigate({ to: "/login", search: {} });
    } catch {
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiClient.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Navigation Links based on Auth & Role
  const navItems = [
    { to: "/jobs", label: "Explore Jobs" },
    ...(user?.role === "student"
      ? [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/career-agent", label: "AI Career Agent" },
        ]
      : []),
    ...(user?.role === "recruiter" ? [{ to: "/recruiter", label: "Recruiter Dashboard" }] : []),
    ...(user?.role === "college_admin" || user?.role === "admin"
      ? [{ to: "/college", label: "College Placement" }]
      : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin Console" }] : []),
    { to: "/company", label: "Company Profile" },
  ];

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

        {/* Desktop Navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to as any}
              className="link-underline rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-primary-soft text-primary font-bold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications Trigger (When Logged In) */}
          {isAuthenticated && (
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
                            notif.is_read
                              ? "bg-background/40 opacity-75"
                              : "border-primary/30 bg-primary-soft/30"
                          }`}
                        >
                          <p className="font-semibold text-foreground">{notif.title}</p>
                          <p className="mt-1 text-muted-foreground leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-center text-muted-foreground">No new notifications</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile / Auth State Trigger */}
          {isAuthenticated && user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2 rounded-full border-border/80 px-3 py-1.5 transition-all hover:border-primary/60 hover:bg-primary-soft/40"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {(user.name || user.email || "U")[0]!.toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate text-xs font-bold sm:max-w-[140px]">
                {user.name || user.email.split("@")[0]}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                {user.role}
              </span>
            </Button>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login" search={{}}>
                <Button variant="ghost" size="sm" className="font-bold text-xs">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="rounded-full font-bold text-xs shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Sheet Navigation */}
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
              <nav aria-label="Mobile" className="mt-6 grid gap-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="mt-6 pt-4 border-t border-border">
                  {isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-secondary/60 rounded-xl">
                        <p className="text-xs font-bold text-foreground">
                          {user.name || user.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {user.role} Account
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full"
                      >
                        <LogOut className="size-4 mr-2" /> Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Link to="/login" search={{}} className="w-full">
                        <Button variant="outline" className="w-full font-bold">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/register" className="w-full">
                        <Button className="w-full font-bold">Get Started</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setShowAccountModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl"
            style={{ animation: "sb-scale-in 200ms ease-out both" }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <h3 className="font-display text-lg font-bold">Account Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Logged In As
                </p>
                <p className="mt-1 font-bold text-foreground text-sm">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <span className="mt-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
                  Role: {user.role}
                </span>
              </div>

              {/* Direct Dashboard Link */}
              <Link
                to={(user.role === "recruiter" ? "/recruiter" : "/dashboard") as any}
                onClick={() => setShowAccountModal(false)}
              >
                <Button className="w-full font-bold">
                  Go to {user.role === "recruiter" ? "Recruiter" : "Student"} Dashboard
                </Button>
              </Link>

              {/* Settings Link */}
              <Link to="/settings" onClick={() => setShowAccountModal(false)}>
                <Button variant="outline" className="w-full font-bold">
                  Account Settings
                </Button>
              </Link>

              {/* Notifications Link */}
              <Link to="/notifications" onClick={() => setShowAccountModal(false)}>
                <Button variant="outline" className="w-full font-bold">
                  <Bell className="size-4 mr-2" />
                  View All Notifications
                </Button>
              </Link>

              {/* Sign Out Button */}
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={() => {
                  setShowAccountModal(false);
                  setShowLogoutConfirm(true);
                }}
              >
                <LogOut className="size-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Popover Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setShowLogoutConfirm(false)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-2xl text-center"
            style={{ animation: "sb-scale-in 200ms ease-out both" }}
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>

            <h3 className="mt-4 font-display text-lg font-bold text-foreground">
              Sign out of SkillBridge?
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              You will need to enter your credentials again to access your applications and
              dashboard.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-bold"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl font-bold"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
