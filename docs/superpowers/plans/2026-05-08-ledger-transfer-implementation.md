# Ledger Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ledger transfer records with server-side balance synchronization and transfer-only payment method filtering.

**Architecture:** Keep `ledger_entries` as the source of record for expense, income, and transfer events. Add auxiliary balances to `payment_methods` for `prepaid`, `gift_card`, and `cash`, but keep those balances out of total asset calculations. Put transfer validation and balance mutation in `lib/api/ledger.ts`, then expose it through the existing ledger entry routes and funnel UI.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL/RLS, TypeScript, Zod, React Hook Form, TanStack Query, Vitest, Tailwind/shadcn UI.

---

## File Structure

- Modify `supabase/migrations/20260508000000_add_payment_method_aux_balance.sql`: add nullable auxiliary balance fields to `payment_methods` and enforce non-negative balances.
- Modify `types/supabase.ts`: refresh generated table types for `payment_methods.balance` and `balance_updated_at`.
- Modify `schemas/payment-method.ts`: accept `balance` on create/update and document that only auxiliary payment method types use it.
- Modify `lib/api/payment-method.ts`: read/write balance fields, clear them for credit/debit cards, and expose them through `PaymentMethodWithDetails`.
- Modify `components/accounts/PaymentMethodNewForm.tsx`: show auxiliary balance input and guidance only for `prepaid`, `gift_card`, and `cash`.
- Modify `components/accounts/PaymentMethodFormDialog.tsx`: show/edit auxiliary balance input and guidance only for `prepaid`, `gift_card`, and `cash`.
- Modify `schemas/ledger-entry.ts`: add cross-field validation for transfer source/destination and no category.
- Modify `lib/api/ledger.ts`: add transfer-capable payment method helpers, transfer payload builder, balance mutation helpers, and create/delete balance synchronization.
- Modify `app/api/ledger-entries/route.ts`: route single creates through synchronized ledger creation.
- Modify `app/api/ledger-entries/batch/route.ts`: route batch creates through synchronized ledger creation for expense auxiliary-balance handling.
- Modify `app/api/ledger-entries/[id]/route.ts`: reverse balance effects on delete and reject transfer edit attempts.
- Modify `hooks/use-ledger-entries.ts`: add single create mutation for transfer saves and invalidate payment methods/accounts after balance changes.
- Modify `components/ledger/funnel/SelectTypeStep.tsx`: add transfer option.
- Create `components/ledger/funnel/AddTransferStep.tsx`: transfer-specific form with filtered payment methods.
- Modify `components/ledger/funnel/ConfirmStep.tsx`: support transfer confirmation details.
- Modify `components/ledger/funnel/LedgerFunnel.tsx`: branch to the transfer step and submit transfer payloads.
- Modify `components/ledger/records/LedgerEntryRow.tsx`: render transfers with neutral styling and source-to-destination metadata.
- Test `lib/api/ledger.test.ts`: payload helpers, summary exclusion, and transfer-capable filtering.
- Test `schemas/ledger-entry.test.ts`: transfer validation.
- Test `schemas/payment-method.test.ts`: auxiliary balance validation.
- Test `components/ledger/funnel/SelectTypeStep.test.tsx`: transfer option callback.

---

### Task 1: Payment Method Auxiliary Balance Schema

**Files:**
- Create: `supabase/migrations/20260508000000_add_payment_method_aux_balance.sql`
- Modify: `types/supabase.ts`
- Modify: `schemas/payment-method.ts`
- Test: `schemas/payment-method.test.ts`

- [ ] **Step 1: Write failing schema tests**

Add these tests to `schemas/payment-method.test.ts`:

```typescript
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "./payment-method";

describe("payment method auxiliary balance", () => {
  it("선불/상품권/현금은 보조잔액을 입력할 수 있다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카카오페이머니",
      type: "prepaid",
      balance: 30000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(30000);
    }
  });

  it("보조잔액은 0 이상이어야 한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "상품권",
      type: "gift_card",
      balance: -1,
    });

    expect(result.success).toBe(false);
  });

  it("수정 스키마도 보조잔액 null을 허용한다", () => {
    const result = updatePaymentMethodSchema.safeParse({
      type: "credit_card",
      balance: null,
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test schemas/payment-method.test.ts`

Expected: FAIL because `balance` is not in the payment method schemas.

