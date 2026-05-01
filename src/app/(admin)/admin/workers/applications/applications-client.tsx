"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/page-header";
import UserAvatar from "@/components/shared/user-avatar";

interface Application {
  id: string;
  profile_id: string;
  is_active: boolean;
  is_verified: boolean;
  application_text: string | null;
  applied_at: string;
  games: unknown;
  profile: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    discord_username: string | null;
    created_at: string;
  } | null;
}

export default function ApplicationsClient({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (app: Application) => {
    setError(null);
    const res = await fetch("/api/admin/table/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id, is_active: true, is_verified: true, verified_at: new Date().toISOString() }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setApplications((prev) => prev.filter((a) => a.id !== app.id));
  };

  const handleReject = async (app: Application) => {
    if (!confirm("Reject application and remove worker?")) return;
    setError(null);
    const res = await fetch("/api/admin/table/workers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setApplications((prev) => prev.filter((a) => a.id !== app.id));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Worker Applications"
        description={`${applications.length} pending applications`}
      />

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-3" />
            <p className="font-medium">No pending applications</p>
            <p className="text-sm text-muted-foreground mt-1">All applications have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src={app.profile?.avatar_url}
                    name={app.profile?.display_name ?? app.profile?.email}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{app.profile?.display_name ?? "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{app.profile?.email}</p>
                        {app.profile?.discord_username && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Discord: {app.profile.discord_username}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</span>
                        <button
                          onClick={() => handleApprove(app)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-400/10 text-green-400 hover:bg-green-400/20 text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>

                    {app.application_text && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedId === app.id ? (
                            <><ChevronUp className="h-3 w-3" /> Hide motivation</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" /> Show motivation</>
                          )}
                        </button>
                        {expandedId === app.id && (
                          <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            {app.application_text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
