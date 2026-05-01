"use client";

import { useState } from "react";
import { Shield, UserCheck, Search, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/page-header";
import UserAvatar from "@/components/shared/user-avatar";

type SignupProfile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  discord_id: string | null;
  discord_username: string | null;
  role: string | null;
  created_at: string | null;
};

export default function NewSignupsClient({
  initialSignups,
  isSuperAdmin,
}: {
  initialSignups: SignupProfile[];
  isSuperAdmin: boolean;
}) {
  const [signups, setSignups] = useState<SignupProfile[]>(initialSignups);
  const [search, setSearch] = useState("");
  const [discordOnly, setDiscordOnly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = signups.filter((s) => {
    const matchSearch =
      (s.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchDiscord = !discordOnly || !!s.discord_id;
    return matchSearch && matchDiscord;
  });

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const handleMakeAdmin = async (profile: SignupProfile, role: "admin" | "super_admin" = "admin") => {
    setError(null);
    setLoading(profile.id);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSignups((prev) => prev.filter((s) => s.id !== profile.id));
    } finally {
      setLoading(null);
    }
  };

  const handleMakeWorker = async (profile: SignupProfile) => {
    setError(null);
    setLoading(profile.id);
    try {
      const res = await fetch("/api/admin/promote-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSignups((prev) => prev.filter((s) => s.id !== profile.id));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Signups"
        description="Recent signups (last 30 days). Quickly assign roles to people who logged in via Discord."
      />

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={discordOnly}
            onChange={(e) => setDiscordOnly(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Discord users only</span>
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Discord</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Signed up</th>
                  {isSuperAdmin && (
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      No recent signups found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((profile) => (
                    <tr key={profile.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={profile.avatar_url}
                            name={profile.display_name ?? profile.email}
                            size={32}
                          />
                          <div>
                            <p className="font-medium">{profile.display_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {profile.discord_username ? (
                          <span className="text-indigo-400">{profile.discord_username}</span>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(profile.created_at)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleMakeAdmin(profile, "admin")}
                              disabled={!!loading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium disabled:opacity-50"
                              title="Make Admin"
                            >
                              <Shield className="h-3 w-3" />
                              Admin
                            </button>
                            <button
                              onClick={() => handleMakeAdmin(profile, "super_admin")}
                              disabled={!!loading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium disabled:opacity-50"
                              title="Make Super Admin"
                            >
                              <Crown className="h-3 w-3" />
                              Super Admin
                            </button>
                            <button
                              onClick={() => handleMakeWorker(profile)}
                              disabled={!!loading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium disabled:opacity-50"
                              title="Maak worker"
                            >
                              <UserCheck className="h-3 w-3" />
                              Worker
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
