import { z } from "zod";

export const ledgerBookIdSchema = z.string().uuid();

export const createLedgerBookSchema = z
  .object({
    name: z.string().trim().min(1, "장부 이름을 입력해주세요."),
    visibility: z.enum(["shared", "personal"], {
      message: "장부 공개 범위를 선택해주세요.",
    }),
  })
  .strict();

export const renameLedgerBookSchema = z
  .object({
    name: z.string().trim().min(1, "장부 이름을 입력해주세요."),
  })
  .strict();
