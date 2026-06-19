# Editorial Component Kit

Drop-in components for visually rich blog posts with precise image control.
Use them inside any `src/content/blog/*.mdx` file.

## Setup (top of the MDX file)

```mdx
---
title: "Your Post Title"
description: "..."
pubDate: "June 19, 2026"
heroImage: "../../assets/blog/your-hero.jpg"
---

import { Figure, Split, Gallery, Pullquote } from '../../components/editorial';

// Import each body image you want optimized:
import garage from '../../assets/blog/garage.jpg';
import front from '../../assets/blog/front.jpg';
import interior from '../../assets/blog/interior.jpg';
import engine from '../../assets/blog/engine.jpg';
```

> **Put body images in `src/assets/blog/`** and `import` them so Astro optimizes
> them (resized, converted to WebP, lazy-loaded). A plain markdown `![](...)`
> still works but isn't optimized.

## Components

### `<Figure>` — one captioned image

```mdx
<Figure src={front} alt="R34 front three-quarter" caption="Bayside Blue, untouched" credit="Apex Engine" width="wide" />
```

- `width="column"` (default) — sits in the reading column
- `width="wide"` — breaks out modestly beyond the text
- `width="full"` — spans the full content area (great for hero-style shots)
- `caption` / `credit` are optional

### `<Split>` — image beside text

```mdx
<Split image={engine} side="right" caption="RB26DETT, factory spec">
  The appeal of the RB26 isn't peak power — it's **how** the twin-turbo
  delivers it. Linear, predictable, endlessly tunable.
</Split>
```

- `side="left"` (default) or `side="right"`
- text goes between the tags (normal markdown — bold, links, lists all work)
- stacks vertically on mobile

### `<Gallery>` — responsive image grid

```mdx
<Gallery
  images={[front, interior, engine]}
  captions={["Exterior", "Cabin", "Engine bay"]}
/>
```

- `cols={2}` to force a column count (defaults to up to 3)
- `alts` and `captions` are optional arrays aligned by index

### `<Pullquote>` — large emphasized quote

```mdx
<Pullquote cite="Editor's note">
  Range anxiety disappears when every morning starts at 100%.
</Pullquote>
```

`cite` is optional.

## Notes

- All components use the brand's sharp-edged style (1px borders, no rounding)
  and the `--red-mica` accent automatically.
- Optimized images need imports; remote/string URLs render as plain `<img>`.
