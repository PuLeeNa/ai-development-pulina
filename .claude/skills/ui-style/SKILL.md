---
name: ui-style
description: Design system and UI conventions for this project. Use this skill whenever building, editing, or extending any frontend component, page, or UI element. Covers the full Tailwind v4 class patterns, color palette, typography, component templates (cards, buttons, forms, inputs, nav, badges, errors), and the overall dark-mode amber-accent aesthetic. Always invoke before writing any TSX to avoid style drift.
---

# UI Style Guide — Sneaker Drop

This project uses **Tailwind CSS v4** (no `tailwind.config.ts` — all theme tokens live in `globals.css` via `@theme inline`). The design is **dark-mode first** with an amber accent. Every new UI element should feel like it belongs in the same cohesive system.

## Design DNA

- **Background**: `zinc-950` base, `zinc-900` for cards/surfaces
- **Accent**: `amber-400` for CTAs, prices, focus rings, active states
- **Text**: `white` (primary), `zinc-400` (secondary/descriptions), `zinc-500` (placeholders)
- **Borders**: `white/10` (dividers), `zinc-800` (card borders), `amber-400/30` (hover highlights)
- **Errors**: `red-400` text on `red-400/10` background, `red-500` border
- **Font**: Inter (Google Fonts) — `font-black` headings, `font-bold` titles, `font-semibold` buttons
- **Aesthetic**: flat (no shadows), subtle borders, smooth transitions, premium/minimalist

---

## Color Reference

| Token | Usage |
|-------|-------|
| `bg-zinc-950` | Page background |
| `bg-zinc-900` | Cards, forms, surfaces |
| `bg-zinc-800` | Inputs, secondary backgrounds |
| `text-white` | Primary text |
| `text-zinc-400` | Descriptions, secondary info |
| `text-zinc-500` | Placeholders, muted labels |
| `text-amber-400` | Prices, links, accents |
| `bg-amber-400` | Primary buttons, active badges |
| `border-zinc-800` | Card borders |
| `border-white/10` | Dividers |
| `border-amber-400/30` | Hover card borders |
| `text-red-400` | Error messages |
| `bg-red-400/10` | Error backgrounds |
| `border-red-500` | Destructive borders |

---

## Component Templates

### Card
```tsx
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-colors">
  {/* content */}
</div>
```

### Primary Button (CTA)
```tsx
<button className="rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-zinc-950 transition-colors hover:bg-amber-300">
  Label
</button>
```
Compact variant: `px-5 py-2 text-sm`

### Secondary Button
```tsx
<button className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/40 hover:bg-white/10">
  Label
</button>
```

### Destructive Button
```tsx
<button className="px-4 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium">
  Cancel
</button>
```

### Text Link
```tsx
<a className="text-amber-400 hover:text-amber-300 transition-colors">Link</a>
```

### Form Input
```tsx
<input className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
```

### Form Label
```tsx
<label className="block text-sm font-medium text-zinc-400 mb-2">Label</label>
```

### Error Message
```tsx
<p className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm">{error}</p>
```

### Loading Spinner
```tsx
<div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
```

### Status Badge (closed/active)
```tsx
{/* Closed */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-400 text-black">Closed</span>
{/* Active */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">Active</span>
```

### Back/Breadcrumb Link
```tsx
<a className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
  ← Back to listings
</a>
```

### Page Container
```tsx
<main className="min-h-screen bg-zinc-950 text-white">
  <div className="max-w-7xl mx-auto px-6 py-12">
    {/* content */}
  </div>
</main>
```

### Section Heading
```tsx
<h1 className="text-4xl font-black text-white tracking-tight">Title</h1>
<p className="text-zinc-400 mt-2">Description</p>
```

### Responsive Grid (listings)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Centered Auth/Form Card
```tsx
<div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
  <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
```

---

## Tailwind v4 Notes

- No `tailwind.config.ts` — customise via `@theme inline` in `globals.css`
- PostCSS uses `@tailwindcss/postcss` (not `tailwindcss`)
- CSS variables `--background` and `--foreground` are defined in `:root` but all components use hardcoded zinc/white classes

## Conventions

- Transitions: always `transition-colors` for color changes, `transition-transform` for scale
- Hover scale on images: `group-hover:scale-105 transition-transform duration-300`
- Amber focus ring on all interactive inputs: `focus:ring-2 focus:ring-amber-400`
- Navbar: `sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/10`
- New pages follow the `<main className="min-h-screen bg-zinc-950">` pattern
