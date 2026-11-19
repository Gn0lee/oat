export const Platform = { OS: "ios" };
const listeners = new Set();
export const AppState = {
	addEventListener: (_e, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; },
	__emit: (s) => listeners.forEach((fn) => fn(s)),
};
export default { Platform, AppState };
