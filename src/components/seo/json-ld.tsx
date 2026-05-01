const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

function safeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/<\//g, "<\\/");
}

export function JsonLdOrganization() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BoostPlatform",
    url: appUrl,
    logo: `${appUrl}/icons/icon-512.png`,
    description:
      "Professional OSRS game boosting and powerleveling services. Fast, safe, and by verified boosters.",
    sameAs: [
      "#",
      "#",
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

export function JsonLdService(props: {
  name: string;
  description: string | null;
  url: string;
  image: string | null;
  price: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock";
  reviewCount?: number;
  ratingValue?: number;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: props.name,
    description: props.description ?? undefined,
    url: props.url,
    ...(props.image && { image: props.image }),
    provider: {
      "@type": "Organization",
      name: "BoostPlatform",
      url: appUrl,
    },
    offers: {
      "@type": "Offer",
      price: props.price,
      priceCurrency: props.currency ?? "USD",
      availability: `https://schema.org/${props.availability ?? "InStock"}`,
    },
    ...(props.reviewCount && props.reviewCount > 0 && props.ratingValue && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: props.ratingValue.toFixed(1),
        reviewCount: props.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

export function JsonLdBreadcrumb(props: {
  items: Array<{ name: string; url: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: props.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

export function JsonLdFAQPage({ items }: { items: Array<{ question: string; answer: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

export function JsonLdWebSite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BoostPlatform",
    url: appUrl,
    description:
      "Professional game boosting and powerleveling services. Fast, safe, and by verified boosters.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}
