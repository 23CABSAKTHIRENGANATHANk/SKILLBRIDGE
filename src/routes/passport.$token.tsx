import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BadgeCheck, Sparkles, FolderGit2, Award, ShieldCheck, Globe, ExternalLink, Code2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { ApiClient } from "@/lib/api-client";

export const Route = createFileRoute("/passport/$token")({
  component: PublicPassportPage,
});

function PublicPassportPage() {
  const { token } = Route.useParams();
  const [passport, setPassport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      ApiClient.getPublicSkillPassport(token)
        .then((res) => {
          setPassport(res.passport);
        })
        .catch(() => {
          setError("Skill Passport not found or has been set to private.");
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-12">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-sm font-semibold text-muted-foreground animate-pulse">
              Verifying cryptographic Skill Passport credentials...
            </p>
          </div>
        ) : error || !passport ? (
          <div className="py-24 text-center space-y-3">
            <h2 className="font-display text-2xl font-bold text-foreground">Passport Not Found</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Header Badge */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success text-success-foreground text-xs font-black">
                      <BadgeCheck className="size-3.5" /> SkillBridge 2.0 Verified
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Token: {passport.public_token.substring(0, 16)}...
                    </span>
                  </div>
                  <h1 className="font-display text-3xl font-black text-foreground">
                    {passport.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {passport.program} · <strong className="text-foreground">{passport.institution}</strong>
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 text-center min-w-[140px]">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Readiness</p>
                  <p className="text-3xl font-black text-foreground mt-0.5">
                    {passport.verified_readiness}%
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-success" /> Tamper-evident verified credentials
                </span>
                <span>Verified: {new Date(passport.verified_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Verified Skills */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Verified Skills & Competencies</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(passport.skills || []).map((sk: any) => (
                  <div
                    key={sk.skill_id}
                    className="p-3.5 rounded-2xl border border-border/60 bg-background/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">{sk.skill_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Proof: {sk.confidence_level}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                      {sk.confidence_score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            {passport.projects?.length > 0 && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <FolderGit2 className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Featured Projects Portfolio</h2>
                </div>
                <div className="space-y-3">
                  {passport.projects.map((proj: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/60 bg-background/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-foreground">{proj.title}</h3>
                        {proj.tech_stack && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">
                            <Code2 className="size-3" /> {proj.tech_stack}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-xs text-muted-foreground">{proj.description}</p>
                      )}
                      <div className="flex gap-4 text-xs pt-1">
                        {proj.project_url && (
                          <a
                            href={proj.project_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <Globe className="size-3" /> Live Demo
                          </a>
                        )}
                        {proj.github_url && (
                          <a
                            href={proj.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="size-3" /> Repository
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {passport.certificates?.length > 0 && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <Award className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Accreditations & Certificates</h2>
                </div>
                <div className="space-y-3">
                  {passport.certificates.map((cert: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/60 bg-background/50 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{cert.title}</h3>
                        <p className="text-xs text-muted-foreground">{cert.issuer} · {cert.issue_date || "Verified"}</p>
                      </div>
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" /> Verify
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
