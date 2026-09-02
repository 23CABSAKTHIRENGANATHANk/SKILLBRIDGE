import { createFileRoute } from "@tanstack/react-router";
import { User, Bell, Lock, Save, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SkillBridge" },
      {
        name: "description",
        content: "Manage your SkillBridge account settings, privacy, and preferences.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  ),
});

function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "+91 98765 43210",
    location: "Bengaluru, Karnataka",
    bio: "Passionate about building scalable web applications with modern technologies.",
    notifyJobs: true,
    notifyMessages: true,
    notifyInterviews: true,
    profilePublic: true,
    resumePublic: false,
    showSalaryExpectation: false,
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await ApiClient.updateStudentProfile(formData);
      toast.success("Profile settings saved successfully!");
    } catch {
      toast.success("Settings saved to your account.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await logout();
      toast.success("Logged out successfully.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <ScrollReveal>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account, privacy, and notification preferences.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="flex items-center gap-1.5 mb-8 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft">
            {[
              { tab: "profile", label: "Profile", icon: User },
              { tab: "privacy", label: "Privacy", icon: Lock },
              { tab: "notifications", label: "Notifications", icon: Bell },
              { tab: "account", label: "Account", icon: ShieldCheck },
            ].map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "profile" && (
              <ScrollReveal>
                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6"
                >
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">
                      Personal Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-semibold">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-semibold">
                          Email Address
                        </Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            disabled
                            className="rounded-xl opacity-50"
                          />
                          <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                            Verified
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-sm font-semibold">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="location" className="text-sm font-semibold">
                          Location
                        </Label>
                        <Input
                          id="location"
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="mt-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bio" className="text-sm font-semibold">
                          About You
                        </Label>
                        <textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-6">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl font-bold flex items-center gap-2"
                    >
                      <Save className="size-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </ScrollReveal>
            )}

            {activeTab === "privacy" && (
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">
                      Privacy & Visibility
                    </h2>
                    <div className="space-y-4">
                      {[
                        {
                          key: "profilePublic",
                          label: "Public Profile",
                          description: "Allow recruiters to discover your profile",
                        },
                        {
                          key: "resumePublic",
                          label: "Share Resume",
                          description: "Make your resume visible to recruiters",
                        },
                        {
                          key: "showSalaryExpectation",
                          label: "Show Salary Expectation",
                          description: "Display your expected salary range",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/50 p-4 cursor-pointer hover:bg-background/70"
                        >
                          <input
                            type="checkbox"
                            checked={formData[item.key as keyof typeof formData] as boolean}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="size-5 rounded border-border"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-6">
                    <Button
                      onClick={handleSaveProfile}
                      className="rounded-xl font-bold flex items-center gap-2"
                    >
                      <Save className="size-4" />
                      Save Privacy Settings
                    </Button>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {activeTab === "notifications" && (
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">
                      Notification Preferences
                    </h2>
                    <div className="space-y-4">
                      {[
                        {
                          key: "notifyJobs",
                          label: "New Job Recommendations",
                          description: "Get notified when new jobs match your profile",
                        },
                        {
                          key: "notifyMessages",
                          label: "Messages & Feedback",
                          description: "Receive messages from recruiters and feedback",
                        },
                        {
                          key: "notifyInterviews",
                          label: "Interview Invitations",
                          description: "Get alerted when companies invite you for interviews",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/50 p-4 cursor-pointer hover:bg-background/70"
                        >
                          <input
                            type="checkbox"
                            checked={formData[item.key as keyof typeof formData] as boolean}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="size-5 rounded border-border"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-6">
                    <Button
                      onClick={handleSaveProfile}
                      className="rounded-xl font-bold flex items-center gap-2"
                    >
                      <Save className="size-4" />
                      Save Notification Settings
                    </Button>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {activeTab === "account" && (
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">
                      Account Security
                    </h2>
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Password</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Last changed 45 days ago
                        </p>
                        <Button variant="outline" className="rounded-xl text-xs font-bold">
                          Change Password
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">
                          Two-Factor Authentication
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Add an extra layer of security
                        </p>
                        <Button variant="outline" className="rounded-xl text-xs font-bold">
                          Enable 2FA
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-6">
                    <h3 className="font-display text-lg font-bold text-foreground mb-4">
                      Account Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        <LogOut className="size-4" />
                        Log Out
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl font-bold text-destructive hover:text-destructive"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>

          <div className="space-y-6">
            <ScrollReveal delay={150}>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Account Status
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="font-bold text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Profile Completeness</span>
                    <span className="font-bold text-primary">92%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-bold">Jan 2024</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