- [ ] **Step 3: Add the migration**

Create `supabase/migrations/20260508000000_add_payment_method_aux_balance.sql`:

```sql
alter table public.payment_methods
  add column balance numeric(18, 2),
  add column balance_updated_at timestamptz,
  add constraint payment_methods_balance_non_negative
    check (balance is null or balance >= 0);

comment on column public.payment_methods.balance is
  'Auxiliary ledger balance for prepaid, gift_card, and cash payment methods. Excluded from total assets.';
```

- [ ] **Step 4: Update payment method schemas**

In `schemas/payment-method.ts`, add `balance` to create/update schemas:

```typescript
balance: z.number().min(0, "잔액은 0 이상이어야 합니다.").optional(),
```

and:

```typescript
balance: z
  .number()
  .min(0, "잔액은 0 이상이어야 합니다.")
  .nullable()
  .optional(),
```

- [ ] **Step 5: Refresh or patch generated types**

Run, if local Supabase is available: `pnpm supabase:types`

If local Supabase is unavailable, update `types/supabase.ts` manually for `payment_methods.Row`, `Insert`, and `Update`:

```typescript
balance: number | null;
balance_updated_at: string | null;
```

`Insert` and `Update` should use optional forms:

```typescript
balance?: number | null;
balance_updated_at?: string | null;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test schemas/payment-method.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260508000000_add_payment_method_aux_balance.sql types/supabase.ts schemas/payment-method.ts schemas/payment-method.test.ts
git commit -m "feat: add payment method auxiliary balance"
```

---

### Task 2: Payment Method API and Forms

**Files:**
- Modify: `lib/api/payment-method.ts`
- Modify: `components/accounts/PaymentMethodNewForm.tsx`
- Modify: `components/accounts/PaymentMethodFormDialog.tsx`
- Create: `lib/api/payment-method.test.ts`

- [ ] **Step 1: Write failing behavior tests for payload normalization**

Create `lib/api/payment-method.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { normalizePaymentMethodBalance } from "./payment-method";

describe("payment method balance payload", () => {
  it("선불/상품권/현금은 balance를 유지한다", () => {
    expect(normalizePaymentMethodBalance("prepaid", 30000)).toBe(30000);
    expect(normalizePaymentMethodBalance("gift_card", 20000)).toBe(20000);
    expect(normalizePaymentMethodBalance("cash", 10000)).toBe(10000);
  });

  it("신용카드와 체크카드는 balance를 null로 정규화한다", () => {
    expect(normalizePaymentMethodBalance("credit_card", 30000)).toBeNull();
    expect(normalizePaymentMethodBalance("debit_card", 30000)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/api/payment-method.test.ts`

Expected: FAIL because `normalizePaymentMethodBalance` is not exported.

- [ ] **Step 3: Update API types and writes**

In `lib/api/payment-method.ts`, add fields:

```typescript
const AUXILIARY_PAYMENT_METHOD_TYPES = new Set([
  "prepaid",
  "gift_card",
  "cash",
]);

function normalizePaymentMethodBalance(
  type: PaymentMethodType,
  balance?: number | null,
): number | null {
  return AUXILIARY_PAYMENT_METHOD_TYPES.has(type) ? (balance ?? null) : null;
}
```

Add `balance?: number | null` to `CreatePaymentMethodParams` and `UpdatePaymentMethodParams`, and add `balance`/`balanceUpdatedAt` to `PaymentMethodWithDetails`.

In create/update inserts, write:

```typescript
balance: normalizePaymentMethodBalance(type, balance),
balance_updated_at: balance != null ? new Date().toISOString() : null,
```

For update, use the new type when `params.type` is present, otherwise the existing type:

```typescript
const nextType = params.type ?? existing.type;
const nextBalance =
  params.balance !== undefined ? params.balance : existing.balance;
```

- [ ] **Step 4: Update new/edit forms**

In both payment method forms, define:

```typescript
const AUXILIARY_PAYMENT_METHOD_TYPES = ["prepaid", "gift_card", "cash"];
const AUXILIARY_BALANCE_HELP =
  "이 잔액은 가계부 기록을 정확하게 맞추기 위한 보조잔액이며, 총자산에는 포함되지 않습니다.";
```

Add `balanceStr` to each local form schema and defaults. Show the balance input only when:

