import { createFileRoute } from "@tanstack/react-router";
import { Bell, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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

      <PageContainer size="narrow">
        <ScrollReveal>
          <PageHeader
            badge={{ text: "Activity Stream" }}
            title="Notifications"
            subtitle="Stay updated with job matches, applications, and interview invitations."
            actions={
              unreadCount > 0 ? (
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                  {unreadCount} unread
                </span>
              ) : undefined
            }
            className="mb-8"
          />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          {loading ? (
            <div className="text-center py-12 rounded-2xl border border-border/80 bg-card p-8 shadow-soft">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-secondary mb-4 animate-pulse">
                <Bell className="size-6 text-secondary-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Loading notifications...</p>
            </div>
          ) : (
            <NotificationsCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          )}
        </ScrollReveal>
      </PageContainer>

      <BottomNav />
    </div>
  );
}
