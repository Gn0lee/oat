# Record Change Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the #343 Record Change Request foundation: database model, validation, server helpers, and minimal APIs for creating, listing, cancelling, and resolving shared-record change requests.

**Architecture:** `record_change_requests` is the request ledger; `notifications` remains a derived recipient message store. Requests use a typed reference (`target_type`, `target_id`) and target-specific server validators to preserve owner-only edit rules while letting non-owners ask for update/delete changes.

**Tech Stack:** Next.js App Router route handlers, Supabase PostgreSQL/RLS, Supabase JS, Zod 4, Vitest, existing `APIError` and notification helpers.

---

## File Structure

- Create: `supabase/migrations/20260601010000_create_record_change_requests.sql`
  - Adds request enums, `record_change_requests`, indexes, and RLS policies.
- Create: `schemas/record-change-request.ts`
  - Zod schemas for create/list/cancel/resolve route inputs.
- Create: `schemas/record-change-request.test.ts`
  - Red-green tests for request input validation.
- Create: `lib/api/record-change-requests.ts`
  - Target validation, snapshot creation, request CRUD/action helpers, notification creation.
- Create: `lib/api/record-change-requests.test.ts`
  - Red-green tests for permissions, pending uniqueness mapping, target validation, and notification behavior.
- Create: `app/api/record-change-requests/route.ts`
  - `GET` list and `POST` create.
- Create: `app/api/record-change-requests/[id]/route.ts`
  - `GET` detail.
- Create: `app/api/record-change-requests/[id]/cancel/route.ts`
  - `POST` cancel.
- Create: `app/api/record-change-requests/[id]/resolve/route.ts`
  - `POST` approve/reject.
- Modify: `types/supabase.ts`
  - Regenerate after migration via `pnpm supabase:types`.

---

### Task 1: Add Request Input Schemas

**Files:**
- Create: `schemas/record-change-request.ts`
- Create: `schemas/record-change-request.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `schemas/record-change-request.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createRecordChangeRequestSchema,
  listRecordChangeRequestsSchema,
  resolveRecordChangeRequestSchema,
} from "./record-change-request";

const uuid = "00000000-0000-0000-0000-000000000001";

