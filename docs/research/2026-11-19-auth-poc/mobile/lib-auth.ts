import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// 시뮬레이터는 맥의 localhost에 바로 닿아요
export const BASE = "http://localhost:3000";

export const authClient = createAuthClient({
	baseURL: BASE,
	plugins: [expoClient({ scheme: "oat", storagePrefix: "oat", storage: SecureStore })],
});
