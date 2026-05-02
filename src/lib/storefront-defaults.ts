/**
 * Default storefront navigation/footer/homepage copy when theme JSON omits overrides.
 */

export type NavLinkConfig = { href: string; label: string };

export type FooterColumnConfig = { title: string; links: NavLinkConfig[] };

export type HomepageTrustFeature = {
  number?: string;
  title: string;
  description: string;
  osrs_icon_url?: string;
  icon_alt?: string;
};

export type HomepageHowStep = {
  step?: string;
  title: string;
  description: string;
  osrs_icon_url?: string;
  icon_alt?: string;
};

export type HomepageServiceCategory = {
  title: string;
  desc: string;
  cta: string;
  href: string;
  osrs_icon_url?: string;
  icon_alt?: string;
};

export type HomepageFaqItem = { question: string; answer: string };

const WIKI = "https://oldschool.runescape.wiki/images";

export const STOREFRONT_DEFAULT_NAV_LINKS: NavLinkConfig[] = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/shop", label: "GIM Shop" },
  { href: "/live-map", label: "Live Map" },
  { href: "/lootboxes", label: "Lootboxes" },
  { href: "/duel-arena", label: "Duel Arena" },
  { href: "/apply", label: "Become a booster" },
  { href: "/contact", label: "Contact" },
];

export const STOREFRONT_DEFAULT_FOOTER_COLUMNS: FooterColumnConfig[] = [
  {
    title: "Platform",
    links: [
      { href: "/games", label: "Browse Services" },
      { href: "/boosters", label: "Our Boosters" },
      { href: "/apply", label: "Become a Booster" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Support Tickets" },
      { href: "/orders", label: "Order Tracking" },
      { href: "/tos", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export const HOMEPAGE_TRUST_FEATURES_DEFAULT: HomepageTrustFeature[] = [
  {
    osrs_icon_url: `${WIKI}/Defence_icon.png`,
    icon_alt: "Defence",
    number: "01",
    title: "Account safety guaranteed",
    description:
      "Boosters use VPN connections matching your region and work within game guidelines. No bans, no risks.",
  },
  {
    osrs_icon_url: `${WIKI}/Agility_icon.png`,
    icon_alt: "Agility",
    number: "02",
    title: "Booster assigned within 1 hour",
    description:
      "After payment your order is visible to our verified boosters. Average assignment time is under 60 minutes.",
  },
  {
    osrs_icon_url: `${WIKI}/Quest_point_icon.png`,
    icon_alt: "Quest points",
    number: "03",
    title: "Verified boosters only",
    description:
      "Every booster passes a skill test and maintains a minimum 4.5/5 rating. No exceptions.",
  },
];

export const HOMEPAGE_HOW_IT_WORKS_DEFAULT: HomepageHowStep[] = [
  {
    step: "01",
    osrs_icon_url: `${WIKI}/Coins_1000.png`,
    icon_alt: "Coins",
    title: "Select service",
    description: "Browse our services and choose the boost you need.",
  },
  {
    step: "02",
    osrs_icon_url: `${WIKI}/Old_school_bond.png`,
    icon_alt: "Bond",
    title: "Checkout",
    description: "Pay securely with Card, Crypto, or in-game Gold. Your data is encrypted.",
  },
  {
    step: "03",
    osrs_icon_url: `${WIKI}/Magic_icon.png`,
    icon_alt: "Magic",
    title: "Ticket created",
    description:
      "A private Discord ticket is created for your order so you can follow progress.",
  },
  {
    step: "04",
    osrs_icon_url: `${WIKI}/Dragon_scimitar.png`,
    icon_alt: "Dragon scimitar",
    title: "We play",
    description: "Sit back while our vetted boosters complete your order securely.",
  },
];

export const HOMEPAGE_SERVICE_CATEGORIES_DEFAULT: HomepageServiceCategory[] = [
  {
    osrs_icon_url: `${WIKI}/Coins_detail.png`,
    icon_alt: "Coins",
    title: "Gold & Items",
    desc: "Buy & sell in-game currency and rare items safely.",
    cta: "Trade Gold",
    href: "/games",
  },
  {
    osrs_icon_url: `${WIKI}/Dragon_scimitar.png`,
    icon_alt: "Dragon scimitar",
    title: "Boosting Services",
    desc: "PVM, raids, quests, skilling & more from verified boosters.",
    cta: "Browse services",
    href: "/games",
  },
  {
    osrs_icon_url: `${WIKI}/Prayer_icon.png`,
    icon_alt: "Prayer",
    title: "Accounts",
    desc: "Ready-made & custom builds available immediately.",
    cta: "Shop accounts",
    href: "/games",
  },
];

export const HOMEPAGE_FAQ_DEFAULT: HomepageFaqItem[] = [
  {
    question: "Is game boosting safe for my account?",
    answer:
      "Yes. Our boosters work with VPN connections matching your region and always stay within the game's terms of service. PLACEHOLDER_ORDER_STATS",
  },
  {
    question: "How long until my order starts?",
    answer:
      "After payment, your order is immediately visible to available boosters. On average someone starts within 1 hour. During off-peak hours this can take up to 3 hours.",
  },
  {
    question: "Can I track progress while my order is active?",
    answer:
      "Yes. Through your dashboard you can follow progress in real-time and message your booster directly. You'll also receive notifications on every status update.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept credit and debit cards (Visa, Mastercard), PayPal, and account balance top-ups. All payments are processed securely via Whop and Stripe.",
  },
];