describe("createRecordChangeRequestSchema", () => {
  it("수정 요청은 대상, 요청 유형, 변경안을 허용한다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "ledger_entry",
      targetId: uuid,
      requestType: "update",
      message: "금액이 잘못된 것 같아요.",
      proposedChanges: { amount: 12000, memo: "정정 요청" },
    });

    expect(result.success).toBe(true);
  });

  it("삭제 요청은 proposedChanges 없이 메시지만으로 생성할 수 있다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "stock_transaction",
      targetId: uuid,
      requestType: "delete",
      message: "중복 등록된 거래입니다.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proposedChanges).toEqual({});
    }
  });

  it("알 수 없는 대상 유형은 거부한다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "payment_method",
      targetId: uuid,
      requestType: "update",
      proposedChanges: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("listRecordChangeRequestsSchema", () => {
  it("box와 status 필터를 파싱한다", () => {
    const result = listRecordChangeRequestsSchema.safeParse({
      box: "received",
      status: "pending",
    });

    expect(result.success).toBe(true);
  });
});

describe("resolveRecordChangeRequestSchema", () => {
  it("승인 결정을 파싱한다", () => {
    const result = resolveRecordChangeRequestSchema.safeParse({
      decision: "approved",
    });

    expect(result.success).toBe(true);
  });

  it("거절 응답 메시지를 파싱한다", () => {
    const result = resolveRecordChangeRequestSchema.safeParse({
      decision: "rejected",
      responseMessage: "이미 제가 수정했습니다.",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test schemas/record-change-request.test.ts
```

Expected: FAIL because `schemas/record-change-request.ts` does not exist.

- [ ] **Step 3: Add minimal schema implementation**

Create `schemas/record-change-request.ts`:

```ts
import { z } from "zod";

export const recordChangeRequestTargetTypeSchema = z.enum([
  "ledger_entry",
  "stock_transaction",
]);

export const recordChangeRequestTypeSchema = z.enum(["update", "delete"]);

export const recordChangeRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const createRecordChangeRequestSchema = z.object({
  targetType: recordChangeRequestTargetTypeSchema,
  targetId: z.uuid("유효한 대상 ID가 아닙니다."),
  requestType: recordChangeRequestTypeSchema,
  message: z.string().max(1000, "메시지는 1000자 이내여야 합니다.").optional(),
  proposedChanges: z.record(z.string(), z.unknown()).default({}),
});

export type CreateRecordChangeRequestInput = z.infer<
  typeof createRecordChangeRequestSchema
>;

export const listRecordChangeRequestsSchema = z.object({
  box: z.enum(["received", "sent"]).optional(),
  status: recordChangeRequestStatusSchema.optional(),
});

export type ListRecordChangeRequestsInput = z.infer<
  typeof listRecordChangeRequestsSchema
>;

export const resolveRecordChangeRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  responseMessage: z
    .string()
    .max(1000, "응답 메시지는 1000자 이내여야 합니다.")
    .optional(),
});

export type ResolveRecordChangeRequestInput = z.infer<
  typeof resolveRecordChangeRequestSchema
>;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test schemas/record-change-request.test.ts
```

Expected: PASS.

---

### Task 2: Add Database Model

**Files:**
- Create: `supabase/migrations/20260601010000_create_record_change_requests.sql`
- Modify: `types/supabase.ts`

- [ ] **Step 1: Add migration**

Create `supabase/migrations/20260601010000_create_record_change_requests.sql`:

```sql
-- Record Change Request foundation

create type record_change_request_target_type as enum (
  'ledger_entry',
  'stock_transaction'
);

create type record_change_request_type as enum (
  'update',
  'delete'
);

create type record_change_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create table public.record_change_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_owner_id uuid not null references public.profiles(id) on delete cascade,
  target_type record_change_request_target_type not null,
  target_id uuid not null,
  request_type record_change_request_type not null,
  status record_change_request_status not null default 'pending',
  message text,
  proposed_changes jsonb not null default '{}'::jsonb,
  target_snapshot jsonb not null default '{}'::jsonb,
  response_message text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint record_change_requests_non_owner_check
    check (requester_id <> target_owner_id),
  constraint record_change_requests_proposed_changes_object_check
    check (jsonb_typeof(proposed_changes) = 'object'),
  constraint record_change_requests_target_snapshot_object_check
    check (jsonb_typeof(target_snapshot) = 'object')
);

create index record_change_requests_requester_created_at_idx
  on public.record_change_requests(requester_id, created_at desc, id desc);

create index record_change_requests_target_owner_created_at_idx
  on public.record_change_requests(target_owner_id, created_at desc, id desc);

create index record_change_requests_target_idx
  on public.record_change_requests(target_type, target_id);

create unique index record_change_requests_pending_unique
  on public.record_change_requests(requester_id, target_type, target_id, request_type)
  where status = 'pending';

alter table public.record_change_requests enable row level security;

create policy "Users can view own record change requests"
  on public.record_change_requests for select
  using (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  );

create policy "Users can create own record change requests"
  on public.record_change_requests for insert
  with check (requester_id = (select auth.uid()));

create policy "Users can update own actionable record change requests"
  on public.record_change_requests for update
  using (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  )
  with check (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  );
```

- [ ] **Step 2: Regenerate Supabase types**

Run:

```bash
pnpm supabase:types
```

Expected: `types/supabase.ts` includes `record_change_requests` and the three new enums.

- [ ] **Step 3: Verify generated type names**

Run:

```bash
rg "record_change_requests|record_change_request_status" types/supabase.ts
```

Expected: matches for table and enum definitions.

---

### Task 3: Add Core API Helpers and Target Validation

**Files:**
- Create: `lib/api/record-change-requests.ts`
- Create: `lib/api/record-change-requests.test.ts`

- [ ] **Step 1: Write failing tests for target validation**

Create `lib/api/record-change-requests.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import {
  buildRecordChangeRequestInsert,
  getRecordChangeRequestListQuery,
  validateRecordChangeRequestTarget,
} from "./record-change-requests";

const sharedLedgerEntry = {
  id: "entry-1",
  household_id: "household-1",
  owner_id: "owner-1",
  type: "expense",
  amount: 12000,
  title: "점심",
  category_id: "category-1",
  is_shared: true,
  memo: "김밥",
  transacted_at: "2026-06-01T00:00:00.000Z",
  categories: { name: "식비", icon: "utensils" },
  profiles: { name: "소유자" },
};

function createTargetSupabaseMock(row: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
  };

  return {
    from: vi.fn(() => builder),
    builder,
  };
}

describe("validateRecordChangeRequestTarget", () => {
  it("공용 가계부 기록의 대상 소유자와 스냅샷을 만든다", async () => {
    const supabase = createTargetSupabaseMock(sharedLedgerEntry);

    const result = await validateRecordChangeRequestTarget(
      supabase as never,
      "requester-1",
      {
        targetType: "ledger_entry",
        targetId: "entry-1",
      },
    );

    expect(result).toEqual({
      householdId: "household-1",
      targetOwnerId: "owner-1",
      targetSnapshot: {
        targetType: "ledger_entry",
        ownerName: "소유자",
        transactedAt: "2026-06-01T00:00:00.000Z",
        title: "점심",
        amount: 12000,
        type: "expense",
        categoryName: "식비",
        isShared: true,
      },
    });
  });

  it("개인 가계부 기록은 요청 대상으로 거부한다", async () => {
    const supabase = createTargetSupabaseMock({
      ...sharedLedgerEntry,
      is_shared: false,
    });

    await expect(
      validateRecordChangeRequestTarget(supabase as never, "requester-1", {
        targetType: "ledger_entry",
        targetId: "entry-1",
      }),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "개인 가계부 기록은 요청 대상이 될 수 없습니다.",
        400,
      ),
    );
  });

  it("대상 소유자는 본인 기록에 요청을 만들 수 없다", async () => {
    const supabase = createTargetSupabaseMock(sharedLedgerEntry);

    await expect(
      validateRecordChangeRequestTarget(supabase as never, "owner-1", {
        targetType: "ledger_entry",
        targetId: "entry-1",
      }),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_SELF_TARGET",
        "본인 기록에는 변경 요청을 만들 수 없습니다.",
        400,
      ),
    );
  });
});

describe("buildRecordChangeRequestInsert", () => {
  it("request body의 owner 값 없이 서버 검증 결과로 insert payload를 만든다", () => {
    const result = buildRecordChangeRequestInsert({
      requesterId: "requester-1",
      targetType: "ledger_entry",
      targetId: "entry-1",
      requestType: "update",
      message: "금액 확인 부탁드립니다.",
      proposedChanges: { amount: 13000 },
      validatedTarget: {
        householdId: "household-1",
        targetOwnerId: "owner-1",
        targetSnapshot: { title: "점심" },
      },
    });

    expect(result).toMatchObject({
      household_id: "household-1",
      requester_id: "requester-1",
      target_owner_id: "owner-1",
      target_type: "ledger_entry",
      target_id: "entry-1",
      request_type: "update",
      status: "pending",
      message: "금액 확인 부탁드립니다.",
      proposed_changes: { amount: 13000 },
      target_snapshot: { title: "점심" },
    });
  });
});

describe("getRecordChangeRequestListQuery", () => {
  it("received box는 target_owner_id로 필터링한다", () => {
    const query = getRecordChangeRequestListQuery("user-1", {
      box: "received",
      status: "pending",
    });

    expect(query).toEqual({
      ownerColumn: "target_owner_id",
      ownerId: "user-1",
      status: "pending",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test lib/api/record-change-requests.test.ts
```

Expected: FAIL because `lib/api/record-change-requests.ts` does not exist.

- [ ] **Step 3: Add helper implementation**

Create `lib/api/record-change-requests.ts` with these exported functions and interfaces:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { createUserNotification } from "@/lib/api/notifications";
import type {
  CreateRecordChangeRequestInput,
  ListRecordChangeRequestsInput,
} from "@/schemas/record-change-request";
import type { Database, Json, RecordChangeRequest } from "@/types";

export interface ValidatedRecordChangeRequestTarget {
  householdId: string;
  targetOwnerId: string;
  targetSnapshot: Record<string, unknown>;
}

export interface BuildRecordChangeRequestInsertInput
  extends CreateRecordChangeRequestInput {
  requesterId: string;
  validatedTarget: ValidatedRecordChangeRequestTarget;
}

export function buildRecordChangeRequestInsert(
  input: BuildRecordChangeRequestInsertInput,
) {
  return {
    household_id: input.validatedTarget.householdId,
    requester_id: input.requesterId,
    target_owner_id: input.validatedTarget.targetOwnerId,
    target_type: input.targetType,
    target_id: input.targetId,
    request_type: input.requestType,
    status: "pending" as const,
    message: input.message ?? null,
    proposed_changes: input.proposedChanges as Json,
    target_snapshot: input.validatedTarget.targetSnapshot as Json,
  };
}

export function getRecordChangeRequestListQuery(
  userId: string,
  options: ListRecordChangeRequestsInput,
) {
  return {
    ownerColumn: options.box === "sent" ? "requester_id" : "target_owner_id",
    ownerId: userId,
    status: options.status,
  };
}

export async function validateRecordChangeRequestTarget(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  input: Pick<CreateRecordChangeRequestInput, "targetType" | "targetId">,
): Promise<ValidatedRecordChangeRequestTarget> {
  if (input.targetType === "ledger_entry") {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select(
        `
        id,
        household_id,
        owner_id,
        type,
        amount,
        title,
        category_id,
        is_shared,
        memo,
        transacted_at,
        categories(name, icon),
        profiles!ledger_entries_owner_id_fkey(name)
      `,
      )
      .eq("id", input.targetId)
      .single();

    if (error || !data) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_NOT_FOUND",
        "요청 대상 기록을 찾을 수 없습니다.",
        404,
      );
    }

    if (data.owner_id === requesterId) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_SELF_TARGET",
        "본인 기록에는 변경 요청을 만들 수 없습니다.",
        400,
      );
    }

    if (!data.is_shared) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "개인 가계부 기록은 요청 대상이 될 수 없습니다.",
        400,
      );
    }

    const category = data.categories as { name: string | null } | null;
    const owner = data.profiles as { name: string | null } | null;

    return {
      householdId: data.household_id,
      targetOwnerId: data.owner_id,
      targetSnapshot: {
        targetType: "ledger_entry",
        ownerName: owner?.name ?? "알 수 없음",
        transactedAt: data.transacted_at,
        title: data.title,
        amount: Number(data.amount),
        type: data.type,
        categoryName: category?.name ?? null,
        isShared: data.is_shared,
      },
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      household_id,
      owner_id,
      ticker,
      type,
      quantity,
      price,
      transacted_at,
      account_id,
      profiles!transactions_owner_id_fkey(name)
    `,
    )
    .eq("id", input.targetId)
    .single();

  if (error || !data) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_TARGET_NOT_FOUND",
      "요청 대상 기록을 찾을 수 없습니다.",
      404,
    );
  }

  if (data.owner_id === requesterId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_SELF_TARGET",
      "본인 기록에는 변경 요청을 만들 수 없습니다.",
      400,
    );
  }

  const owner = data.profiles as { name: string | null } | null;

  return {
    householdId: data.household_id,
    targetOwnerId: data.owner_id,
    targetSnapshot: {
      targetType: "stock_transaction",
      ownerName: owner?.name ?? "알 수 없음",
      transactedAt: data.transacted_at,
      ticker: data.ticker,
      type: data.type,
      quantity: Number(data.quantity),
      price: Number(data.price),
      accountId: data.account_id,
    },
  };
}

export async function createRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  input: CreateRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const validatedTarget = await validateRecordChangeRequestTarget(
    supabase,
    requesterId,
    input,
  );

  const payload = buildRecordChangeRequestInsert({
    ...input,
    requesterId,
    validatedTarget,
  });

  const { data, error } = await supabase
    .from("record_change_requests")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_ALREADY_PENDING",
        "이미 대기 중인 변경 요청이 있습니다.",
        409,
      );
    }
    throw error;
  }

  const type =
    input.targetType === "ledger_entry"
      ? "ledger_record_change_request"
      : "stock_transaction_change_request";

  await createUserNotification({
    recipientId: validatedTarget.targetOwnerId,
    householdId: validatedTarget.householdId,
    type,
    title: "수정/삭제 요청이 도착했습니다",
    body: input.message ?? null,
    link: {
      kind: "record_change_request_detail",
      params: { requestId: data.id },
    },
    source: { type: "record_change_request", id: data.id },
    dedupeKey: `record_change_request_created:${data.id}`,
  });

  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test lib/api/record-change-requests.test.ts
