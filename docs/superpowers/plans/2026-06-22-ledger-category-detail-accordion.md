# Ledger Category Detail Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace category breakdown pills with an on-demand accordion that hides zero direct counts and exposes clearer child-category amounts.

**Architecture:** Keep aggregation and detail drawer contracts unchanged. Add one expanded-category state to `ByCategoryClient`, render child breakdown rows inline, and reuse the existing `detail` state for filtered drawers.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide, Vitest, React Testing Library

---

### Task 1: Category detail accordion

**Files:**
- Create: `components/ledger/analysis/ByCategoryClient.test.tsx`
- Modify: `components/ledger/analysis/ByCategoryClient.tsx:40-480`

- [ ] **Step 1: Write the failing interaction tests**

Mock `useLedgerStatsByCategory`, chart primitives, `MonthSelector`, and `LedgerStatsDetailDrawer`. Render one parent with two children and zero direct entries plus one leaf category. Assert:

```tsx
expect(screen.queryByText("직접 0건")).not.toBeInTheDocument();
expect(screen.queryByText("장보기")).not.toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /식비 60,500원 2건/ }));

expect(screen.getByText("장보기")).toBeInTheDocument();
expect(screen.getByText("35,000원")).toBeInTheDocument();
expect(screen.getByText("식비의 57.9% · 1건")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "전체 2건 보기" })).toBeInTheDocument();
```

Also assert a leaf row has no `aria-expanded` and opens the mocked detail drawer directly.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm vitest run components/ledger/analysis/ByCategoryClient.test.tsx
```

Expected: FAIL because category rows do not expose accordion state and child pills are visible before interaction.

- [ ] **Step 3: Implement the minimum accordion**

In `ByCategoryClient`:

```tsx
const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
```

For each category, calculate `hasChildren`, toggle only one expanded parent at a time, and show `ChevronDown` only when `hasChildren` is true. Leaf rows continue setting parent detail directly.

Remove the parent progress bar, then replace pills with an animated inset border list rendered only when expanded:

```tsx
<AnimatePresence initial={false}>
{isExpanded && (
  <motion.div className="ml-11 overflow-hidden border-l border-gray-200 pl-4">
    {directEntryCount > 0 && <button>{categoryName}로 기록 ...</button>}
    {children.map((child) => <button key={child.categoryId}>...</button>)}
    <button>전체 {entryCount}건 보기</button>
  </motion.div>
)}
</AnimatePresence>
```

Each breakdown row shows amount and `부모 지출의 N% · N건`, calculated from `child.amount / item.amount`. Keep existing drawer parameters for direct, child, and parent detail actions.

Add an optional `expectedCount` prop to `LedgerStatsDetailDrawer`. Pass the known parent, direct, or child entry count from `ByCategoryClient`, and render `Math.min(Math.max(expectedCount ?? 3, 1), 5)` skeleton rows.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run components/ledger/analysis/ByCategoryClient.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run static and regression checks**

Run:

```bash
pnpm type-check
pnpm biome check components/ledger/analysis/ByCategoryClient.tsx components/ledger/analysis/ByCategoryClient.test.tsx
pnpm vitest run components/ledger/analysis/ByCategoryClient.test.tsx components/ledger/analysis/LedgerStatsDetailDrawer.test.tsx lib/api/ledger-stats.test.ts
```

Expected: all commands exit 0 with no warnings.

- [ ] **Step 6: Verify in the local browser**

Using the `mcp__agent_browser` session at `http://localhost:3000/ledger/analysis/by-category?scope=shared`, reload at 390x844 and verify:

- `직접 0건` is absent.
- Child categories are hidden initially.
- Only parent rows with children show a chevron.
- Parent rows do not repeat the pie-chart share as progress bars.
- Accordion height and opacity animate when toggled.
- Pressing 식비 expands 장보기/외식 and pressing another parent collapses 식비.
- Child and 전체 actions open the expected detail drawer.
- A two-entry detail action shows two skeleton rows while loading.

- [ ] **Step 7: Commit**

```bash
git add components/ledger/analysis/ByCategoryClient.tsx components/ledger/analysis/ByCategoryClient.test.tsx components/ledger/analysis/LedgerStatsDetailDrawer.tsx components/ledger/analysis/LedgerStatsDetailDrawer.test.tsx docs/superpowers/specs/2026-06-22-ledger-category-detail-accordion-design.md docs/superpowers/plans/2026-06-22-ledger-category-detail-accordion.md
git commit -m "Improve category detail breakdown"
```
