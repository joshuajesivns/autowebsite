# Hybrid Schema Example — AE92 post

Worked example of the combined `@graph` (Article + Vehicle + FAQPage + ItemList/Products)
for `toyota-corolla-ae92-guide.mdx`. This is a **JDM/Enthusiast** post, so it uses the
enthusiast entity mix (no PMS `HowTo`). Values are pulled from the real post.

This is a design reference, not a shipped file. Nothing here is live until the layout is
changed to emit it.

---

## What replaces what

Today `BlogPost.astro` emits **two disconnected blocks** (`BlogPosting`, then a separate
`FAQPage`). The hybrid replaces both with **one linked `@graph`** in a single `<script>` tag,
adds a `Vehicle` entity describing the car, and adds an `ItemList` of affiliate `Product`s.

Everything is cross-referenced by `@id` (the `#fragments` below), so a search engine / AI
reads them as one connected thing: *"an Article, about this Vehicle, that answers these
Questions, and recommends these Products."*

---

## The generated JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.apexenginehq.com/#org",
      "name": "Apex Engine",
      "url": "https://www.apexenginehq.com/"
    },
    {
      "@type": "WebSite",
      "@id": "https://www.apexenginehq.com/#website",
      "name": "Apex Engine",
      "url": "https://www.apexenginehq.com/",
      "publisher": { "@id": "https://www.apexenginehq.com/#org" }
    },
    {
      "@type": "BlogPosting",
      "@id": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/#article",
      "headline": "Ultimate Toyota Corolla AE92 Buying Guide - Apex Engine",
      "description": "Apex Engine covers the Toyota Corolla AE92 for PH enthusiasts — trim differences, upgrade paths, and what to check before buying one. Get the full details.",
      "image": "https://www.apexenginehq.com/_astro/ae92-hero.jpg",
      "datePublished": "2026-07-11",
      "dateModified": "2026-07-11",
      "inLanguage": "en-PH",
      "isPartOf": { "@id": "https://www.apexenginehq.com/#website" },
      "publisher": { "@id": "https://www.apexenginehq.com/#org" },
      "author": {
        "@type": "Organization",
        "name": "Apex Engine Editorial Team"
      },
      "mainEntityOfPage": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/",
      "about": { "@id": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/#vehicle" },
      "keywords": ["JDM", "Toyota", "Toyota Corolla", "AE92", "Levin", "Trueno"]
    },
    {
      "@type": "Vehicle",
      "@id": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/#vehicle",
      "name": "Toyota Corolla AE92 (Levin / Sprinter Trueno)",
      "brand": { "@type": "Brand", "name": "Toyota" },
      "model": "Corolla AE92",
      "vehicleModelDate": "1987/1991",
      "bodyType": "Coupe",
      "fuelType": "Gasoline",
      "vehicleTransmission": "5-speed manual",
      "driveWheelConfiguration": "https://schema.org/FrontWheelDriveConfiguration",
      "vehicleEngine": [
        {
          "@type": "EngineSpecification",
          "name": "4A-GE (NA, GT / GT-APEX)",
          "engineType": "1.6L DOHC 16-valve naturally aspirated",
          "enginePower": { "@type": "QuantitativeValue", "value": "120–140", "unitText": "PS" }
        },
        {
          "@type": "EngineSpecification",
          "name": "4A-GZE (supercharged, GT-Z)",
          "engineType": "1.6L DOHC 16-valve supercharged",
          "enginePower": { "@type": "QuantitativeValue", "value": "145–165", "unitText": "PS" }
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "RWD ba ang Corolla AE92, tulad ng AE86?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hindi. Every AE92-generation Levin/Trueno — kasama na ang supercharged GT-Z — ay FWD. Wala talagang RWD o AWD na Levin/Trueno coupe sa AE92..."
          }
        },
        {
          "@type": "Question",
          "name": "Ano ang pagkakaiba ng GT, GT-APEX, at GT-Z?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pare-parehong 1.6L 4A-GE family pero iba ang tune. GT/GT-APEX (NA) = 120–140 PS; GT-Z (supercharged 4A-GZE) = 145–165 PS..."
          }
        }
        /* … the remaining 4 FAQ entries map the same way, straight from the `faq` field … */
      ]
    },
    {
      "@type": "ItemList",
      "@id": "https://www.apexenginehq.com/blog/toyota-corolla-ae92-guide/#products",
      "name": "Recommended parts & upgrades for the AE92",
      "itemListOrder": "https://schema.org/ItemListUnordered",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@type": "Product",
            "name": "Coilover suspension kit (AE92 fitment)",
            "category": "Suspension",
            "brand": { "@type": "Brand", "name": "(brand of the product you link)" },
            "description": "Community-standard first suspension upgrade for this chassis.",
            "url": "https://your-involve-asia-affiliate-link.example/coilover"
          }
        },
        {
          "@type": "ListItem",
          "position": 2,
          "item": {
            "@type": "Product",
            "name": "TRD metal head gasket (4A-GE/4A-GZE)",
            "category": "Engine",
            "brand": { "@type": "Brand", "name": "TRD" },
            "description": "Standard recommended upgrade over stock for higher compression/boost builds.",
            "url": "https://your-involve-asia-affiliate-link.example/trd-gasket"
          }
        }
      ]
    }
  ]
}
```

---

## Where every value comes from (the CMS payoff)

| Graph entity | Source in a Keystatic-authored post |
|---|---|
| `BlogPosting` | `title`, `description`, `pubDate`/`updatedDate`, `heroImage`, `tags` — fields you already have |
| `Vehicle` | a **structured "Vehicle facts" field group** (make, model, years, engines, transmission, drivetrain) — for PMS posts this is the same data as the Quick Specs table |
| `FAQPage` | your existing `faq` repeater — no change |
| `ItemList` / `Product` | a new **"Featured products" repeater** (name / category / brand / affiliate URL / your take) that also renders the visible product-card block |

Enter each thing once in the form → the visible section **and** its part of the graph are
generated together and can't drift apart.

---

## Honesty / risk notes (important for the Products part)

1. **The `ItemList` above is illustrative.** The live AE92 post has **no visible "recommended
   products" section yet**, so we must NOT ship this `ItemList` until that visible block exists.
   Schema describing products a reader can't see is the exact mismatch Google penalizes.
2. **No `price` in the `Product` offers.** Affiliate prices (Involve Asia / Lazada / Shopee)
   change constantly; a stale price in schema is a liability. Omit it, or add `offers` with just
   the affiliate `url` and `availability`.
3. **No `aggregateRating`/`review` unless it's a real, visible editorial rating.** Invented
   stars = Google spam action + FTC/affiliate-disclosure problem.
4. **Keep the affiliate disclosure line** on-page near the product block (existing rule).
5. `Vehicle.enginePower` uses `PS` via `unitText` (schema's `unitCode` has no clean PS code) —
   fine, just noting it's intentional.
6. Google no longer shows **FAQ/HowTo visual rich results** for non-gov/health sites — this
   markup's value here is **AI Overview / LLM comprehension + entity clarity**, not SERP
   decoration. `Vehicle`, `Breadcrumb`, and `Article` still carry weight.
