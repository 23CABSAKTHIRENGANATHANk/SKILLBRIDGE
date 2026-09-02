import { createFileRoute } from "@tanstack/react-router";
import { Bell, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { ScrollReveal } from "@/components/scroll-reveal";
import { NotificationsCenter, type Notification } from "@/components/notifications-center";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/context/auth-context";
import { ApiClient } from "@/lib/api-client";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SkillBridge" },
      {
        name: "description",
        content: "View your job opportunities, application updates, and interview invitations.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  ),
});

function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await ApiClient.getNotifications();
        setNotifications(
          data.notifications.map((n: any) => ({
            id: n.id,
            type: n.type || "message",
            title: n.title || "New Notification",
            message: n.message || "",
            timestamp: new Date(n.created_at),
            read: Boolean(n.is_read),
            actionUrl: n.action_url,
            actionLabel: n.action_label,
            metadata: n.metadata,
          })),
        );
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await ApiClient.markNotificationRead(id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteNotification(id);
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <ScrollReveal>
          <div className="mb-8 flex items-center gap-4">
            <Link to="/dashboard" className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-2 text-muted-foreground">
                Stay updated with job matches, applications, and interview invitations
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-secondary mb-4 animate-pulse">
                <Bell className="size-6 text-secondary-foreground" />
              </div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : (
            <NotificationsCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          )}
        </ScrollReveal>
      </main>

      <BottomNav />
    </div>
  );
}
