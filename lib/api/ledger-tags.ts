import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { APIError } from "./error";

export const LEDGER_TAG_MAX_NAME_LENGTH = 15;
export const LEDGER_ENTRY_MAX_TAGS = 5;

export type LedgerTag = Database["public"]["Tables"]["ledger_tags"]["Row"];
export type LedgerTagInsert =
  Database["public"]["Tables"]["ledger_tags"]["Insert"];
export type LedgerEntryTag =
  Database["public"]["Tables"]["ledger_entry_tags"]["Row"];

export function normalizeLedgerTagName(input: string): string {
  let name = input.trim();
  if (name.startsWith("#")) {
    name = name.slice(1).trim();
  }
  return name;
}

export function validateLedgerTagName(name: string): void {
  if (!name) {
    throw new APIError(
      "LEDGER_TAG_INVALID_NAME",
      "태그 이름은 비어 있을 수 없습니다.",
      400,
    );
  }
  if (name.length > LEDGER_TAG_MAX_NAME_LENGTH) {
    throw new APIError(
      "LEDGER_TAG_INVALID_NAME",
      `태그 이름은 최대 ${LEDGER_TAG_MAX_NAME_LENGTH}자까지 가능합니다.`,
      400,
    );
  }
  if (/\s/.test(name)) {
    throw new APIError(
      "LEDGER_TAG_INVALID_NAME",
      "태그 이름에 공백을 포함할 수 없습니다.",
      400,
    );
  }
  // 한글, 영문 대소문자, 숫자, 언더바(_)만 허용
  const regex = /^[0-9A-Za-z_가-힣]+$/u;
  if (!regex.test(name)) {
    throw new APIError(
      "LEDGER_TAG_INVALID_NAME",
      "태그 이름은 한글, 영문, 숫자, 언더바(_)만 사용할 수 있습니다.",
      400,
    );
  }
}

export function normalizeLedgerTagInputs(inputs?: string[]): string[] {
  if (!inputs || inputs.length === 0) return [];

  const normalizedMap = new Map<string, string>(); // lowercase -> original (preserving first casing)
  for (const input of inputs) {
    const rawName = normalizeLedgerTagName(input);
    if (!rawName) continue;
    validateLedgerTagName(rawName);

    const key = rawName.toLowerCase();
    if (!normalizedMap.has(key)) {
      normalizedMap.set(key, rawName);
    }
  }

  const result = Array.from(normalizedMap.values());
  if (result.length > LEDGER_ENTRY_MAX_TAGS) {
    throw new APIError(
      "LEDGER_TAG_LIMIT_EXCEEDED",
      `태그는 최대 ${LEDGER_ENTRY_MAX_TAGS}개까지 지정할 수 있습니다.`,
      400,
    );
  }
  return result;
}

export async function getLedgerTags(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<LedgerTag[]> {
  const { data, error } = await supabase
    .from("ledger_tags")
    .select("*")
    .eq("household_id", householdId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLedgerTagsForScope(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  scope: "shared" | "personal",
): Promise<LedgerTag[]> {
  const query = supabase
    .from("ledger_tags")
    .select(`
      *,
      ledger_entry_tags!inner (
        ledger_entries!inner (
          is_shared,
          owner_id
        )
      )
    `)
    .eq("household_id", householdId);

  if (scope === "shared") {
    query.eq("ledger_entry_tags.ledger_entries.is_shared", true);
  } else {
    query
      .eq("ledger_entry_tags.ledger_entries.is_shared", false)
      .eq("ledger_entry_tags.ledger_entries.owner_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const uniqueTags = new Map<string, LedgerTag>();
  for (const row of data || []) {
    const tag = row as unknown as LedgerTag;
    uniqueTags.set(tag.id, tag);
  }

  return Array.from(uniqueTags.values()).sort((a, b) => {
    if (a.last_used_at && b.last_used_at) {
      const timeDiff =
        new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
      if (timeDiff !== 0) return timeDiff;
    } else if (a.last_used_at) {
      return -1;
    } else if (b.last_used_at) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function upsertLedgerTagsByName(
  supabase: SupabaseClient<Database>,
  householdId: string,
  names: string[],
): Promise<LedgerTag[]> {
  if (names.length === 0) return [];

  const rows = names.map((name) => ({
    household_id: householdId,
    name,
    name_normalized: name.toLowerCase(),
    last_used_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("ledger_tags")
    .upsert(rows, { onConflict: "household_id,name_normalized" })
    .select();

  if (error) throw error;
  return data || [];
}

export async function replaceLedgerEntryTags(
  supabase: SupabaseClient<Database>,
  params: {
    householdId: string;
    ledgerEntryId: string;
    ownerId: string;
    tagNames?: string[] | null;
  },
): Promise<LedgerTag[]> {
  const { householdId, ledgerEntryId, ownerId, tagNames } = params;

  const normalized = normalizeLedgerTagInputs(tagNames || []);

  const { data: entry, error: entryError } = await supabase
    .from("ledger_entries")
    .select("owner_id, household_id")
    .eq("id", ledgerEntryId)
    .maybeSingle();

  if (entryError) throw entryError;
  if (!entry) {
    throw new APIError("NOT_FOUND", "가계부 기록을 찾을 수 없습니다.", 404);
  }
  if (entry.household_id !== householdId || entry.owner_id !== ownerId) {
    throw new APIError("FORBIDDEN", "가계부 기록에 대한 권한이 없습니다.", 403);
  }

  if (normalized.length === 0) {
    const { error: deleteError } = await supabase
      .from("ledger_entry_tags")
      .delete()
      .eq("ledger_entry_id", ledgerEntryId);
    if (deleteError) throw deleteError;
    return [];
  }

  const tags = await upsertLedgerTagsByName(supabase, householdId, normalized);

  const { error: deleteError } = await supabase
    .from("ledger_entry_tags")
    .delete()
    .eq("ledger_entry_id", ledgerEntryId);
  if (deleteError) throw deleteError;

  const entryTags = tags.map((tag) => ({
    ledger_entry_id: ledgerEntryId,
    tag_id: tag.id,
    household_id: householdId,
  }));

  const { error: insertError } = await supabase
    .from("ledger_entry_tags")
    .insert(entryTags);
  if (insertError) throw insertError;

  return tags;
}

export async function attachTagsToLedgerEntries(
  supabase: SupabaseClient<Database>,
  rows: Array<{ id: string }>,
): Promise<Map<string, Array<{ id: string; name: string }>>> {
  const map = new Map<string, Array<{ id: string; name: string }>>();
  if (rows.length === 0) return map;

  const ids = rows.map((r) => r.id);

  const { data, error } = await supabase
    .from("ledger_entry_tags")
    .select(`
      ledger_entry_id,
      ledger_tags (
        id,
        name
      )
    `)
    .in("ledger_entry_id", ids);

  if (error) throw error;

  for (const row of data || []) {
    const entryId = row.ledger_entry_id;
    const tag = row.ledger_tags as unknown as {
      id: string;
      name: string;
    } | null;
    if (!tag) continue;

    if (!map.has(entryId)) {
      map.set(entryId, []);
    }
    map.get(entryId)!.push(tag);
  }

  return map;
}
