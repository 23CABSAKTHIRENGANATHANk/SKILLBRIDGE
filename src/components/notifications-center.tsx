import {
  Bell,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  Clock,
  Star,
  Eye,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Notification {
  id: string;
  type: "job_match" | "application_update" | "interview" | "message" | "endorsement";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

export function NotificationsCenter({
  notifications: initialNotifications,
  onMarkAsRead,
  onDelete,
}: {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread" | "jobs" | "applications" | "interviews">(
    "all",
  );

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    if (filter === "jobs") return n.type === "job_match";
    if (filter === "applications") return n.type === "application_update";
    if (filter === "interviews") return n.type === "interview";
    return true;
  });

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    onMarkAsRead?.(id);
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    onDelete?.(id);
    toast.success("Notification deleted");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "job_match":
        return <Briefcase className="size-5 text-blue-600" />;
      case "application_update":
        return <CheckCircle2 className="size-5 text-green-600" />;
      case "interview":
        return <Clock className="size-5 text-orange-600" />;
      case "message":
        return <MessageSquare className="size-5 text-purple-600" />;
      case "endorsement":
        return <Star className="size-5 text-yellow-600" />;
      default:
        return <Bell className="size-5 text-gray-600" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case "job_match":
        return "bg-blue-50 border-blue-200";
      case "application_update":
        return "bg-green-50 border-green-200";
      case "interview":
        return "bg-orange-50 border-orange-200";
      case "message":
        return "bg-purple-50 border-purple-200";
      case "endorsement":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 rounded-2xl border border-border/80 bg-card p-2 shadow-soft">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread" },
          { id: "jobs", label: "Jobs" },
          { id: "applications", label: "Applications" },
          { id: "interviews", label: "Interviews" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center">
            <Bell className="size-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-semibold">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive notifications here when opportunities match your profile
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-2xl border p-4 transition-all ${
                notif.read
                  ? `border-border/70 bg-background/50`
                  : `${getColorClass(notif.type)} border`
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">{getIcon(notif.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground">{notif.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                        <Clock className="size-3" />
                        {timeAgo(new Date(notif.timestamp))}
                      </p>
                    </div>

                    {!notif.read && (
                      <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>

                  {notif.actionUrl && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold">
                        {notif.actionLabel || "View"}
                      </Button>
                      {!notif.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-xs"
                          onClick={() => handleMarkAsRead(notif.id)}
                        >
                          <Eye className="size-3 mr-1" /> Mark Read
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(notif.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-background/50 shrink-0"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
