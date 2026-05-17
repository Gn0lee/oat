import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiQueryError, fetchApiData } from "@/lib/api/client";

describe("fetchApiData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("API 에러 코드와 상태 코드를 보존한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "HOUSEHOLD_NOT_FOUND",
          message: "가구 정보를 찾을 수 없습니다.",
        },
      }),
    } as Response);

    await expect(fetchApiData("/api/example")).rejects.toMatchObject({
      code: "HOUSEHOLD_NOT_FOUND",
      status: 404,
      message: "가구 정보를 찾을 수 없습니다.",
    });
  });

  it("성공 응답의 data를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { total: 1000 } }),
    } as Response);

    await expect(
      fetchApiData<{ total: number }>("/api/example"),
    ).resolves.toEqual({ total: 1000 });
  });

  it("ApiQueryError로 가구 없음 상태를 식별할 수 있다", () => {
    const error = new ApiQueryError(
      "HOUSEHOLD_NOT_FOUND",
      "가구 정보를 찾을 수 없습니다.",
      404,
    );

    expect(error.isCode("HOUSEHOLD_NOT_FOUND")).toBe(true);
  });
});