```typescript
const showAuxiliaryBalance = AUXILIARY_PAYMENT_METHOD_TYPES.includes(watchType);
```

Render:

```tsx
{showAuxiliaryBalance && (
  <div className="space-y-2">
    <Label htmlFor="pm-balance">보조잔액</Label>
    <Input
      id="pm-balance"
      type="number"
      inputMode="numeric"
      min="0"
      placeholder="0"
      {...register("balanceStr")}
    />
    <p className="text-xs text-gray-500">{AUXILIARY_BALANCE_HELP}</p>
  </div>
)}
```

Convert on submit:

```typescript
const balance =
  showAuxiliaryBalance && data.balanceStr !== ""
    ? Number(data.balanceStr)
    : undefined;
```

Include `balance` in the payload only for auxiliary types.

- [ ] **Step 5: Run focused checks**

Run: `pnpm test lib/api/payment-method.test.ts schemas/payment-method.test.ts`

Expected: PASS.

Run: `pnpm type-check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api/payment-method.ts lib/api/payment-method.test.ts components/accounts/PaymentMethodNewForm.tsx components/accounts/PaymentMethodFormDialog.tsx
git commit -m "feat: support payment method auxiliary balances"
```

---

### Task 3: Ledger Validation and Transfer Helpers

**Files:**
- Modify: `schemas/ledger-entry.ts`
- Test: `schemas/ledger-entry.test.ts`
- Modify: `lib/api/ledger.ts`
- Test: `lib/api/ledger.test.ts`

- [ ] **Step 1: Write failing ledger schema tests**

Add to `schemas/ledger-entry.test.ts`:

```typescript
describe("transfer validation", () => {
  const base = {
    type: "transfer" as const,
    amount: 50000,
    transactedAt: "2026-05-08T00:00:00.000Z",
    title: "카카오페이 충전",
    isShared: true,
  };

  it("이체는 출발지와 도착지가 필요하다", () => {
    const result = createLedgerEntrySchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("이체는 카테고리를 가질 수 없다", () => {
    const result = createLedgerEntrySchema.safeParse({
      ...base,
      categoryId: "00000000-0000-0000-0000-000000000001",
      fromAccountId: "00000000-0000-0000-0000-000000000002",
      toAccountId: "00000000-0000-0000-0000-000000000003",
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run schema test to verify it fails**

Run: `pnpm test schemas/ledger-entry.test.ts`

Expected: FAIL because transfer cross-field validation is missing.

- [ ] **Step 3: Add transfer cross-field validation**

In `schemas/ledger-entry.ts`, add `superRefine` to create/update schemas. For create:

```typescript
export const createLedgerEntrySchema = baseCreateLedgerEntrySchema.superRefine(
  (value, ctx) => {
    if (value.type !== "transfer") return;

    const sourceCount = Number(Boolean(value.fromAccountId)) +
      Number(Boolean(value.fromPaymentMethodId));
    const destinationCount = Number(Boolean(value.toAccountId)) +
      Number(Boolean(value.toPaymentMethodId));

    if (sourceCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["fromAccountId"],
        message: "이체 출발지를 하나 선택해주세요.",
      });
    }

    if (destinationCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "이체 도착지를 하나 선택해주세요.",
      });
    }

    if (value.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "이체에는 카테고리를 선택할 수 없습니다.",
      });
    }
  },
);
```

- [ ] **Step 4: Write failing helper tests**

Add to `lib/api/ledger.test.ts`:

```typescript
import {
  buildTransferLedgerEntryPayload,
  isTransferCapablePaymentMethod,
} from "./ledger";

