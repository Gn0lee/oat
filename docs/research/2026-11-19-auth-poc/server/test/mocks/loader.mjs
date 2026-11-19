const map = { "react-native": "react-native.mjs", "expo-constants": "expo-constants.mjs", "expo-linking": "expo-linking.mjs" };
export async function resolve(spec, ctx, next) {
	if (map[spec]) return { url: new URL(map[spec], import.meta.url).href, shortCircuit: true };
	return next(spec, ctx);
}
