# Apex Engine — Content Style Guide

Single source of truth for blog voice and structure. Read this before writing
or editing any post — don't rely on memory of "how we did it last time."

Brand root, true across every vertical below: **"We don't just list cars; we
document machines."** Every vertical is a different *register* of that same
promise, not a different brand.

## How to use this guide

- Tone is judged against the **phrase bank**, not adjectives. If a draft
  couldn't have produced any of the example sentences in its vertical's
  bank, the register is off — fix it before publishing.
- Structure is judged against the **checklist**, not a description. Before a
  post is done, its headings must satisfy every checked item, in order.
- **Change protocol:** any edit to a checklist below must state one of:
  `Applies to new posts only` or `Retrofit required: [list existing posts]`.
  Never leave it implicit — that's exactly how the Model Year Coverage
  requirement silently skipped 14 existing PMS posts before this rule
  existed.

## Shared rules (all verticals)

- [ ] **Taglish floor.** English-led, Tagalog as natural code-switched
  phrases — including verb-ifying English roots with Tagalog affixes
  (e.g. "imaintain," "i-check," "nag-overheat") rather than translating them.
  Never pure Tagalog, never textbook English. How heavy the Tagalog runs is
  the one thing that shifts per vertical (see phrase banks) — the floor
  itself doesn't.
- [ ] **Fact verification.** Every figure is either confidently sourced or
  explicitly labeled as an estimate ("average casa price, verify with
  dealer"). Never present a guess as fact. Never fabricate a "known issues"
  entry to fill a section — if the model's too new for real owner data, say
  that.
- [ ] **Model Year Coverage** section stating which model years/generation
  the post covers, even if the answer is "unchanged since launch."
- [ ] **Key Takeaways + FAQ** (bilingual question, Taglish answer) →
  FAQPage schema.
- [ ] **Varied internal-link anchors.** Never repeat the same anchor text
  (e.g. "PMS pillar") across posts linking to the same target — vary the
  phrasing every time. Cluster posts link up to their pillar; siblings
  cross-link only where genuinely relevant (e.g. Fortuner ↔ Montero Sport
  as diesel-SUV rivals).

## Vertical A — Daily Driver (PMS cluster: Vios, Wigo, City, Mirage, etc.)

**Reader intent:** a practical ownership-cost decision — often a first car
or family car. Not chasing performance, chasing peace of mind.

**Phrase bank** (register target — match this, not an adjective):
- "Magkano ba to imaintain?"
- "Okay lang ba 'to for daily use, or maraming aalagaan?"
- "Hindi porket mura ang sasakyan, mura na rin ang PMS."

**Checklist:**
- [ ] Quick Specs table
- [ ] Light vs. Heavy (Major) PMS section
- [ ] Known Issues (verified only)
- [ ] Model Year Coverage
- [ ] Key Takeaways
- [ ] FAQ

**Anti-patterns:** raw spec dumps with no cost/practical translation;
assuming the reader already knows what a CVT or DPF is before explaining it.

## Vertical B — EV (BYD cluster and future EV models)

**Reader intent:** tech-literate, cross-shopping range/battery
chemistry/charging/TCO against a gas equivalent. Treat the reader as
informed, not a novice.

**Phrase bank:**
- "30 kWh LFP battery, ~300 km NEDC range — pero paano 'yan sa totoong
  traffic ng Maynila?"
- "Mas mababa ang cost-per-km, pero saan ka magcha-charge sa condo?"
- "Hindi ito 'PMS' sa dating sense — once a year lang, pero iba ang
  babantayan."

**Checklist:**
- [ ] Battery / range / charging spec table
- [ ] Warranty breakdown — vehicle, battery, and motor terms stated
  separately (they're usually three different figures)
- [ ] TCO vs. gasoline equivalent
- [ ] PH charging-infrastructure reality
- [ ] Maintenance cadence in EV terms (annual/~20,000 km — do not reuse the
  ICE light/heavy split)
- [ ] Model Year Coverage (EV pricing/trims move fast — this matters more
  here than anywhere else)
- [ ] Key Takeaways
- [ ] FAQ

**Anti-patterns:** forcing the "Light vs. Heavy PMS" framing onto a car with
no such distinction; fabricating known-issues for models too new to have
real owner-defect data.

## Vertical C — JDM / Enthusiast (new vertical, no posts yet)

**Reader intent:** not "how much to maintain" but "what does this car
become." An EK9 reader wants upgrade paths, kits, parts sourcing, and
whether it's still viable to buy/import/track/daily.

**Phrase bank:**
- "Hindi 'to sasakyan lang, project 'to."
- "B16B swap? Meron, pero hanapin mo muna kung sino may reputable shop dito."
- "Legit ba 'yung chassis number, or binura lang 'yung history?"

**Checklist (distinct template — do not reuse the PMS checklist):**
- [ ] Model/chassis overview — what it is, why it's iconic
- [ ] Common upgrade paths & popular kits (bolt-ons first, then deeper
  builds)
- [ ] Parts availability & sourcing in PH — grey-market realities
- [ ] Known weak points **for modified/track use** (not stock-PMS weak
  points — different risk profile)
- [ ] Buying/import guide — what to inspect on a used or grey-import unit
- [ ] Resale/collector trajectory
- [ ] Model Year Coverage — by chassis code/generation (EK9, AE86), since
  that's how this audience already thinks
- [ ] Key Takeaways
- [ ] FAQ

**Anti-patterns:** a PMS guide with a "cooler" paint job — the sections
themselves must differ, because the reader's actual question differs.

## Choosing a vertical for a new post

Decide by **reader intent**, not brand or origin country. A JDM-origin car
driven as a family daily is Vertical A. A modified or track-focused build of
anything — even a mainstream daily-driver model — is Vertical C if that's
specifically what the post is about. If genuinely ambiguous, default to
Vertical A and flag the ambiguity rather than guessing silently.

## Known retrofit debt (as of 2026-07-11)

- **Resolved:** all 14 original PMS-cluster posts, plus BYD Seal 5 (EV
  vertical), now have the Model Year Coverage section. Retrofitted in a
  parallel pass alongside Ford Everest/Ranger and BYD Seagull, which already
  had it from launch.
- **Resolved:** the literal "PMS pillar" anchor no longer appears anywhere in
  `src/content/blog/` — every occurrence was replaced with distinct, natural
  phrasing per the shared anchor-diversity rule.
