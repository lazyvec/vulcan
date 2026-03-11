# Vulcan Mobile Usability Audit

You are auditing a Next.js web app ("Vulcan Mission Control") for mobile usability issues.

## Scope
Audit ALL pages and components under `apps/web/` for mobile (viewport < 1024px) issues.

## Check Categories
1. **Touch targets**: All interactive elements must be ≥44px
2. **Overflow**: No horizontal scroll on any page (check tables, code blocks, long text)
3. **Breakpoints**: CSS media queries and Tailwind breakpoints should be consistent (lg:1024px)
4. **Layout**: Nothing should overflow or be cut off on 375px-width screens
5. **Typography**: Readable font sizes (≥14px body, ≥12px captions)
6. **Modals/Dialogs**: Should not overflow viewport, should have mobile padding
7. **Forms/Inputs**: Font-size ≥16px to prevent iOS auto-zoom
8. **Navigation**: Sidebar/topbar should work correctly on mobile
9. **Scrolling**: No scroll-jacking, no nested scroll traps
10. **Safe areas**: Content should respect notch/home indicator (env(safe-area-inset-*))

## Key Files to Audit
- `apps/web/app/globals.css` — global styles + media queries
- `apps/web/styles/tokens.css` — design tokens
- `apps/web/components/*.tsx` — ALL components
- `apps/web/app/(layout)/**/*.tsx` — ALL page layouts
- `apps/web/app/(layout)/layout.tsx` — main layout

## Output Format
For each issue found, provide:
```
[SEVERITY: Critical/Major/Minor] [FILE: path] [LINE: number]
ISSUE: Description
FIX: Suggested fix
```

Sort by severity (Critical first), then by file.
