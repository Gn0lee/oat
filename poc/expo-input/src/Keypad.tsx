// PROTOTYPE 직접 그린 금액 키패드.
// 키 입력은 onPress가 아니라 onPressIn에서 처리해요(손을 떼기 전에 반영되게).
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type KeypadKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "0" | "back";

const ROWS: KeypadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "back"],
];

type Props = {
  onKey: (key: KeypadKey) => void;
  onClear: () => void;
  hapticsEnabled: boolean;
};

export function Keypad({ onKey, onClear, hapticsEnabled }: Props) {
  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join()} style={styles.row}>
          {row.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="keyboardkey"
              accessibilityLabel={k === "back" ? "지우기, 길게 누르면 전체 삭제" : k === "00" ? "영영" : k}
              onPressIn={() => {
                if (hapticsEnabled) Haptics.selectionAsync();
                onKey(k);
              }}
              onLongPress={k === "back" ? onClear : undefined}
              delayLongPress={400}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{k === "back" ? "⌫" : k}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 8, paddingBottom: 4 },
  row: { flexDirection: "row" },
  key: { flex: 1, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  keyPressed: { backgroundColor: "#eef0f3" },
  keyText: { fontSize: 26, fontWeight: "500", color: "#191f28" },
});