describe("transfer helpers", () => {
  it("이체 가능한 결제수단만 true를 반환한다", () => {
    expect(isTransferCapablePaymentMethod("prepaid")).toBe(true);
    expect(isTransferCapablePaymentMethod("gift_card")).toBe(true);
    expect(isTransferCapablePaymentMethod("cash")).toBe(true);
    expect(isTransferCapablePaymentMethod("credit_card")).toBe(false);
    expect(isTransferCapablePaymentMethod("debit_card")).toBe(false);
  });

  it("이체 payload는 카테고리 없이 출발지/도착지를 설정한다", () => {
    const result = buildTransferLedgerEntryPayload(true, {
      amount: "30000",
      title: "카카오페이 충전",
      fromAccountId: "acc-1",
      toPaymentMethodId: "pm-1",
      transactedAt: "2026-05-08",
      memo: "충전",
    });

    expect(result.type).toBe("transfer");
    expect(result.amount).toBe(30000);
    expect(result.fromAccountId).toBe("acc-1");
    expect(result.toPaymentMethodId).toBe("pm-1");
    expect(result.categoryId).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run helper test to verify it fails**

Run: `pnpm test lib/api/ledger.test.ts`

Expected: FAIL because helper exports do not exist.

- [ ] **Step 6: Implement helpers**

In `lib/api/ledger.ts`, add:

```typescript
export type TransferLocation =
  | { kind: "account"; id: string }
  | { kind: "paymentMethod"; id: string };

export interface TransferItemFormData {
  amount: string;
  title: string;
  from: TransferLocation;
  to: TransferLocation;
  transactedAt: string;
  memo?: string;
}

const TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES = new Set([
  "prepaid",
  "gift_card",
  "cash",
]);

export function isTransferCapablePaymentMethod(
  type: PaymentMethodType,
): boolean {
  return TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES.has(type);
}

export function buildTransferLedgerEntryPayload(
  isShared: boolean,
  item: TransferItemFormData,
): CreateLedgerEntryInput {
  const base: CreateLedgerEntryInput = {
    type: "transfer",
    amount: Number(item.amount),
    transactedAt: item.transactedAt.includes("T")
      ? item.transactedAt
      : `${item.transactedAt}T00:00:00.000Z`,
    title: item.title,
    isShared,
    memo: item.memo || undefined,
  };

  if (item.from.kind === "account") base.fromAccountId = item.from.id;
  if (item.from.kind === "paymentMethod") {
    base.fromPaymentMethodId = item.from.id;
  }
  if (item.to.kind === "account") base.toAccountId = item.to.id;
  if (item.to.kind === "paymentMethod") base.toPaymentMethodId = item.to.id;

  return base;
}
```

- [ ] **Step 7: Run tests**

Run: `pnpm test schemas/ledger-entry.test.ts lib/api/ledger.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add schemas/ledger-entry.ts schemas/ledger-entry.test.ts lib/api/ledger.ts lib/api/ledger.test.ts
git commit -m "feat: add transfer ledger validation helpers"
```

---

### Task 4: Server-Side Balance Synchronization

**Files:**
- Modify: `lib/api/ledger.ts`
- Modify: `app/api/ledger-entries/route.ts`
- Modify: `app/api/ledger-entries/batch/route.ts`
- Modify: `app/api/ledger-entries/[id]/route.ts`
- Modify: `hooks/use-ledger-entries.ts`
- Test: `lib/api/ledger.test.ts`

- [ ] **Step 1: Write failing pure balance-plan tests**

Add pure helpers to test before touching Supabase mutations:

```typescript
import { getLedgerBalanceEffects } from "./ledger";

describe("getLedgerBalanceEffects", () => {
  it("계좌에서 보조 결제수단으로 이체하면 계좌 감소와 결제수단 증가 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "transfer",
      amount: 50000,
      fromAccountId: "acc-1",
      toPaymentMethodId: "pm-1",
    });

    expect(effects).toEqual([
      { table: "accounts", id: "acc-1", delta: -50000 },
      { table: "payment_methods", id: "pm-1", delta: 50000 },
    ]);
  });

  it("보조 결제수단 지출은 결제수단 감소 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "expense",
      amount: 12000,
      fromPaymentMethodId: "pm-1",
    });

    expect(effects).toEqual([
      { table: "payment_methods", id: "pm-1", delta: -12000 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/api/ledger.test.ts`

Expected: FAIL because `getLedgerBalanceEffects` does not exist.

- [ ] **Step 3: Implement balance effect helper**

In `lib/api/ledger.ts`, add:

```typescript
export interface LedgerBalanceEffectInput {
  type: LedgerEntryType;
  amount: number;
  fromAccountId?: string | null;
  fromPaymentMethodId?: string | null;
  toAccountId?: string | null;
  toPaymentMethodId?: string | null;
}

export interface LedgerBalanceEffect {
  table: "accounts" | "payment_methods";
  id: string;
  delta: number;
}

export function getLedgerBalanceEffects(
  input: LedgerBalanceEffectInput,
): LedgerBalanceEffect[] {
  if (input.type === "transfer") {
    return [
      input.fromAccountId && {
        table: "accounts" as const,
        id: input.fromAccountId,
        delta: -input.amount,
      },
      input.fromPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.fromPaymentMethodId,
        delta: -input.amount,
      },
      input.toAccountId && {
        table: "accounts" as const,
        id: input.toAccountId,
        delta: input.amount,
      },
      input.toPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.toPaymentMethodId,
        delta: input.amount,
      },
    ].filter(Boolean) as LedgerBalanceEffect[];
  }

  if (input.type === "expense" && input.fromPaymentMethodId) {
    return [
      {
        table: "payment_methods",
        id: input.fromPaymentMethodId,
        delta: -input.amount,
      },
    ];
  }

  return [];
}
```

- [ ] **Step 4: Add synchronized create/delete functions**

In `lib/api/ledger.ts`, add `createLedgerEntryWithBalanceSync` and
`deleteLedgerEntryWithBalanceSync`. Use existing `createLedgerEntry` internally
after validating locations.

Server validation must:

- fetch accounts/payment methods used by the entry
- verify household ownership
- verify transfer payment methods pass `isTransferCapablePaymentMethod`
- reject source balance overdraft when current balance is not null
- apply balance deltas and update `balance_updated_at`
- insert/delete the ledger entry

Use `APIError("LEDGER_INVALID_TRANSFER_TARGET", "...", 400)` for invalid
credit/debit transfer endpoints, and `APIError("LEDGER_INSUFFICIENT_BALANCE", "...", 400)` for insufficient auxiliary balances.

- [ ] **Step 5: Route creates/deletes through synchronized functions**

Update `app/api/ledger-entries/route.ts` and batch route to call
`createLedgerEntryWithBalanceSync`. Update delete route to call
`deleteLedgerEntryWithBalanceSync`. Keep PATCH conservative:

```typescript
if (existing.type === "transfer") {
  throw new APIError(
    "LEDGER_TRANSFER_EDIT_UNSUPPORTED",
    "이체 기록은 삭제 후 다시 등록해주세요.",
    400,
  );
}
```

- [ ] **Step 6: Update invalidation**

In `hooks/use-ledger-entries.ts`, add `useCreateLedgerEntry` for single
transfer saves and invalidate:

```typescript
queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
queryClient.invalidateQueries({ queryKey: queries.accounts._def });
queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
```

Do the same after batch create/update/delete.

- [ ] **Step 7: Run tests and type-check**

Run: `pnpm test lib/api/ledger.test.ts`

Expected: PASS.

Run: `pnpm type-check`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/api/ledger.ts app/api/ledger-entries/route.ts app/api/ledger-entries/batch/route.ts app/api/ledger-entries/[id]/route.ts hooks/use-ledger-entries.ts lib/api/ledger.test.ts
git commit -m "feat: sync ledger transfer balances"
```

---

### Task 5: Transfer Funnel UI

**Files:**
- Modify: `components/ledger/funnel/SelectTypeStep.tsx`
- Create: `components/ledger/funnel/AddTransferStep.tsx`
- Modify: `components/ledger/funnel/ConfirmStep.tsx`
- Modify: `components/ledger/funnel/LedgerFunnel.tsx`
- Test: `components/ledger/funnel/SelectTypeStep.test.tsx`

- [ ] **Step 1: Write failing select-type test**

Create `components/ledger/funnel/SelectTypeStep.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectTypeStep } from "./SelectTypeStep";

describe("SelectTypeStep", () => {
  it("이체 유형을 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<SelectTypeStep onSelect={onSelect} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /이체/ }));

    expect(onSelect).toHaveBeenCalledWith("transfer");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/ledger/funnel/SelectTypeStep.test.tsx`

Expected: FAIL because `SelectTypeStep` does not expose transfer.

- [ ] **Step 3: Add transfer option**

Update `SelectTypeStepProps`:

```typescript
onSelect: (type: "expense" | "income" | "transfer") => void;
```

Add a third button with `ArrowRightLeftIcon` and copy:

```tsx
<p className="text-lg font-semibold text-gray-900">이체</p>
<p className="text-sm text-gray-500">계좌, 선불페이, 상품권 간 이동</p>
```

- [ ] **Step 4: Create transfer form**

Create `components/ledger/funnel/AddTransferStep.tsx` using React Hook Form.
Filter payment methods with:

```typescript
const transferCapablePaymentMethods = paymentMethods.filter((pm) =>
  isTransferCapablePaymentMethod(pm.type),
);
```

Source and destination options must include accounts and filtered payment
methods. Destination must exclude the selected source. Render the guidance:

```tsx
<p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
  선불/상품권/현금 잔액은 가계부용 보조잔액이며 총자산에는 포함되지 않습니다.
</p>
```

Also render:

```tsx
<p className="text-xs text-gray-500">
  타인에게 보낸 돈은 이체가 아니라 지출로 기록해주세요.
</p>
```

- [ ] **Step 5: Wire funnel**

Update `LedgerFunnelContext`:

```typescript
AddTransfer: {
  isShared: boolean;
};
Confirm: {
  type: "expense" | "income" | "transfer";
  isShared: boolean;
  items?: LedgerItemFormData[];
  transferItem?: TransferItemFormData;
};
```

Route `transfer` to `AddTransfer`, then to `Confirm`. Submit transfers with
`buildTransferLedgerEntryPayload` and `useCreateLedgerEntry`.

- [ ] **Step 6: Update confirmation**

Let `ConfirmStep` accept transfer items and display source to destination:

```typescript
const typeLabel =
  type === "expense" ? "지출" : type === "income" ? "수입" : "이체";
```

For transfer save button, use `1건 저장하기`.

- [ ] **Step 7: Run UI tests and type-check**

Run: `pnpm test components/ledger/funnel/SelectTypeStep.test.tsx`

Expected: PASS.

Run: `pnpm type-check`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/ledger/funnel/SelectTypeStep.tsx components/ledger/funnel/SelectTypeStep.test.tsx components/ledger/funnel/AddTransferStep.tsx components/ledger/funnel/ConfirmStep.tsx components/ledger/funnel/LedgerFunnel.tsx
git commit -m "feat: add ledger transfer funnel"
```

---

### Task 6: Transfer Display and Final Verification

**Files:**
- Modify: `components/ledger/records/LedgerEntryRow.tsx`
- Modify: `components/ledger/LedgerEntryEditDialog.tsx`

- [ ] **Step 1: Update row display**

In `LedgerEntryRow.tsx`, add transfer semantics:

```typescript
const isTransfer = entry.type === "transfer";
const amountSign = isTransfer ? "" : isIncome ? "+" : "-";
const amountColor = isTransfer
  ? "text-gray-900"
  : isIncome
    ? "text-red-500"
    : "text-blue-500";

const transferLabel =
  isTransfer
    ? `${entry.fromAccountName ?? entry.fromPaymentMethodName ?? "출발지"} → ${
        entry.toAccountName ?? entry.toPaymentMethodName ?? "도착지"
      }`
    : null;
```

Use `transferLabel` in metadata before owner name.

- [ ] **Step 2: Disable transfer editing**

In `LedgerEntryEditDialog.tsx`, return an informational dialog body for
`entry.type === "transfer"`:

```tsx
<p className="text-sm text-muted-foreground">
  이체 기록은 삭제 후 다시 등록해주세요.
</p>
```

Keep delete available from the row menu.

- [ ] **Step 3: Run focused tests**

Run:

```bash
pnpm test schemas/payment-method.test.ts schemas/ledger-entry.test.ts lib/api/ledger.test.ts components/ledger/funnel/SelectTypeStep.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run full verification**

Run:

```bash
pnpm test
pnpm type-check
pnpm lint
```

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ledger/records/LedgerEntryRow.tsx components/ledger/LedgerEntryEditDialog.tsx
git commit -m "feat: display ledger transfers"
```

---

## Self-Review

- Spec coverage: The plan covers auxiliary payment method balances, transfer-capable filtering, account/payment method transfer semantics, expense auxiliary balance effects, unsupported credit/debit transfer endpoints, user guidance copy, neutral transfer display, and conservative transfer editing.
- Scope control: Total asset inclusion, separate prepaid wallet tables, debit card linked-account withdrawal, and credit card lifecycle remain out of scope.
- Placeholder scan: No open placeholder steps remain. Each task includes target files, tests, commands, expected outcomes, and commit boundaries.
- Type consistency: The plan consistently uses `PaymentMethodType`, `CreateLedgerEntryInput`, `TransferItemFormData`, `TransferLocation`, `balance`, and `balanceUpdatedAt`.
