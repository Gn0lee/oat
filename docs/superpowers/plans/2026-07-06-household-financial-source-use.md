# Household Financial Source Use Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owners opt accounts and payment methods into use by all household members in shared ledger entries.

**Architecture:** Store one `is_household_usable` boolean on each financial-source table. Reuse the existing account/payment-method APIs and money-source picker, and centralize enforcement in `assertLedgerFinancialSourceOwnership` before the existing balance-sync path.

**Tech Stack:** Next.js, TypeScript, Supabase/PostgreSQL, Zod, React Hook Form, TanStack Query, Vitest, Testing Library

---

### Task 1: Persist the household-use setting

**Files:**
- Create: `supabase/migrations/20260706000000_add_household_usable_to_financial_sources.sql`
- Modify: `types/supabase.ts`
- Modify: `schemas/account.ts`
- Modify: `schemas/payment-method.ts`
- Modify: `schemas/payment-method.test.ts`
- Modify: `lib/api/account.ts`
- Modify: `lib/api/payment-method.ts`

- [ ] **Step 1: Write failing schema tests**

Add tests proving create/update schemas accept `isHouseholdUsable`, default create input can omit it, and invalid non-booleans fail:

```ts
expect(createPaymentMethodSchema.parse({
  name: "가족카드",
  type: "credit_card",
  isHouseholdUsable: true,
}).isHouseholdUsable).toBe(true);
expect(updatePaymentMethodSchema.safeParse({
  isHouseholdUsable: "yes",
}).success).toBe(false);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `./node_modules/.bin/vitest run schemas/payment-method.test.ts`

Expected: FAIL because `isHouseholdUsable` is stripped or rejected.

- [ ] **Step 3: Add the migration and minimal schema/API mapping**

Migration:

```sql
alter table public.accounts
  add column is_household_usable boolean not null default false;

alter table public.payment_methods
  add column is_household_usable boolean not null default false;
```

Add `isHouseholdUsable: z.boolean().optional()` to create/update Zod schemas. Add the camel-case property to API parameter/detail interfaces, map it to/from `is_household_usable`, and add the generated column to account/payment-method `Row`, `Insert`, and `Update` types.

- [ ] **Step 4: Run focused tests and type-check**

Run:

```bash
./node_modules/.bin/vitest run schemas/payment-method.test.ts
./node_modules/.bin/tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260706000000_add_household_usable_to_financial_sources.sql types/supabase.ts schemas/account.ts schemas/payment-method.ts schemas/payment-method.test.ts lib/api/account.ts lib/api/payment-method.ts
git commit -m "feat: persist household financial source access"
```

### Task 2: Enforce shared-ledger financial-source access

**Files:**
- Modify: `lib/api/ledger.ts`
- Modify: `lib/api/ledger.test.ts`

- [ ] **Step 1: Write failing authorization tests**

Cover these cases through `assertLedgerFinancialSourceOwnership`:

```ts
it("공용 기록은 가구원 사용 허용 금융수단을 사용할 수 있다", async () => {
  await expect(assertLedgerFinancialSourceOwnership(supabase, {
    householdId: "household-1",
    ownerId: "member-1",
    isShared: true,
    accountIds: ["account-owned-by-member-2"],
  })).resolves.toBeUndefined();
});

it("개인 기록은 다른 가구원의 허용 금융수단도 거부한다", async () => {
  await expect(assertLedgerFinancialSourceOwnership(supabase, {
    householdId: "household-1",
    ownerId: "member-1",
    isShared: false,
    accountIds: ["account-owned-by-member-2"],
  })).rejects.toMatchObject({ status: 403 });
});
```

Also add one regression test proving a shared debit card can update its owner's linked account, and one proving deletion can reverse effects after permission is disabled.

- [ ] **Step 2: Run tests and verify RED**

Run: `./node_modules/.bin/vitest run lib/api/ledger.test.ts`

Expected: FAIL because ownership checks ignore `is_household_usable`.

- [ ] **Step 3: Implement the minimum central authorization change**

Select `is_household_usable` with each source. Accept `isShared` in the assertion input and allow a source when:

```ts
row.owner_id === input.ownerId ||
  (input.isShared && row.is_household_usable)
