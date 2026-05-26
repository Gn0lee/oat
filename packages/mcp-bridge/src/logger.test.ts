import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps debug logs silent unless enabled", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const logger = createLogger(false);

    logger.debug("connected", { token: "oat_mcp_secret" });

    expect(write).not.toHaveBeenCalled();
  });

  it("writes debug logs to stderr without token fields", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const logger = createLogger(true);

    logger.debug("connected", {
      token: "oat_mcp_secret",
      url: "https://oat-blond.vercel.app/api/mcp",
    });

    expect(write).toHaveBeenCalledTimes(1);
    const output = String(write.mock.calls[0]?.[0]);
    expect(output).toContain("connected");
    expect(output).toContain("oat-blond.vercel.app");
    expect(output).not.toContain("oat_mcp_secret");
  });
});
