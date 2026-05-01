"use client";

import { useState } from "react";
import { MessageCircle, Plus, Trash2, Loader2, Shield, User } from "lucide-react";

type AgentRow = {
  id: string;
  profile_id: string;
  created_at: string;
  profile: { display_name: string | null; email: string; role: string } | null;
  granted_by_profile: { display_name: string | null } | null;
};

type AdminProfile = {
  id: string;
  display_name: string | null;
  email: string;
  role: string;
};

export default function ChatAgentsClient({
  agents: initialAgents,
  adminProfiles,
}: {
  agents: AgentRow[];
  adminProfiles: AdminProfile[];
}) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const existingIds = new Set(agents.map(a => a.profile_id));
  const availableProfiles = adminProfiles.filter(p => !existingIds.has(p.id));

  const addAgent = async () => {
    if (!selectedProfileId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/chat-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: selectedProfileId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to add agent"); return; }
      setSelectedProfileId("");
      // Reload agents
      const listRes = await fetch("/api/admin/chat-agents");
      if (listRes.ok) {
        const listData = await listRes.json() as { agents: AgentRow[] };
        setAgents(listData.agents);
      }
    } finally {
      setAdding(false);
    }
  };

  const removeAgent = async (agentId: string) => {
    setRemovingId(agentId);
    try {
      await fetch(`/api/admin/chat-agents/${agentId}`, { method: "DELETE" });
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Chat Agents</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Grant admins access to the live chat support interface. Super-admins always have access.
        </p>
      </div>

      {/* Add agent */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <h2 className="text-sm font-medium mb-3">Grant Access</h2>
        {availableProfiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">All admins already have chat access.</p>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
            >
              <option value="">Select an admin…</option>
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.email} ({p.role})
                </option>
              ))}
            </select>
            <button
              onClick={addAgent}
              disabled={!selectedProfileId || adding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Current agents */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-card border-b border-border">
          <h2 className="text-sm font-medium">Current Chat Agents</h2>
        </div>

        {agents.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <User className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No chat agents yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {agent.profile?.role === "super_admin"
                    ? <Shield className="h-4 w-4 text-primary" />
                    : <User className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {agent.profile?.display_name ?? agent.profile?.email ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {agent.profile?.email} · {agent.profile?.role}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Added {new Date(agent.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => removeAgent(agent.id)}
                    disabled={removingId === agent.id}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                  >
                    {removingId === agent.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Chat agents can see and reply to all customer conversations in{" "}
        <span className="text-foreground font-medium">/admin/chat</span>.
        Super-admins always have access regardless of this list.
      </p>
    </div>
  );
}