```

Pass `params.isShared` on create and `existing.is_shared` on update. Only reauthorize an existing non-owner source when the update changes its balance effects. Keep deletion record-owner guarded and let it reverse historical effects. Remove the redundant owner check inside private `applyLedgerBalanceEffects`; all mutation callers must authorize before applying effects or be a historical rollback/delete.

- [ ] **Step 4: Run focused tests**

Run: `./node_modules/.bin/vitest run lib/api/ledger.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/ledger.ts lib/api/ledger.test.ts
git commit -m "feat: authorize household ledger financial sources"
```

### Task 3: Filter ledger money-source choices

**Files:**
- Modify: `lib/ledger/money-source-options.ts`
- Modify: `lib/ledger/money-source-options.test.ts`
- Modify: `components/ledger/LedgerMoneySourceCombobox.tsx`
- Modify: `components/ledger/entry-composer/ComposerFormStep.tsx`
- Modify: `components/ledger/funnel/AddItemsStep.tsx`
- Modify: `components/ledger/funnel/AddTransferStep.tsx`
- Modify: `components/ledger/funnel/ConfirmStep.tsx`
- Modify: `components/ledger/LedgerEntryEditDialog.tsx`

- [ ] **Step 1: Write failing option-scope tests**

Extend option inputs with `isHouseholdUsable` and assert:

```ts
expect(scopeLedgerMoneySources({
  ownerId: "member-1",
  isShared: true,
  paymentMethods: [
    ownMethod,
    { ...otherMethod, isHouseholdUsable: true },
    { ...privateOtherMethod, isHouseholdUsable: false },
  ],
  accounts: [],
}).paymentMethods).toEqual([ownMethod, expect.objectContaining({
  id: otherMethod.id,
})]);
```

Add a personal-record assertion that returns only owned sources and an option-label assertion that includes `ownerName`.

- [ ] **Step 2: Run tests and verify RED**

Run: `./node_modules/.bin/vitest run lib/ledger/money-source-options.test.ts`

Expected: FAIL because scoping only supports owner/all-household modes.

- [ ] **Step 3: Replace owner-scope flags with record-aware filtering**

Make `scopeLedgerMoneySources` accept `isShared`. Keep owned sources; include non-owned sources only when `isShared && isHouseholdUsable`. Build descriptions with owner names as today, and pass each form's current `isShared` value into `LedgerMoneySourceCombobox` and `LedgerMoneySourcePickerPanel`.

When `ComposerFormStep` changes an item from shared to personal, clear selected account/payment-method/from/to values if the selected source is not owned by the current user.

In `ConfirmStep`, map each source to `${name} · ${ownerName}` so the final confirmation identifies the owner. In the edit dialog, keep the current source label visible even after permission is revoked, but do not offer that revoked source as a new choice.

- [ ] **Step 4: Run focused component and option tests**

Run:

```bash
./node_modules/.bin/vitest run lib/ledger/money-source-options.test.ts components/ledger/LedgerMoneySourceCombobox.test.tsx components/ledger/entry-composer/ComposerListStep.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ledger/money-source-options.ts lib/ledger/money-source-options.test.ts components/ledger/LedgerMoneySourceCombobox.tsx components/ledger/entry-composer/ComposerFormStep.tsx components/ledger/funnel/AddItemsStep.tsx components/ledger/funnel/AddTransferStep.tsx components/ledger/funnel/ConfirmStep.tsx components/ledger/LedgerEntryEditDialog.tsx
git commit -m "feat: show allowed household financial sources"
```

### Task 4: Add management controls and status badges

**Files:**
- Modify: `components/accounts/AccountNewForm.tsx`
- Modify: `components/accounts/AccountNewForm.test.tsx`
- Modify: `components/accounts/AccountFormDialog.tsx`
- Modify: `components/accounts/PaymentMethodNewForm.tsx`
- Modify: `components/accounts/PaymentMethodFormDialog.tsx`
- Modify: `components/accounts/AccountList.tsx`
- Modify: `components/accounts/AccountList.test.tsx`
- Modify: `components/accounts/PaymentMethodList.tsx`
- Modify: `components/accounts/PaymentMethodList.test.tsx`

- [ ] **Step 1: Write failing list tests**

Add assertions that an allowed source displays `가구원 사용 허용` and an owner-only source displays `소유자 전용`.

Add an account creation assertion that checking `가구원 사용 허용` sends `isHouseholdUsable: true`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
./node_modules/.bin/vitest run components/accounts/AccountNewForm.test.tsx components/accounts/AccountList.test.tsx components/accounts/PaymentMethodList.test.tsx
```

Expected: FAIL because no access-state badge exists.

- [ ] **Step 3: Add the minimal form control and badges**

Reuse `components/ui/checkbox.tsx`. Add `isHouseholdUsable: z.boolean()` with default `false` to each local form schema, render a labelled checkbox with:

```tsx
<Label>가구원 사용 허용</Label>
<p>공용 가계부 기록에서 모든 가구원이 사용할 수 있어요.</p>
```

Include the value in create/update payloads and reset edit forms from the API detail value. Render a compact status badge in both management lists.

- [ ] **Step 4: Run focused UI tests**

Run:

```bash
./node_modules/.bin/vitest run components/accounts/AccountList.test.tsx components/accounts/PaymentMethodList.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/accounts/AccountNewForm.tsx components/accounts/AccountNewForm.test.tsx components/accounts/AccountFormDialog.tsx components/accounts/PaymentMethodNewForm.tsx components/accounts/PaymentMethodFormDialog.tsx components/accounts/AccountList.tsx components/accounts/AccountList.test.tsx components/accounts/PaymentMethodList.tsx components/accounts/PaymentMethodList.test.tsx
git commit -m "feat: manage household financial source access"
```

### Task 5: Verify the feature

**Files:**
- Modify only files required by verification findings.

- [ ] **Step 1: Run all #412-focused tests**

```bash
./node_modules/.bin/vitest run schemas/payment-method.test.ts lib/api/ledger.test.ts lib/ledger/money-source-options.test.ts components/ledger/LedgerMoneySourceCombobox.test.tsx components/accounts/AccountList.test.tsx components/accounts/PaymentMethodList.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run static checks**

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/biome check .
```

Expected: PASS.

- [ ] **Step 3: Run the full test suite**

Run: `./node_modules/.bin/vitest run`

Expected: #412 tests pass; compare any failures with the three recorded baseline failures.

- [ ] **Step 4: Review migration and diff**

```bash
git diff --check HEAD~4
git status --short
```

Expected: no whitespace errors and no unintended files.
