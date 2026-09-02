import React from "react";
import { useAuth } from "@/context/auth-context";
import { useNavigate, useLocation, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight } from "lucide-react";
import type { UserRole } from "@/types/skillbridge";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname } as any,
      });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
        <div className="relative flex size-16 items-center justify-center">
          <div className="absolute size-full animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <Logo className="scale-75" />
        </div>
        <p className="font-display text-sm font-medium text-muted-foreground animate-pulse">
          Verifying session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Redirecting to /login
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      const targetDashboard =
        user.role === "recruiter" ? "/recruiter" : user.role === "admin" ? "/admin" : "/dashboard";

      return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-7" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your account ({user.role}) does not have permission to view this page.
            </p>
            <div className="mt-6">
              <Link to={targetDashboard as any}>
                <Button className="w-full font-bold">
                  Go to your Dashboard <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
