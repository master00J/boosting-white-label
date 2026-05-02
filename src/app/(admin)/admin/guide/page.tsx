"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Gamepad2,
  FolderOpen,
  Wrench,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Tag,
  Package,
  BarChart3,
  Gift,
  Users,
  ShoppingBag,
  DollarSign,
  Megaphone,
  Settings,
  HeadphonesIcon,
} from "lucide-react";

/* ─── Types ─── */
interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

interface TipProps {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}

interface FieldRowProps {
  name: string;
  required?: boolean;
  description: string;
}

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/* ─── Sub-components ─── */
function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary">
        {number}
      </div>
      <div className="flex-1 pb-6 border-b border-[var(--border-default)] last:border-0 last:pb-0">
        <h4 className="font-semibold text-sm mb-2 text-white">{title}</h4>
        <div className="text-sm text-[var(--text-secondary)] space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Tip({ type = "info", children }: TipProps) {
  const styles = {
    info: { bg: "bg-blue-500/10 border-blue-500/30", icon: Info, color: "text-blue-400" },
    warning: { bg: "bg-amber-500/10 border-amber-500/30", icon: AlertCircle, color: "text-amber-400" },
    success: { bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle2, color: "text-green-400" },
  };
  const s = styles[type];
  const Icon = s.icon;
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${s.bg} text-sm`}>
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${s.color}`} />
      <div className={s.color}>{children}</div>
    </div>
  );
}

function FieldRow({ name, required, description }: FieldRowProps) {
  return (
    <div className="flex gap-3 items-start py-2 border-b border-[var(--border-default)] last:border-0">
      <code className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-primary font-mono flex-shrink-0">
        {name}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </code>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]/30 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-bold">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Sidebar sections ─── */
const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "games", label: "1. Creating Games", icon: Gamepad2 },
  { id: "categories", label: "2. Categories", icon: FolderOpen },
  { id: "services", label: "3. Creating Services", icon: Wrench },
  { id: "pricing", label: "4. Pricing Models", icon: DollarSign },
  { id: "orders", label: "5. Managing Orders", icon: ShoppingBag },
  { id: "workers", label: "6. Workers & Boosters", icon: Users },
  { id: "marketing", label: "7. Marketing", icon: Megaphone },
  { id: "lootboxes", label: "8. Lootboxes", icon: Package },
  { id: "storefront", label: "9. Storefront & Hero", icon: Zap },
  { id: "coupons", label: "10. Coupons", icon: Tag },
  { id: "loyalty", label: "11. Loyalty Points", icon: Gift },
  { id: "helpdesk", label: "12. Helpdesk", icon: HeadphonesIcon },
  { id: "settings", label: "13. Settings", icon: Settings },
  { id: "tips", label: "Pro Tips", icon: BarChart3 },
];

