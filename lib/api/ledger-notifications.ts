import type { SupabaseClient } from "@supabase/supabase-js";
import { formatKst } from "@/lib/date";
import type { Database, LedgerEntry } from "@/types";
import { createUserNotification } from "./notifications";

type LedgerNotificationEntry = Pick<
  LedgerEntry,
  | "id"
  | "household_id"
  | "owner_id"
  | "amount"
  | "title"
  | "is_shared"
  | "transacted_at"
  | "updated_at"
>;

interface LedgerNotificationBaseInput {
  actorId: string;
  householdId: string;
}

interface LedgerEntryCreatedInput extends LedgerNotificationBaseInput {
  entry: LedgerNotificationEntry;
}

interface BatchLedgerEntriesCreatedInput extends LedgerNotificationBaseInput {
  entries: LedgerNotificationEntry[];
}

interface LedgerEntryUpdatedInput {
  actorId: string;
  previousEntry: LedgerNotificationEntry;
  updatedEntry: LedgerNotificationEntry;
}

interface LedgerEntryDeletedInput {
  actorId: string;
  entry: LedgerNotificationEntry;
}

async function getHouseholdNotificationRecipients(
  supabase: SupabaseClient<Database>,
  householdId: string,
  actorId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .neq("user_id", actorId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((member) => member.user_id);
}

async function getActorName(
  supabase: SupabaseClient<Database>,
  actorId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.name || "가구 구성원";
}

function getLedgerEntryDate(entry: LedgerNotificationEntry): string {
  return formatKst(entry.transacted_at);
}

function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

async function createLedgerNotifications(
  supabase: SupabaseClient<Database>,
  input: {
    actorId: string;
    householdId: string;
    title: string;
    body: string;
    date: string;
    type: "ledger_record_created" | "ledger_record_changed";
    source: {
      type: "ledger_entry";
      id: string;
    } | null;
    dedupeKey: string;
  },
): Promise<void> {
  const [recipients, actorName] = await Promise.all([
    getHouseholdNotificationRecipients(
      supabase,
      input.householdId,
      input.actorId,
    ),
    getActorName(supabase, input.actorId),
  ]);

  await Promise.all(
    recipients.map((recipientId) =>
      createUserNotification({
        recipientId,
        householdId: input.householdId,
        type: input.type,
        title: input.title,
        body: input.body.replace("{actorName}", actorName),
        link: {
          kind: "ledger_record_date",
          params: { date: input.date },
        },
        source: input.source,
        dedupeKey: input.dedupeKey,
      }),
    ),
  );
}

async function runBestEffort(
  operation: () => Promise<void>,
  context: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error(`Ledger notification creation error (${context}):`, error);
  }
}

export async function notifyLedgerEntryCreated(
  supabase: SupabaseClient<Database>,
  input: LedgerEntryCreatedInput,
): Promise<void> {
  if (!input.entry.is_shared) return;

  await runBestEffort(
    () =>
      createLedgerNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.householdId,
        type: "ledger_record_created",
        title: "공용 가계부 기록이 추가되었습니다",
        body: `{actorName}님이 "${input.entry.title ?? "제목 없음"}" ${formatKrw(input.entry.amount)}을 추가했습니다.`,
        date: getLedgerEntryDate(input.entry),
        source: { type: "ledger_entry", id: input.entry.id },
        dedupeKey: `ledger_entry_created:${input.entry.id}`,
      }),
    "created",
  );
}

export async function notifyBatchLedgerEntriesCreated(
  supabase: SupabaseClient<Database>,
  input: BatchLedgerEntriesCreatedInput,
): Promise<void> {
  const sharedEntries = input.entries.filter((entry) => entry.is_shared);
  if (sharedEntries.length === 0) return;

  const latestEntry = [...sharedEntries].sort((a, b) =>
    b.transacted_at.localeCompare(a.transacted_at),
  )[0];
  if (!latestEntry) return;

  const latestDate = getLedgerEntryDate(latestEntry);
  const count = sharedEntries.length;

  await runBestEffort(
    () =>
      createLedgerNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.householdId,
        type: "ledger_record_created",
        title: `공용 가계부 기록 ${count}건이 추가되었습니다`,
        body: `{actorName}님이 ${latestDate} 기준 공용 기록 ${count}건을 추가했습니다.`,
        date: latestDate,
        source: null,
        dedupeKey: `ledger_entry_batch_created:${input.actorId}:${sharedEntries
          .map((entry) => entry.id)
          .join(",")}`,
      }),
    "batch-created",
  );
}

export async function notifyLedgerEntryUpdated(
  supabase: SupabaseClient<Database>,
  input: LedgerEntryUpdatedInput,
): Promise<void> {
  if (!input.previousEntry.is_shared) return;

  await runBestEffort(
    () =>
      createLedgerNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.previousEntry.household_id,
        type: "ledger_record_changed",
        title: "공용 가계부 기록이 수정되었습니다",
        body: `{actorName}님이 "${input.previousEntry.title ?? "제목 없음"}" 기록을 수정했습니다.`,
        date: getLedgerEntryDate(input.updatedEntry),
        source: { type: "ledger_entry", id: input.previousEntry.id },
        dedupeKey: `ledger_entry_updated:${input.previousEntry.id}:${input.updatedEntry.updated_at ?? Date.now()}`,
      }),
    "updated",
  );
}

export async function notifyLedgerEntryDeleted(
  supabase: SupabaseClient<Database>,
  input: LedgerEntryDeletedInput,
): Promise<void> {
  if (!input.entry.is_shared) return;

  await runBestEffort(
    () =>
      createLedgerNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.entry.household_id,
        type: "ledger_record_changed",
        title: "공용 가계부 기록이 삭제되었습니다",
        body: `{actorName}님이 "${input.entry.title ?? "제목 없음"}" 기록을 삭제했습니다.`,
        date: getLedgerEntryDate(input.entry),
        source: { type: "ledger_entry", id: input.entry.id },
        dedupeKey: `ledger_entry_deleted:${input.entry.id}`,
      }),
    "deleted",
  );
}
