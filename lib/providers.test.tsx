import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const auth = vi.hoisted(() => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { onAuthStateChange: auth.subscribe } }),
}));
vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));
vi.mock("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: { children: ReactNode }) => children,
}));

describe("authenticated query cache", () => {
  let client: QueryClient;
  let change: (event: string, session: { user: { id: string } } | null) => void;
  beforeEach(() => {
    vi.clearAllMocks();
    auth.subscribe.mockImplementation((callback) => {
      change = callback;
      return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
    });
  });
  function mount() {
    function Capture() {
      client = useQueryClient();
      return null;
    }
    return render(
      <Providers>
        <Capture />
      </Providers>,
    );
  }

  it("removes private data on logout and unsubscribes on unmount", () => {
    const view = mount();
    act(() => change("INITIAL_SESSION", { user: { id: "owner" } }));
    client.setQueryData(["private-book"], { name: "개인 장부" });
    act(() => change("SIGNED_OUT", null));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    view.unmount();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
  });

  it("keeps data on token refresh but clears it when the account changes", () => {
    mount();
    act(() => change("INITIAL_SESSION", { user: { id: "owner" } }));
    client.setQueryData(["private-book"], { name: "개인 장부" });
    act(() => change("TOKEN_REFRESHED", { user: { id: "owner" } }));
    expect(client.getQueryData(["private-book"])).toEqual({
      name: "개인 장부",
    });
    act(() => change("SIGNED_IN", { user: { id: "member" } }));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
