"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatUSD } from "@/lib/format";
import { calcRouteSegments } from "@/lib/pricing-engine";
import type {
  XpBasedPriceMatrix,
  RouteSegment,
  SegmentBreakdown,
  SkillConfig,
  MethodOption,
} from "@/types/service-config";

// ─── SegmentRow ───────────────────────────────────────────────────────────────

function SegmentRow({
  segment,
  breakdown,
  methods,
  matrix,
  skillId,
  skillConfig,
  formFields,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  segment: RouteSegment;
  breakdown: SegmentBreakdown | undefined;
  methods: MethodOption[];
  matrix: XpBasedPriceMatrix;
  skillId: string;
  skillConfig?: SkillConfig;
  formFields: import("@/types/service-config").FormField[];
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (s: RouteSegment) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [fromRaw, setFromRaw] = useState(String(segment.from_level));
  const [toRaw, setToRaw] = useState(String(segment.to_level));

  useEffect(() => { setFromRaw(String(segment.from_level)); }, [segment.from_level]);
  useEffect(() => { setToRaw(String(segment.to_level)); }, [segment.to_level]);

  const commitFrom = () => {
    const v = Math.min(98, Math.max(1, parseInt(fromRaw) || 1));
    setFromRaw(String(v));
    onUpdate({ ...segment, from_level: v });
  };

  const commitTo = () => {
    const v = Math.min(99, Math.max(2, parseInt(toRaw) || 99));
    setToRaw(String(v));
    onUpdate({ ...segment, to_level: v });
  };

  const tierModFields = skillConfig?.tier_modifier_fields ?? [];
  const selectedMethod = methods.find((m) => m.id === segment.method_id);
  const getMethodRange = useCallback((methodId: string) => {
    const matching = (skillConfig?.tiers ?? []).filter((tier) => tier.method_id === methodId);
    if (matching.length === 0) return null;
    return {
      from: Math.min(...matching.map((tier) => tier.from_level)),
      to: Math.max(...matching.map((tier) => tier.to_level)),
    };
  }, [skillConfig?.tiers]);
  const selectedMethodRange = selectedMethod ? getMethodRange(selectedMethod.id) : null;
  const selectedMethodFits = !selectedMethodRange || (segment.from_level >= selectedMethodRange.from && segment.to_level <= selectedMethodRange.to);

  useEffect(() => {
    if (selectedMethod && !selectedMethodFits) {
      onUpdate({ ...segment, method_id: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod?.id, selectedMethodFits, segment.from_level, segment.to_level]);

  const methodChoices = useMemo(() => {
    const choices: Array<{
      id: string | null;
      name: string;
      description?: string | null;
      cost: number;
      isRecommended: boolean;
      meta: string;
      rangeLabel?: string;
    }> = [];
    const getCost = (methodId: string | null) => {
      const { segmentBreakdowns } = calcRouteSegments(matrix, skillId, [{ ...segment, method_id: methodId }]);
      return segmentBreakdowns[0]?.finalCost ?? 0;
    };
    choices.push({
      id: null,
      name: "Default",
      description: "Recommended route for this level range.",
      cost: getCost(null),
      isRecommended: !segment.method_id,
      meta: "Base route",
    });

    for (const method of methods) {
      const isFlat = method.price_per_xp != null;
      const range = getMethodRange(method.id);
      const methodFitsSegment = !range || (segment.from_level >= range.from && segment.to_level <= range.to);
      if (!methodFitsSegment) continue;
      choices.push({
        id: method.id,
        name: method.name,
        description: method.description,
        cost: getCost(method.id),
        isRecommended: segment.method_id === method.id,
        meta: isFlat
          ? "Flat rate"
          : method.multiplier !== 1
            ? `${method.multiplier > 1 ? "+" : "-"}${Math.round(Math.abs(method.multiplier - 1) * 100)}%`
            : "Base price",
        rangeLabel: range ? `Lv. ${range.from}-${range.to}` : undefined,
      });
    }

    return choices;
  }, [getMethodRange, matrix, methods, segment, skillId]);
  const hiddenMethodCount = Math.max(0, methods.length - (methodChoices.length - 1));

  const setModSel = (fieldId: string, val: string) =>
    onUpdate({ ...segment, modifier_selections: { ...(segment.modifier_selections ?? {}), [fieldId]: val } });

  const activeModLabels = tierModFields
    .map((field) => {
      const selVal = segment.modifier_selections?.[field.id];
      if (!selVal) return null;
      const opt = field.options.find((o) => (o.value || o.label) === selVal);
      if (!opt) return null;
      return `${field.label}: ${opt.label}${opt.multiplier && opt.multiplier !== 1 ? ` ×${opt.multiplier}` : ""}`;
    })
    .filter(Boolean) as string[];

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-sm shadow-black/20">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedMethod?.name ?? "Default"}
            </p>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {selectedMethod ? (
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-400/15 text-green-400 border border-green-400/20">
                  Selected method
                </span>
              ) : null}
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[var(--text-muted)]">
                Lv. {segment.from_level}-{segment.to_level}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <button type="button" onClick={onMoveUp} disabled={isFirst}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                aria-label="Move up">
                <ChevronUp className="h-3 w-3" />
              </button>
              <button type="button" onClick={onMoveDown} disabled={isLast}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors border-l border-[var(--border-subtle)]"
                aria-label="Move down">
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <button type="button" onClick={onRemove}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Start</span>
            <input type="number" min={1} max={98} value={fromRaw}
              onChange={(e) => setFromRaw(e.target.value)}
              onBlur={commitFrom}
              onKeyDown={(e) => { if (e.key === "Enter") commitFrom(); }}
              className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">End</span>
            <input type="number" min={2} max={99} value={toRaw}
              onChange={(e) => setToRaw(e.target.value)}
              onBlur={commitTo}
              onKeyDown={(e) => { if (e.key === "Enter") commitTo(); }}
              className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </label>
        </div>

        {breakdown && breakdown.xpDiff > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">From</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">Lv. {segment.from_level}</p>
              <p className="text-[10px] text-[var(--text-muted)]">0 XP</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">To gain</p>
              <p className="text-sm font-bold text-primary">
                {(breakdown.xpDiff / 1_000_000).toFixed(breakdown.xpDiff >= 1_000_000 ? 2 : 3)}M XP
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{formatUSD(breakdown.baseCost)} base</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">To</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">Lv. {segment.to_level}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{(breakdown.xpDiff / 1000).toFixed(0)}K XP</p>
            </div>
          </div>
        )}

        {(methods.length > 0 || methodChoices.length > 1) && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Choose training method</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Pick a method for this level segment.
                </p>
              </div>
              {breakdown && breakdown.xpDiff > 0 && (
                <p className="text-sm font-bold text-primary">
                  {formatUSD(breakdown.finalCost)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {methodChoices.map((method) => {
                const active = (segment.method_id ?? null) === method.id;
                return (
                  <button
                    key={method.id ?? "default"}
                    type="button"
                    onClick={() => onUpdate({ ...segment, method_id: method.id })}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition-all group",
                      active
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/15"
                        : "border-[var(--border-default)] bg-[var(--bg-elevated)]/45 hover:border-primary/35 hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn(
                          "text-xs font-semibold truncate",
                          active ? "text-primary" : "text-[var(--text-primary)] group-hover:text-primary"
                        )}>
                          {method.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {method.isRecommended && (
                            <span className="text-[8px] uppercase tracking-wide font-bold rounded bg-green-400/15 border border-green-400/20 px-1.5 py-0.5 text-green-400">
                              Recommended
                            </span>
                          )}
                          <span className="text-[9px] rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-[var(--text-muted)]">
                            {method.meta}
                          </span>
                          {method.rangeLabel && (
                            <span className="text-[9px] rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-[var(--text-muted)]">
                              {method.rangeLabel}
                            </span>
                          )}
                        </div>
                        {method.description && (
                          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-muted)] line-clamp-2">
                            {method.description}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        active ? "border-primary bg-primary text-white" : "border-[var(--border-default)]"
                      )}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <span className="text-[10px] text-[var(--text-muted)]">Segment price</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{formatUSD(method.cost)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {hiddenMethodCount > 0 && (
              <p className="text-[10px] text-[var(--text-muted)]">
                {hiddenMethodCount} method{hiddenMethodCount !== 1 ? "s are" : " is"} hidden because they only apply to another level range.
              </p>
            )}
          </div>
        )}

        {(tierModFields.length > 0 || formFields.length > 0) && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-[var(--text-muted)]">Extra options</p>
            <div className="flex items-center gap-2 flex-wrap">
              {tierModFields.map((field) => (
                <select key={field.id}
                  value={segment.modifier_selections?.[field.id] ?? ""}
                  onChange={(e) => setModSel(field.id, e.target.value)}
                  className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2 text-xs focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">— {field.label} —</option>
                  {field.options.map((opt) => {
                    const key = opt.value || opt.label;
                    return (
                      <option key={key} value={key} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        {opt.label}{opt.multiplier && opt.multiplier !== 1 ? ` (+${Math.round((opt.multiplier - 1) * 100)}%)` : ""}
                      </option>
                    );
                  })}
                </select>
              ))}

              {formFields.map((field) => {
                if (field.type === "radio" || field.type === "select") {
                  const cur = segment.form_field_selections?.[field.id] as string ?? "";
                  return (
                    <select key={field.id}
                      value={cur}
                      onChange={(e) => onUpdate({
                        ...segment,
                        form_field_selections: { ...(segment.form_field_selections ?? {}), [field.id]: e.target.value },
                      })}
                      className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2 text-xs focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">— {field.label} —</option>
                      {field.options?.map((opt) => {
                        const key = opt.value || opt.label;
                        return (
                          <option key={key} value={key} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                            {opt.label}{opt.multiplier && opt.multiplier !== 1 ? ` (+${Math.round((opt.multiplier - 1) * 100)}%)` : ""}
                          </option>
                        );
                      })}
                    </select>
                  );
                }
                if (field.type === "multi_select") {
                  const cur = (segment.form_field_selections?.[field.id] as string[] | undefined) ?? [];
                  return (
                    <div key={field.id} className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-[var(--text-muted)] mr-0.5">{field.label}:</span>
                      {field.options?.map((opt) => {
                        const key = opt.value || opt.label;
                        const active = cur.includes(key);
                        return (
                          <button key={key} type="button"
                            onClick={() => {
                              const next = active ? cur.filter((v) => v !== key) : [...cur, key];
                              onUpdate({ ...segment, form_field_selections: { ...(segment.form_field_selections ?? {}), [field.id]: next } });
                            }}
                            className={cn(
                              "h-7 px-2 rounded-md border text-[10px] font-medium transition-colors",
                              active ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-primary/40"
                            )}
                          >
                            {opt.label}{opt.multiplier && opt.multiplier !== 1 ? ` ×${opt.multiplier}` : ""}
                          </button>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {activeModLabels.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeModLabels.map((label, i) => (
              <span key={i} className="text-[10px] rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RoutePlanner ─────────────────────────────────────────────────────────────

export default function RoutePlanner({
  skillId,
  matrix,
  segments,
  formFields,
  onChange,
}: {
  skillId: string;
  matrix: XpBasedPriceMatrix;
  segments: RouteSegment[];
  formFields: import("@/types/service-config").FormField[];
  onChange: (segments: RouteSegment[]) => void;
}) {
  const skillConfig = matrix.skills?.find((s) => s.id === skillId);
  const methods = skillConfig?.methods ?? [];
  const [routeMode, setRouteMode] = useState<"recommended" | "custom">("recommended");

  const { segmentBreakdowns } = useMemo(
    () => (skillId ? calcRouteSegments(matrix, skillId, segments) : { segmentBreakdowns: [] }),
    [matrix, skillId, segments]
  );

  const addSegment = useCallback(() => {
    const lastTo = segments[segments.length - 1]?.to_level ?? 1;
    const newTo = Math.min(99, lastTo + 10);
    const matchingTier = skillConfig?.tiers.find(
      (t) => t.from_level <= lastTo && t.to_level >= newTo && t.method_id
    );
    const newSeg: RouteSegment = {
      id: String(Date.now()),
      from_level: lastTo,
      to_level: newTo,
      method_id: matchingTier?.method_id ?? null,
    };
    onChange([...segments, newSeg]);
  }, [segments, onChange, skillConfig?.tiers]);

  const updateSegment = useCallback((id: string, updated: RouteSegment) => {
    onChange(segments.map((s) => s.id === id ? updated : s));
  }, [segments, onChange]);

  const removeSegment = useCallback((id: string) => {
    onChange(segments.filter((s) => s.id !== id));
  }, [segments, onChange]);

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    const next = [...segments];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }, [segments, onChange]);

  const moveDown = useCallback((idx: number) => {
    if (idx === segments.length - 1) return;
    const next = [...segments];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }, [segments, onChange]);

  const totalXp = segmentBreakdowns.reduce((s, b) => s + b.xpDiff, 0);
  const totalCost = segmentBreakdowns.reduce((s, b) => s + b.finalCost, 0);
  const routeStart = segments.length > 0 ? Math.min(...segments.map((s) => s.from_level)) : 1;
  const routeEnd = segments.length > 0 ? Math.max(...segments.map((s) => s.to_level)) : 99;
  const [routeStartRaw, setRouteStartRaw] = useState(String(routeStart));
  const [routeEndRaw, setRouteEndRaw] = useState(String(routeEnd));

  useEffect(() => setRouteStartRaw(String(routeStart)), [routeStart]);
  useEffect(() => setRouteEndRaw(String(routeEnd)), [routeEnd]);

  const buildRecommendedRoute = useCallback((start: number, end: number): RouteSegment[] => {
    const tiers = skillConfig?.tiers ?? [];
    if (tiers.length === 0) {
      return [{ id: String(Date.now()), from_level: start, to_level: end, method_id: null }];
    }
    const recommended = tiers
      .filter((tier) => tier.from_level < end && tier.to_level > start)
      .map((tier, idx): RouteSegment => ({
        id: `${Date.now()}-${idx}`,
        from_level: Math.max(tier.from_level, start),
        to_level: Math.min(tier.to_level, end),
        method_id: tier.method_id ?? null,
      }))
      .filter((seg) => seg.to_level > seg.from_level);
    return recommended.length > 0
      ? recommended
      : [{ id: String(Date.now()), from_level: start, to_level: end, method_id: null }];
  }, [skillConfig?.tiers]);

  const recommendedSegments = useMemo(
    () => buildRecommendedRoute(routeStart, routeEnd),
    [buildRecommendedRoute, routeEnd, routeStart]
  );
  const canUseRecommendedRoute = recommendedSegments.length > 1;
  const commitRouteStart = () => {
    const nextStart = Math.min(98, Math.max(1, parseInt(routeStartRaw) || 1));
    const nextEnd = Math.max(nextStart + 1, routeEnd);
    setRouteStartRaw(String(nextStart));
    onChange(buildRecommendedRoute(nextStart, nextEnd));
  };
  const commitRouteEnd = () => {
    const nextEnd = Math.min(99, Math.max(2, parseInt(routeEndRaw) || 99));
    const nextStart = Math.min(routeStart, nextEnd - 1);
    setRouteEndRaw(String(nextEnd));
    onChange(buildRecommendedRoute(nextStart, nextEnd));
  };

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-primary/[0.08] to-transparent">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Training route</p>
          <p className="text-[11px] text-[var(--text-muted)]">Simple recommended route by default, fully customizable when needed.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-[var(--text-muted)]">
            {segments.length} segment{segments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["recommended", "custom"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setRouteMode(mode);
              if (mode === "recommended") onChange(recommendedSegments);
            }}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              routeMode === mode
                ? "border-primary bg-primary text-white"
                : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {mode === "recommended" ? "Recommended route" : "Custom route"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/45 p-3">
        <label className="space-y-1.5">
          <span className="text-[11px] text-[var(--text-muted)]">Start level</span>
          <input
            type="number"
            min={1}
            max={98}
            value={routeStartRaw}
            onChange={(e) => setRouteStartRaw(e.target.value)}
            onBlur={commitRouteStart}
            onKeyDown={(e) => { if (e.key === "Enter") commitRouteStart(); }}
            className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[var(--text-muted)]">End level</span>
          <input
            type="number"
            min={2}
            max={99}
            value={routeEndRaw}
            onChange={(e) => setRouteEndRaw(e.target.value)}
            onBlur={commitRouteEnd}
            onKeyDown={(e) => { if (e.key === "Enter") commitRouteEnd(); }}
            className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </label>
      </div>

      {routeMode === "recommended" && canUseRecommendedRoute && segments.length === 1 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
          This range has multiple predefined methods. Use the recommended route to split it into clean level brackets.
          <button
            type="button"
            onClick={() => onChange(recommendedSegments)}
            className="ml-2 font-semibold text-primary hover:underline"
          >
            Apply route
          </button>
        </div>
      )}

      {segments.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-elevated)]">
          No training route yet. Add your first segment below.
        </div>
      ) : routeMode === "recommended" ? (
        <div className="space-y-2">
          {segmentBreakdowns.map((bd, idx) => (
            <div key={bd.segment.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/45 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Lv. {bd.segment.from_level} → {bd.segment.to_level}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">
                    {bd.methodName || "Default"} · {(bd.xpDiff / 1_000_000).toFixed(bd.xpDiff >= 1_000_000 ? 2 : 3)}M XP
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{formatUSD(bd.finalCost)}</p>
                  {idx === 0 && <p className="text-[10px] text-green-400">recommended</p>}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRouteMode("custom")}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-primary/40 hover:text-[var(--text-primary)] transition-colors"
          >
            Customize methods / segments
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg, idx) => (
            <SegmentRow
              key={seg.id}
              segment={seg}
              breakdown={segmentBreakdowns[idx]}
              methods={methods}
              matrix={matrix}
              skillId={skillId}
              skillConfig={skillConfig}
              formFields={formFields}
              isFirst={idx === 0}
              isLast={idx === segments.length - 1}
              onUpdate={(updated) => updateSegment(seg.id, updated)}
              onRemove={() => removeSegment(seg.id)}
              onMoveUp={() => moveUp(idx)}
              onMoveDown={() => moveDown(idx)}
            />
          ))}
        </div>
      )}

      {routeMode === "custom" && (
        <button
          type="button"
          onClick={addSegment}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-primary/30 text-xs font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add segment
        </button>
      )}

      {segments.length > 0 && totalXp > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <span className="text-[var(--text-muted)]">
            {segments.length} segment{segments.length !== 1 ? "s" : ""} · {(totalXp / 1_000_000).toFixed(2)}M XP total
          </span>
          <span className="font-bold text-primary">{formatUSD(totalCost)}</span>
        </div>
      )}
      </div>
    </div>
  );
}