/* ══════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════ */
export default function AdminGuidePage() {
  const [active, setActive] = useState("overview");

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Sync sidebar highlight with scroll position (legend follows reading)
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);
    const triggerTop = 120; // px from top of viewport — section "active" when its top is above this

    const updateActive = () => {
      let current: string = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= triggerTop) current = id;
      }
      setActive(current);
    };

    const observer = new IntersectionObserver(
      () => updateActive(),
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    updateActive(); // initial
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-8 max-w-6xl">
      {/* ── Sticky sidebar ── */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-6 space-y-0.5">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider px-3 mb-2">Sections</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                active === id
                  ? "bg-primary/15 text-primary"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 space-y-16 min-w-0">

        {/* OVERVIEW */}
        <section id="overview" className="scroll-mt-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin Guide</p>
            <h1 className="font-heading text-3xl font-bold mb-2">How to Use the Admin Panel</h1>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl">
              This guide covers everything you need to know to set up and manage your boosting platform — from creating your first game to launching a lootbox campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Gamepad2, title: "Quick Start", desc: "Create a game → add categories → add services → go live", color: "text-orange-400" },
              { icon: Wrench, title: "Service Types", desc: "6 pricing models: XP-based, Boss Tiered, Per Item, Per Unit, Stat-based, Quest+Stats", color: "text-blue-400" },
              { icon: Package, title: "Lootboxes", desc: "Animated chests with OSRS item prizes, live feed, and multi-open", color: "text-purple-400" },
              { icon: Gift, title: "Loyalty & Marketing", desc: "Loyalty tiers, coupons, affiliates, referrals — full suite", color: "text-green-400" },
            ].map((card) => (
              <div key={card.title} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                <card.icon className={`h-5 w-5 mb-2 ${card.color}`} />
                <p className="font-semibold text-sm mb-1">{card.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-primary/10 border border-primary/25">
            <p className="text-sm font-semibold text-primary mb-1">Recommended setup order</p>
            <ol className="text-xs text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
              <li>Create a Game (Catalog → Games)</li>
              <li>Add the Game&apos;s Skills & Methods in Game Setup</li>
              <li>Add Categories for the game</li>
              <li>Create Services inside each category</li>
              <li>Configure pricing per service</li>
              <li>Set up Workers / Boosters</li>
              <li>Configure payments in Settings → Payments</li>
              <li>Customise the storefront hero image</li>
            </ol>
          </div>
        </section>

        {/* ── 1. GAMES ── */}
        <section id="games" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Gamepad2} title="1. Creating Games" subtitle="Games are the top-level entry point. Every service lives inside a game." />

          <div className="space-y-4">
            <Step number={1} title='Go to Catalog → Games'>
              <p>In the left sidebar, expand <strong>Catalog</strong> and click <strong>Games</strong>.</p>
            </Step>
            <Step number={2} title='Click "New Game"'>
              <p>A form panel slides in from the right. Fill in the required fields.</p>
            </Step>
            <Step number={3} title="Fill in game details">
              <div className="space-y-1 mt-2">
                <FieldRow name="Name" required description="Display name shown to customers, e.g. 'Oldschool Runescape'" />
                <FieldRow name="Slug" required description="URL-safe identifier, auto-generated from name. Used in URLs like /games/oldschool-runescape" />
                <FieldRow name="Short description" description="One-line summary shown on game cards on the homepage." />
                <FieldRow name="Description" description="Longer marketing text shown on the game's landing page." />
                <FieldRow name="Logo" description="Square image (e.g. 200×200px). Shown in the navbar, search results, and game cards." />
                <FieldRow name="Banner" description="Wide image (e.g. 1200×400px). Shown as header on the game page." />
              </div>
            </Step>
            <Step number={4} title="Save & activate">
              <p>Click <strong>Save</strong>. Toggle the game to <strong>Active</strong> to make it visible on the storefront. Use <strong>Featured</strong> to show it prominently on the homepage.</p>
            </Step>
          </div>

          <Tip type="info">
            After creating a game, go to <strong>Game Setup</strong> (click the wrench icon next to the game) to add OSRS Skills and Training Methods. These are required before creating XP-Based services.
          </Tip>

          <Accordion title="Game Setup — Skills & Methods" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] pt-3">Access via the <strong>Setup</strong> button (wrench icon) next to each game.</p>
            <div className="space-y-1 mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Skills</p>
              <FieldRow name="Name" required description="Skill display name, e.g. 'Attack', 'Fishing'" />
              <FieldRow name="Slug" required description="Auto-generated. Used internally and in XP tables." />
              <FieldRow name="Icon" description="Click the icon picker to search and select the official OSRS wiki icon for this skill." />
            </div>
            <div className="space-y-1 mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Methods</p>
              <FieldRow name="Name" required description="Training method name, e.g. 'Barbarian Fishing', 'AFK Woodcutting'" />
              <FieldRow name="Description" description="Short explanation of the method shown to customers." />
              <FieldRow name="Multiplier" description="Price multiplier (e.g. 1.5 = 50% more expensive). Use for faster/harder methods." />
            </div>
          </Accordion>
        </section>

        {/* ── 2. CATEGORIES ── */}
        <section id="categories" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={FolderOpen} title="2. Managing Categories" subtitle="Categories group related services under a game (e.g. Powerleveling, Questing, Bossing)." />

          <div className="space-y-4">
            <Step number={1} title="Navigate to a game's categories">
              <p>Go to <strong>Catalog → Games</strong>, find your game, and click the <strong>Categories</strong> button.</p>
            </Step>
            <Step number={2} title="Create a category">
              <div className="space-y-1 mt-2">
                <FieldRow name="Name" required description="Category name shown to customers, e.g. 'Powerleveling', 'Bossing', 'Questing'" />
                <FieldRow name="Slug" required description="URL identifier, e.g. 'powerleveling' → /games/oldschool-runescape/powerleveling" />
                <FieldRow name="Description" description="Short description shown on the category card." />
                <FieldRow name="Image" description="Category thumbnail. Use a portrait or square OSRS-themed image with transparency for best results." />
                <FieldRow name="Sort order" description="Lower number = appears first. Default is 0." />
              </div>
            </Step>
          </div>

          <Tip type="info">
            Category images are displayed with <strong>object-contain</strong> so portrait images (like the Inferno cape) won&apos;t be cropped. Upload PNG files with transparent backgrounds for best results.
          </Tip>
        </section>

        {/* ── 3. SERVICES ── */}
        <section id="services" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Wrench} title="3. Creating Services" subtitle="Services are what customers buy. Each service lives in a game category and has its own pricing model." />

          <div className="space-y-4">
            <Step number={1} title="Open the services panel">
              <p>Go to <strong>Catalog → Games</strong>, click your game, then click <strong>Services</strong> next to a category. Or use the per-category view from the Categories page.</p>
            </Step>
            <Step number={2} title='Click "New Service"'>
              <p>A full-screen slide panel opens with the service editor.</p>
            </Step>
            <Step number={3} title="Fill in the service basics">
              <div className="space-y-1 mt-2">
                <FieldRow name="Name" required description="Service name, e.g. 'Fishing Powerleveling', 'Inferno Cape'" />
                <FieldRow name="Slug" required description="Auto-generated URL identifier." />
                <FieldRow name="Category" required description="Which category this service belongs to." />
                <FieldRow name="Description" description="Marketing description shown on the service page. Explain what the customer gets." />
                <FieldRow name="Image" description="Service thumbnail. Shown in search results and on the category page." />
              </div>
            </Step>
            <Step number={4} title="Choose and configure a pricing model">
              <p>See the <strong>Pricing Models</strong> section below for a detailed guide on each model.</p>
            </Step>
            <Step number={5} title="Save and test">
              <p>Save the service. Toggle it to <strong>Active</strong> to show it on the storefront. Visit the storefront to verify the configurator works as expected.</p>
            </Step>
          </div>

          <Tip type="warning">
            Services won&apos;t appear on the storefront until both the <strong>game</strong> and the <strong>service</strong> are set to active.
          </Tip>
        </section>

        {/* ── 4. PRICING ── */}
        <section id="pricing" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={DollarSign} title="4. Pricing Models" subtitle="Choose the right pricing model for each service type. This determines what the customer configurator looks like." />

          <Tip type="info">
            You can only have <strong>one active pricing model per service</strong>. Choose the model that best matches how the service is naturally priced.
          </Tip>

          {/* XP Based */}
          <Accordion title="XP Based — Powerleveling & Skilling" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Price is calculated from the XP difference between a start level and end level. Best for: <strong>Fishing, Woodcutting, Smithing, Attack, Strength</strong>, and all other XP-grind skills.
            </p>

            {/* Skills */}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Skills</p>
            <div className="space-y-1">
              <FieldRow name="XP Table" required description="Which XP curve to use. Select 'Old School RuneScape (OSRS)' or 'RuneScape 3 (RS3)'. This determines how much XP each level costs." />
              <FieldRow name="Skills" required description="Add one or more skills to this service. Each skill gets its own icon, level tiers, and optionally its own methods." />
              <FieldRow name="Skill icon" description="Click the icon button to pick an official OSRS skill icon, or paste a custom URL." />
            </div>

            {/* Tiers */}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Price Tiers (per skill)</p>
            <div className="space-y-1">
              <FieldRow name="Level range" required description="From level → To level (e.g. 1 → 99). You can split a skill into multiple tiers to charge different rates for different level ranges." />
              <FieldRow name="$/XP" required description="Your price in USD per single XP point. Typical values: $0.0000010 to $0.0000040. The system automatically calculates the total price from the XP difference." />
            </div>
            <div className="mt-3 p-3 rounded-xl bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] space-y-1.5">
              <p className="font-semibold text-white">How the price is calculated:</p>
              <p>1. Customer selects start level → end level (e.g. 1 → 99)</p>
              <p>2. System looks up the XP difference from the OSRS XP table (e.g. 1→99 = ~13M XP)</p>
              <p>3. <strong className="text-white">Price = XP difference × $/XP rate × method multiplier</strong></p>
              <p className="text-[var(--text-muted)]">Example: 13,034,431 XP × $0.0000010/XP = <strong className="text-white">$13.03</strong></p>
              <p>4. If you have multiple tiers, each tier&apos;s XP range is priced at its own rate and summed.</p>
              <p>5. Customer can add multiple level segments in one order (e.g. 1→70 + 70→99 separately).</p>
            </div>

            {/* Methods */}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Methods (optional)</p>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Methods are training options the customer can choose (e.g. Barbarian Fishing, Tick Manipulation, AFK). Each method can modify the price in one of two ways:
            </p>
            <div className="space-y-1">
              <FieldRow name="×multiplier mode" description="Multiplies the base $/XP rate. A multiplier of 1.5 means 50% more expensive than the base tier rate. Use this for methods that are faster/harder." />
              <FieldRow name="$/XP override mode" description="Sets a completely separate $/XP rate for this method, ignoring the tier base rate. Use this for methods with a very different price point." />
            </div>
            <div className="mt-2 p-3 rounded-xl bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] space-y-1">
              <p className="font-semibold text-white">Method pricing example:</p>
              <p>Base tier: $0.0000010/XP (AFK Fishing)</p>
              <p>Method &ldquo;3-tick Barbarian&rdquo; with ×1.5 → customer pays <strong className="text-white">$0.0000015/XP</strong></p>
              <p>Method &ldquo;Tick-perfect Trout&rdquo; with own $/XP $0.0000025 → always <strong className="text-white">$0.0000025/XP</strong> regardless of tier</p>
            </div>

            {/* Tier Modifier Fields */}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Tier Modifier Fields (optional)</p>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              These are extra dropdown selectors shown in the storefront configurator that apply a price multiplier based on the customer&apos;s choice. Examples: fish type, ore type, combat style.
            </p>
            <div className="space-y-1">
              <FieldRow name="Field name" description="Label shown to the customer, e.g. 'Fish type', 'Ore type', 'Combat style'." />
              <FieldRow name="Options" description="Each option has a label (shown to customer) and a multiplier. Multiplier 1.0 = no change. 1.2 = 20% more expensive." />
            </div>
            <Tip type="success">
              On the storefront, customers start with <strong>one segment</strong> and can add more segments manually — they won&apos;t see all segments pre-loaded.
            </Tip>
          </Accordion>

          {/* Per Item */}
          <Accordion title="Per Item — Bosses, Raids, Dungeons">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Fixed price per item/run. Best for: <strong>Fight Caves fire cape, specific boss kills, CoX/ToB/ToA completions</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Items" required description="List the purchasable items. Each item has a name and price in USD." />
              <FieldRow name="Item name" required description="E.g. '1× Fire Cape completion', 'Bandos Chestplate', '10× Vorkath KC'" />
              <FieldRow name="Item price" required description="Price per single item in USD." />
              <FieldRow name="Allow quantity" description="If enabled, customers can order multiple at once." />
            </div>
            <Tip type="info">
              Use this for any service where the unit is a discrete item, not an XP range.
            </Tip>
          </Accordion>

          {/* Per Unit */}
          <Accordion title="Per Unit — Kill Counts, Runs, Hours">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Price per countable unit (kill, run, point, hour, etc.). Best for: <strong>boss KC farming, Slayer tasks, NMZ points, castle wars games</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Unit label" required description="What the unit represents, e.g. 'Kill', 'Run', 'Hour', 'Point'" />
              <FieldRow name="Price per unit" required description="USD price per single unit." />
              <FieldRow name="Min quantity" description="Minimum order quantity." />
              <FieldRow name="Max quantity" description="Maximum order quantity." />
              <FieldRow name="Preset quantities" description="Quick-select buttons shown to customers (e.g. 10, 50, 100, 500)." />
            </div>
          </Accordion>

          {/* Boss Tiered */}
          <Accordion title="Boss Tiered — Boss KC with Tiers">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Price per kill that decreases at higher quantities. Best for: <strong>Zulrah, Vorkath, GWD bosses</strong> where bulk orders get a discount.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Boss name" required description="E.g. 'Zulrah', 'Vorkath'" />
              <FieldRow name="Tiers" required description="Define price tiers by quantity range. E.g.: 1–10 KC @ $2.50/kill, 11–50 KC @ $2.00/kill, 50+ KC @ $1.50/kill." />
              <FieldRow name="Combat stats" description="Optional: configure skill stats (Attack, Ranged, …). Higher levels typically reduce price via multipliers." />
            </div>
          </Accordion>

          {/* Stat Based */}
          <Accordion title="Stat Based — Inferno, Fire Cape, Account Builds">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Price depends on the customer&apos;s account stats (range, defence level, etc.). Best for: <strong>Inferno cape, Colosseum, high-end content where account stats affect difficulty</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Stats" required description="Which stats affect pricing. Typically Range, Defence, HP, Gear tier." />
              <FieldRow name="Base price" required description="Starting USD price at minimum stats." />
              <FieldRow name="Stat multipliers" description="How much each stat tier adjusts the price. Higher stats = lower price (easier for booster)." />
              <FieldRow name="Gear tiers" description="Optional gear options (e.g. Void, Ancestral) the customer can specify." />
            </div>
          </Accordion>

          {/* Quest+Stats */}
          <Accordion title="Quest + Stats — Questing Services">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Customer picks a quest, then account stats apply multipliers. Best for: <strong>all quest completion services</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Quests list" required description="Add each quest with its base price. E.g. 'Dragon Slayer II' → $15.00" />
              <FieldRow name="Stat multipliers" description="Account stat ranges that increase or decrease the price (harder quests on lower stats cost more)." />
            </div>
            <Tip type="info">
              Customers select a quest from the list, enter their stats, and the final price is shown instantly.
            </Tip>
          </Accordion>
        </section>

        {/* ── 5. ORDERS ── */}
        <section id="orders" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={ShoppingBag} title="5. Managing Orders" subtitle="Monitor, update, and manage all customer orders from the Orders section." />

          <Accordion title="Order Statuses" defaultOpen>
            <div className="space-y-1 mt-3">
              <FieldRow name="pending" description="Order placed, awaiting payment confirmation." />
              <FieldRow name="paid" description="Payment confirmed. Ready to be claimed by a booster." />
              <FieldRow name="queued" description="Assigned to a queue, waiting for a booster." />
              <FieldRow name="claimed" description="A booster has claimed the order and is preparing." />
              <FieldRow name="in_progress" description="Booster is actively working on the order." />
              <FieldRow name="paused" description="Order is on hold (e.g. customer requested pause)." />
              <FieldRow name="completed" description="Order successfully delivered." />
              <FieldRow name="cancelled" description="Order was cancelled before completion." />
              <FieldRow name="disputed" description="Customer raised a dispute. Requires admin attention." />
            </div>
          </Accordion>

          <Accordion title="Order ID format — [BRAND]-[GAME]-[SERVICE]-[NUM]" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Every order gets a unique order number in this format. You configure the short codes yourself so they match your workflow (e.g. per game, per service type).
            </p>
            <div className="mt-3 p-3 rounded-xl bg-[var(--bg-elevated)] font-mono text-sm text-primary border border-[var(--border-default)]">
              [BRAND]-[GAME]-[SERVICE]-[ORDERNUMBER]
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Where to set each part</p>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              <li><strong>BRAND</strong> — <strong>Settings → General</strong>, section &quot;Order ID&quot; → <strong>Brand code</strong> (e.g. BST). One value for the whole site.</li>
              <li><strong>GAME</strong> — When creating or editing a <strong>Game</strong> (Catalog → Games), set <strong>Order code</strong> (e.g. OSRS, RS3). Different games can have different codes.</li>
              <li><strong>SERVICE</strong> — When creating or editing a <strong>Service</strong>, set <strong>Order code</strong> (e.g. INF, FCP, TOA, TOB, COX, SKL, GLD). You choose the codes; they are not fixed.</li>
              <li><strong>ORDERNUMBER</strong> — Auto-generated sequential number (e.g. 000001, 000002).</li>
            </ul>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Example short codes (you can use any you like)</p>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Service examples: Infernal Cape → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">INF</code>, Fire Cape → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">FCP</code>, ToA/ToB/CoX → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">TOA</code>/<code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">TOB</code>/<code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">COX</code>, Skilling → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">SKL</code>, Gold → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">GLD</code>. Service type examples: Login → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">LOG</code>, Boost → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">BST</code>, Account build → <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">ACC</code>.
            </p>
            <Tip type="info">
              If you leave a game or service order code empty, the system uses fallbacks (GME / SVC). You can change codes anytime; only new orders use the new values.
            </Tip>
          </Accordion>

          <Accordion title="Order Detail View">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Click any order to open the detail view. Here you can:
            </p>
            <ul className="text-sm text-[var(--text-secondary)] list-disc list-inside space-y-1 mt-2">
              <li>Update the order status manually</li>
              <li>Assign or reassign a booster</li>
              <li>Add internal notes</li>
              <li>View the full order timeline</li>
              <li>See payment details and method</li>
              <li>Issue a refund or mark as disputed</li>
            </ul>
          </Accordion>

          <Accordion title="CSV Import">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Import</strong> in the sidebar to bulk-import orders from a CSV file.
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-3 mb-1">Required CSV columns:</p>
            <div className="space-y-1">
              <FieldRow name="customer_email" required description="Must match an existing customer account." />
              <FieldRow name="game" required description="Game name or slug." />
              <FieldRow name="service" required description="Service name or slug." />
              <FieldRow name="total" required description="Order total in USD (number only, no $ sign)." />
              <FieldRow name="status" description="Optional. Defaults to 'pending'." />
              <FieldRow name="notes" description="Optional internal notes." />
            </div>
          </Accordion>
        </section>

        {/* ── 6. WORKERS ── */}
        <section id="workers" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Users} title="6. Workers & Boosters" subtitle="Manage your team of boosters, their tiers, commissions, and applications." />

          <Accordion title="Worker Overview" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Workers → All Workers</strong> to see every booster. Key columns:
            </p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Commission rate" description="Percentage of order value paid to the booster (e.g. 70%). Edit via the pencil icon." />
              <FieldRow name="Payout minimum" description="Minimum balance required before a payout is processed." />
              <FieldRow name="Active orders" description="Number of orders currently assigned to this booster." />
              <FieldRow name="Rating" description="Average rating from customer reviews." />
            </div>
          </Accordion>

          <Accordion title="Worker Tiers">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Workers → Tiers</strong> to create performance tiers (e.g. Bronze, Silver, Gold, Elite).
            </p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Name" required description="Tier display name, e.g. 'Elite Booster'" />
              <FieldRow name="Min points" description="Minimum lifetime XP/points to reach this tier." />
              <FieldRow name="Discount percentage" description="Discount applied to this tier's commission rate." />
              <FieldRow name="Color" description="Hex color used for tier badge display." />
              <FieldRow name="Icon" description="Emoji icon for the tier badge." />
            </div>
          </Accordion>

          <Accordion title="Applications">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Workers apply via the <strong>Become a Booster</strong> link on the storefront. Review applications at <strong>Workers → Applications</strong>. You can approve or decline each application, which automatically creates or denies their worker account.
            </p>
          </Accordion>

          <Tip type="warning">
            Worker applications can be toggled open/closed in <strong>Settings → General</strong> under <code>worker_applications_open</code>.
          </Tip>
        </section>

        {/* ── 7. MARKETING ── */}
        <section id="marketing" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Megaphone} title="7. Marketing" subtitle="Affiliates, referrals, banners, and announcements to grow your platform." />

          <Accordion title="Affiliates" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Marketing → Affiliates</strong> to manage your affiliate program.
            </p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Email" required description="Must match an existing user account. Type to search and auto-fill." />
              <FieldRow name="Company name" description="Optional: their company or creator name." />
              <FieldRow name="Website URL" description="Their website for tracking purposes." />
              <FieldRow name="Commission rate" description="% of referred orders they earn. E.g. 10 = 10%." />
              <FieldRow name="Cookie days" description="How long the referral cookie lasts. Default: 30 days." />
              <FieldRow name="Payout minimum" description="Minimum balance before payout. Default: $50." />
            </div>
          </Accordion>

          <Accordion title="Banners & Announcements">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              <strong>Content → Banners</strong> — promotional bars shown at the top of the storefront.
            </p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Title" required description="Bold text in the banner." />
              <FieldRow name="Message" required description="Main banner text." />
              <FieldRow name="CTA text / URL" description="Optional button in the banner, e.g. 'Shop now' → /games" />
              <FieldRow name="Background color" description="Choose from presets or enter a custom hex color." />
              <FieldRow name="Starts at / Ends at" description="Schedule banners for specific dates. Leave empty for always-on." />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              <strong>Content → Announcements</strong> — system-wide notices (e.g. maintenance, new features).
            </p>
          </Accordion>
        </section>

        {/* ── 8. LOOTBOXES ── */}
        <section id="lootboxes" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Package} title="8. Lootboxes" subtitle="Animated lootboxes customers open with loyalty points. Full CRUD + OSRS item prizes." />

          <Accordion title="Creating a Lootbox" defaultOpen>
            <div className="space-y-4 mt-3">
              <Step number={1} title="Enable the lootbox system">
                <p>Go to <strong>Marketing → Lootboxes</strong> and toggle <strong>Lootbox system enabled</strong> at the top. This makes the /lootboxes page visible on the storefront.</p>
              </Step>
              <Step number={2} title='Click "New Lootbox"'>
                <div className="space-y-1">
                  <FieldRow name="Name" required description="E.g. 'Bronze Chest', 'Elite Chest'" />
                  <FieldRow name="Description" description="Short text shown on the lootbox card." />
                  <FieldRow name="Cost (loyalty points)" required description="How many loyalty points it costs to open. E.g. 100" />
                  <FieldRow name="Preview image" description="Static image shown on the lootbox card before opening." />
                </div>
              </Step>
              <Step number={3} title="Upload animation layers (optional but recommended)">
                <p>Expand the <strong>Animation layers</strong> section. Upload 7 PNG images for the opening animation:</p>
                <div className="space-y-1 mt-2">
                  <FieldRow name="Closed box" description="The box before opening. Should show the chest closed." />
                  <FieldRow name="Base" description="The bottom of the chest (lid removed). Visible as the lid flies off." />
                  <FieldRow name="Lid" description="The lid that animates upward during opening." />
                  <FieldRow name="Open box" description="The fully open chest with interior visible." />
                  <FieldRow name="Glow" description="A glow/aura layer behind the chest. Use soft radial gradients." />
                  <FieldRow name="Particles" description="Particles/sparkles that burst out when opening." />
                  <FieldRow name="Reward beam" description="A vertical light beam that rises when the prize is revealed." />
                </div>
              </Step>
              <Step number={4} title="Add prizes">
                <p>After saving the lootbox, expand it in the list and click <strong>Add prize</strong>.</p>
              </Step>
            </div>
          </Accordion>

          <Accordion title="Prize Types & Configuration">
            <div className="space-y-4 mt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Common fields for all prize types:</p>
                <div className="space-y-1">
                  <FieldRow name="Name" required description="Prize display name, e.g. '$5 Balance Credit', '10% Discount'" />
                  <FieldRow name="Weight" required description="Relative probability weight. Higher = more likely to win. E.g. weight 80 vs weight 5 makes one 16× more likely." />
                  <FieldRow name="Rarity" required description="Visual rarity tier: Common (grey), Uncommon (green), Rare (blue), Legendary (orange)." />
                  <FieldRow name="Est. value ($)" description="USD value of the prize. Used to calculate RTP." />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] space-y-3">
                <p className="text-xs font-semibold text-white">Balance Credit</p>
                <p className="text-xs text-[var(--text-secondary)]">Adds USD credit directly to the customer&apos;s wallet balance. No extra fields needed beyond the value.</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] space-y-3">
                <p className="text-xs font-semibold text-white">Discount Coupon</p>
                <p className="text-xs text-[var(--text-secondary)]">Generates a unique coupon code for the customer. Extra fields:</p>
                <div className="space-y-1">
                  <FieldRow name="Discount type" description="Percentage (%) or Fixed ($) discount." />
                  <FieldRow name="Max uses" description="How many times the coupon can be used. Usually 1." />
                  <FieldRow name="Expires (days)" description="How many days until the coupon expires after being won." />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] space-y-3">
                <p className="text-xs font-semibold text-white">OSRS Item (delivery)</p>
                <p className="text-xs text-[var(--text-secondary)]">A real in-game OSRS item delivered by a booster. Extra fields:</p>
                <div className="space-y-1">
                  <FieldRow name="Search OSRS item" description="Type the item name (e.g. 'Abyssal whip') to search via the OSRS Wiki. Click a result to auto-fill name, icon, and item ID." />
                  <FieldRow name="Est. value ($)" description="Set the estimated USD value so the RTP calculation is accurate." />
                </div>
                <Tip type="info">When a customer wins an OSRS item, they see a message: &quot;This item will be delivered by a booster. Open a support ticket to claim.&quot;</Tip>
              </div>
            </div>
          </Accordion>

          <Accordion title="RTP (Return to Player)">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              The admin panel shows a live RTP indicator per lootbox. The formula is:
            </p>
            <div className="mt-2 p-3 rounded-xl bg-[var(--bg-elevated)] font-mono text-xs text-primary">
              RTP = Σ(weight × prize_value) / (Σ(weights) × cost_points) × 100
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Target RTP is <strong>94%</strong>. The indicator turns <span className="text-green-400 font-semibold">green</span> when between 92–96%, and <span className="text-red-400 font-semibold">red</span> otherwise. Adjust prize weights or values until you hit the green zone.
            </p>
            <Tip type="warning">OSRS item prizes with $0 value will drag the RTP down. Always set a realistic USD value for items.</Tip>
          </Accordion>
        </section>

        {/* ── 9. STOREFRONT ── */}
        <section id="storefront" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Zap} title="9. Storefront & Hero" subtitle="Customise the visual appearance of the homepage hero section." />

          <Accordion title="Hero Banner Configuration" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Storefront → Hero banners</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Background image" description="Upload a wide image (1920×800px recommended). This fills the entire hero section as a background." />
              <FieldRow name="Overlay opacity" description="0–100% dark overlay on top of the image. Higher = darker, more readable text. Recommended: 40–65%." />
              <FieldRow name="Hero height" description="Height of the hero section in viewport height (vh). E.g. 60 = 60% of screen height." />
              <FieldRow name="Mobile logo" description="Optional separate logo image for mobile screens." />
              <FieldRow name="Mobile logo only" description="If enabled, hides the background image on mobile and only shows the logo." />
            </div>
            <Tip type="info">
              Best results: use a dark-themed game art image (e.g. OSRS boss art, raid screenshots). The platform&apos;s orange gradient overlay is applied automatically on top.
            </Tip>
          </Accordion>

          <Accordion title="Theme">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Storefront → Theme</strong> to customise the site&apos;s color palette, including the primary orange accent color.
            </p>
          </Accordion>
        </section>

        {/* ── 10. COUPONS ── */}
        <section id="coupons" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Tag} title="10. Coupons" subtitle="Create and manage discount coupon codes redeemable at checkout." />

          <Accordion title="Creating a Coupon" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Marketing → Coupons</strong> and click <strong>New Coupon</strong>.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Code" required description="The coupon code customers enter at checkout. Auto-uppercased. E.g. SUMMER25" />
              <FieldRow name="Discount type" required description="Percentage (% off the order total) or Fixed ($X off)." />
              <FieldRow name="Discount value" required description="The discount amount. E.g. 10 for 10% off, or 5 for $5 off." />
              <FieldRow name="Min order amount" description="Optional. Coupon only works on orders above this value in USD." />
              <FieldRow name="Max uses" description="Optional. Total number of times the code can be used across all customers." />
              <FieldRow name="Expires at" description="Optional. Date after which the coupon is no longer valid." />
            </div>
          </Accordion>

          <Tip type="info">
            Coupon codes won from lootboxes are automatically created and linked to the winning customer&apos;s account. They appear in the customer&apos;s <strong>Wallet</strong> dashboard under &quot;My Coupons&quot;.
          </Tip>
        </section>

        {/* ── 11. LOYALTY ── */}
        <section id="loyalty" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Gift} title="11. Loyalty Points" subtitle="Reward customers with points for purchases. Points can be spent on lootboxes." />

          <Accordion title="Loyalty Tiers" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Marketing → Loyalty</strong> to configure tiers.
            </p>
            <div className="space-y-1 mt-3">
              <FieldRow name="Name" required description="Tier name, e.g. 'Bronze', 'Silver', 'Gold', 'Elite'" />
              <FieldRow name="Min points" description="Lifetime points required to reach this tier." />
              <FieldRow name="Discount %" description="Percentage discount applied automatically for customers at this tier." />
              <FieldRow name="Color" description="Hex color for the tier badge." />
              <FieldRow name="Icon" description="Emoji for the tier badge display." />
            </div>
          </Accordion>

          <Accordion title="Manually Granting Points">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Admins can grant or deduct points for any customer via <strong>Customers → All Customers</strong>. Click a customer and use the <strong>Adjust Loyalty Points</strong> section to add or remove points with a reason note.
            </p>
            <Tip type="success">Use this for compensation, promotions, or testing the lootbox system with your own account.</Tip>
          </Accordion>
        </section>

        {/* ── 12. HELPDESK ── */}
        <section id="helpdesk" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={HeadphonesIcon} title="12. Helpdesk" subtitle="Manage customer support tickets directly from the admin panel." />

          <Accordion title="Ticket Overview" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Helpdesk</strong> to see all tickets. The dashboard shows:
            </p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Open" description="New tickets awaiting a first response." />
              <FieldRow name="In Progress" description="Tickets being actively handled." />
              <FieldRow name="Awaiting Reply" description="You responded; waiting for customer reply." />
              <FieldRow name="Resolved" description="Closed tickets." />
              <FieldRow name="AI Handled" description="Tickets automatically resolved by the AI assistant." />
            </div>
          </Accordion>

          <Accordion title="Helpdesk Settings">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Helpdesk → Settings</strong> to configure AI response behavior, auto-close rules, and notification preferences for new tickets.
            </p>
          </Accordion>
        </section>

        {/* ── 13. SETTINGS ── */}
        <section id="settings" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={Settings} title="13. Settings" subtitle="Site configuration, payment providers, integrations, and access control." />

          <Accordion title="General Settings" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3"><strong>Settings → General</strong></p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Site name" description="Your platform name shown in the browser tab and emails." />
              <FieldRow name="Site tagline" description="Short slogan shown on the homepage." />
              <FieldRow name="Site URL" description="Your public URL. Important for links in emails." />
              <FieldRow name="Maintenance mode" description="When enabled, the storefront shows a maintenance page to non-admins." />
              <FieldRow name="Registration enabled" description="Toggle whether new customers can sign up." />
              <FieldRow name="Worker applications open" description="Toggle whether new booster applications are accepted." />
            </div>
          </Accordion>

          <Accordion title="Payments">
            <p className="text-sm text-[var(--text-secondary)] mt-3"><strong>Settings → Payments</strong></p>
            <p className="text-xs text-[var(--text-secondary)] mt-2 mb-3">Configure one or more payment providers. Each provider shows a green indicator when correctly configured.</p>
            <div className="space-y-1">
              <FieldRow name="Stripe" description="Add your Stripe Publishable Key, Secret Key, and Webhook Secret. Toggle between Test and Live mode." />
              <FieldRow name="PayPal" description="Enter Client ID, Secret, and Webhook ID. Toggle Sandbox/Live mode." />
              <FieldRow name="Whop" description="Enter your Whop API Key, Company ID, and Product ID." />
              <FieldRow name="Balance payments" description="Allow customers to pay with their wallet balance." />
              <FieldRow name="In-game gold" description="Allow payment via OSRS gold (configure rate in Currency & Gold)." />
            </div>
          </Accordion>

          <Accordion title="Admin Access">
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Go to <strong>Settings → Admin Access</strong> to grant admin or super_admin roles to user accounts. Only super_admins can modify other admin accounts.
            </p>
            <Tip type="warning">Be careful when granting super_admin access. This gives full control over all settings including payment keys.</Tip>
          </Accordion>

          <Accordion title="Admin Ranks — Limiting dashboard access per role" defaultOpen>
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              Only <strong>super_admins</strong> can create and manage ranks. Ranks let you limit which parts of the admin dashboard an admin can see (e.g. only Helpdesk, or only Orders + Customers).
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Workflow</p>
            <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
              <li><strong>Create ranks</strong> — In the sidebar, open <strong>Ranks</strong> (only visible to super_admins). Click <strong>New rank</strong>, enter a name and slug (e.g. &quot;Support&quot;, <code className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-primary">support</code>), and tick the <strong>dashboard sections</strong> this rank may access (e.g. Helpdesk, Orders, Customers). Save.</li>
              <li><strong>Assign a rank to an admin</strong> — Go to <strong>Settings → Admin Access</strong>. When adding a new admin or editing an existing one, set their role to <strong>Admin</strong> and choose a <strong>rank</strong> from the dropdown. If you leave &quot;No rank / Full access&quot;, that admin sees all sections except Ranks. If you select a rank, they only see the sections you allowed for that rank.</li>
              <li><strong>Sidebar and routes</strong> — The sidebar automatically shows only the sections the current user is allowed to see. If they try to open a URL for a section they don’t have access to, they are redirected to the dashboard.</li>
            </ol>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">Section examples</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Available sections include: Staff Overview (dashboard), Orders, Catalog, Workers, Customers, Finance, Marketing, Helpdesk, Content, Storefront, Discord, Activity Log, Settings, Import, and Admin Guide. You choose per rank which of these are enabled.
            </p>
            <Tip type="info">
              Super_admins always have access to everything, including the Ranks page. Admins with a rank never see the Ranks item in the sidebar.
            </Tip>
          </Accordion>

          <Accordion title="Integrations">
            <p className="text-sm text-[var(--text-secondary)] mt-3"><strong>Settings → Integrations</strong> — shows platform integrations. The live chat is fully built-in and requires no external service.</p>
            <div className="space-y-1 mt-2">
              <FieldRow name="Live Chat" description="Built-in real-time chat between customers and agents. Always active — no configuration needed." />
              <FieldRow name="Chat Agents" description="Under Settings → Chat Agents, super_admins can grant or revoke agent access for specific admins." />
            </div>
          </Accordion>
        </section>

        {/* ── TIPS ── */}
        <section id="tips" className="scroll-mt-6 space-y-6">
          <SectionHeader icon={BarChart3} title="Pro Tips" subtitle="Best practices and common mistakes to avoid." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Always set a realistic RTP",
                body: "For lootboxes, keep RTP between 92–96%. If OSRS item prizes have $0 value, the RTP will drop below the target.",
                type: "warning" as const,
              },
              {
                title: "Use object-contain images",
                body: "Upload PNG images with transparent backgrounds for category and service thumbnails. Portrait-oriented images won't be cropped.",
                type: "success" as const,
              },
              {
                title: "Test with your own account",
                body: "Grant yourself loyalty points via Customers to test the lootbox system before showing it to customers.",
                type: "info" as const,
              },
              {
                title: "XP-Based: set price per 1M XP",
                body: "Start with a price per 1M XP that reflects market rates. All level-range prices are automatically derived from this single value.",
                type: "success" as const,
              },
              {
                title: "Slug consistency",
                body: "Slugs are auto-generated from names. Once a service is live, changing the slug will break any existing links customers have saved.",
                type: "warning" as const,
              },
              {
                title: "Discord notifications",
                body: "Set up Discord channel IDs in the Discord settings to get real-time notifications for new orders, completions, and worker alerts.",
                type: "info" as const,
              },
            ].map((tip) => (
              <div key={tip.title} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                <Tip type={tip.type}>
                  <p className="font-semibold mb-1">{tip.title}</p>
                  <p className="font-normal">{tip.body}</p>
                </Tip>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