```

Expected: PASS.

---

### Task 4: Add List, Detail, Cancel, Resolve Helpers

**Files:**
- Modify: `lib/api/record-change-requests.ts`
- Modify: `lib/api/record-change-requests.test.ts`

- [ ] **Step 1: Add failing tests for status actions**

Append tests to `lib/api/record-change-requests.test.ts`:

```ts
import {
  assertCanCancelRecordChangeRequest,
  assertCanResolveRecordChangeRequest,
} from "./record-change-requests";

describe("status action guards", () => {
  const pendingRequest = {
    id: "request-1",
    requester_id: "requester-1",
    target_owner_id: "owner-1",
    status: "pending",
  };

  it("요청자만 pending 요청을 취소할 수 있다", () => {
    expect(() =>
      assertCanCancelRecordChangeRequest(pendingRequest, "requester-1"),
    ).not.toThrow();
    expect(() =>
      assertCanCancelRecordChangeRequest(pendingRequest, "owner-1"),
    ).toThrow(APIError);
  });

  it("대상 소유자만 pending 요청을 처리할 수 있다", () => {
    expect(() =>
      assertCanResolveRecordChangeRequest(pendingRequest, "owner-1"),
    ).not.toThrow();
    expect(() =>
      assertCanResolveRecordChangeRequest(pendingRequest, "requester-1"),
    ).toThrow(APIError);
  });

  it("terminal 상태 요청은 취소하거나 처리할 수 없다", () => {
    const approvedRequest = { ...pendingRequest, status: "approved" };
    expect(() =>
      assertCanCancelRecordChangeRequest(approvedRequest, "requester-1"),
    ).toThrow(APIError);
    expect(() =>
      assertCanResolveRecordChangeRequest(approvedRequest, "owner-1"),
    ).toThrow(APIError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test lib/api/record-change-requests.test.ts
```

Expected: FAIL because guard functions are missing.

- [ ] **Step 3: Add action helper implementation**

Add to `lib/api/record-change-requests.ts`:

```ts
type RequestActionRow = Pick<
  RecordChangeRequest,
  "id" | "requester_id" | "target_owner_id" | "status"
>;

export function assertCanCancelRecordChangeRequest(
  request: RequestActionRow,
  userId: string,
) {
  if (request.status !== "pending") {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_NOT_PENDING",
      "대기 중인 요청만 취소할 수 있습니다.",
      400,
    );
  }
  if (request.requester_id !== userId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_FORBIDDEN",
      "요청자만 요청을 취소할 수 있습니다.",
      403,
    );
  }
}

export function assertCanResolveRecordChangeRequest(
  request: RequestActionRow,
  userId: string,
) {
  if (request.status !== "pending") {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_NOT_PENDING",
      "대기 중인 요청만 처리할 수 있습니다.",
      400,
    );
  }
  if (request.target_owner_id !== userId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_FORBIDDEN",
      "대상 기록 소유자만 요청을 처리할 수 있습니다.",
      403,
    );
  }
}
```

Then add `getRecordChangeRequestById`, `listRecordChangeRequests`, `cancelRecordChangeRequest`, and `resolveRecordChangeRequest` using:

```ts
await supabase
  .from("record_change_requests")
  .select("*")
```

For #343, `resolveRecordChangeRequest(..., { decision: "approved" })` updates status to `approved` only after calling a local `applyApprovedRecordChangeRequest` function. Implement that function to throw:

```ts
throw new APIError(
  "RECORD_CHANGE_REQUEST_APPLY_NOT_IMPLEMENTED",
  "요청 승인 반영은 대상 도메인 구현에서 처리해야 합니다.",
  501,
);
```

This preserves the agreed meaning of `approved`: do not mark approved until #344/#346 wire in actual source-record mutation.

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm test lib/api/record-change-requests.test.ts
```

Expected: PASS.

---

### Task 5: Add Route Handlers

**Files:**
- Create: `app/api/record-change-requests/route.ts`
- Create: `app/api/record-change-requests/[id]/route.ts`
- Create: `app/api/record-change-requests/[id]/cancel/route.ts`
- Create: `app/api/record-change-requests/[id]/resolve/route.ts`

- [ ] **Step 1: Add collection route**

Create `app/api/record-change-requests/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  createRecordChangeRequest,
  listRecordChangeRequests,
} from "@/lib/api/record-change-requests";
import { createClient } from "@/lib/supabase/server";
import {
  createRecordChangeRequestSchema,
  listRecordChangeRequestsSchema,
} from "@/schemas/record-change-request";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const input = listRecordChangeRequestsSchema.parse({
      box: request.nextUrl.searchParams.get("box") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const data = await listRecordChangeRequests(supabase, user.id, input);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const input = createRecordChangeRequestSchema.parse(body);
    const data = await createRecordChangeRequest(supabase, user.id, input);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Add detail/action routes**

Create the remaining route handlers with the same auth/error pattern:

```ts
// app/api/record-change-requests/[id]/route.ts
const data = await getRecordChangeRequestById(supabase, user.id, id);
return NextResponse.json({ data });
```

```ts
// app/api/record-change-requests/[id]/cancel/route.ts
const data = await cancelRecordChangeRequest(supabase, user.id, id);
return NextResponse.json({ data });
```

```ts
// app/api/record-change-requests/[id]/resolve/route.ts
const body = await request.json();
const input = resolveRecordChangeRequestSchema.parse(body);
const data = await resolveRecordChangeRequest(supabase, user.id, id, input);
return NextResponse.json({ data });
```

- [ ] **Step 3: Run route-related typecheck**

Run:

```bash
pnpm type-check
```

Expected: PASS.

---

### Task 6: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test schemas/record-change-request.test.ts lib/api/record-change-requests.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 4: Run lint/check**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Inspect git diff**

Run:

```bash
git diff --stat
git diff -- .claude/docs/NOTIFICATIONS.md docs/superpowers/plans/2026-06-01-record-change-requests.md schemas/record-change-request.ts lib/api/record-change-requests.ts app/api/record-change-requests
```

Expected: Changes match #343 only; no unrelated rewrites.

---

## Spec Coverage Check

- Request storage with requester, target owner, target type/id, request type, status, message: Task 2 and Task 3.
- Statuses `pending`, `approved`, `rejected`, `cancelled`: Task 1 and Task 2.
- Personal ledger records cannot be targets: Task 3.
- Users who cannot view target records cannot create requests: Task 3 relies on target queries through the authenticated Supabase client and converts not-found into target-not-found.
- Minimal create/list/cancel/resolve APIs: Task 5.
- Notification preference does not control request persistence: Task 3 creates request first and then derives User Notification.
