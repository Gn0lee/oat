// PROTOTYPE — 앱 스택 PoC: 가계부 입력 화면 (Expo). 버리는 코드예요. main에 합치지 않아요.
// 통과 기준: https://github.com/Gn0lee/oat/issues/521
// 화면 위 회색 막대(PoC 바)에서 시트·메모 구현을 바꿔 가며 비교하고, 탭 카운터로 누락을 세요.
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardController, KeyboardProvider, KeyboardStickyView } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, type Option, PAYMENT_METHODS } from "./src/data";
import { Keypad, type KeypadKey } from "./src/Keypad";
import { type MemoHandle, type MemoImpl, MemoField } from "./src/MemoField";
import { GorhomPicker, type PickerHandle, TrueSheetPicker } from "./src/Pickers";

type SheetImpl = "true-sheet" | "gorhom";
type Mode = "amount" | "memo";
type SavedRecord = { id: number; amount: number; method: string; category: string; memo: string };

const MAX_DIGITS = 10; // 99억 9천만 원대까지

const withCommas = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.segItem, o === value && styles.segOn]}>
          <Text style={[styles.segText, o === value && styles.segTextOn]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Screen() {
  // PoC 비교 스위치
  const [sheetImpl, setSheetImpl] = useState<SheetImpl>("true-sheet");
  const [memoImpl, setMemoImpl] = useState<MemoImpl>("rn");
  const [haptics, setHaptics] = useState(true);
  const [taps, setTaps] = useState(0);

  // 입력 상태
  const [digits, setDigits] = useState("");
  const [method, setMethod] = useState<Option>(PAYMENT_METHODS[0]);
  const [category, setCategory] = useState<Option | undefined>();
  const [memo, setMemo] = useState("");
  const [mode, setMode] = useState<Mode>("amount");
  const [saved, setSaved] = useState<SavedRecord[]>([]);

  const methodSheet = useRef<PickerHandle>(null);
  const categorySheet = useRef<PickerHandle>(null);
  const memoRef = useRef<MemoHandle>(null);

  const onKey = useCallback((k: KeypadKey) => {
    setTaps((t) => t + 1);
    setDigits((d) => {
      if (k === "back") return d.slice(0, -1);
      const next = (d + k).replace(/^0+/, "");
      return next.length > MAX_DIGITS ? d : next;
    });
  }, []);

  const backToAmount = () => {
    memoRef.current?.blur();
    KeyboardController.dismiss();
    setMode("amount");
  };

  const openSheet = (r: React.RefObject<PickerHandle | null>) => {
    memoRef.current?.blur();
    KeyboardController.dismiss();
    r.current?.open();
  };

  const canSave = digits.length > 0 && !!category;
  const save = () => {
    if (!canSave) return;
    setSaved((s) => [
      { id: Date.now(), amount: Number(digits), method: method.label, category: category.label, memo },
      ...s,
    ]);
    setDigits("");
    setCategory(undefined);
    setMemo("");
    backToAmount();
  };

  const Picker = sheetImpl === "true-sheet" ? TrueSheetPicker : GorhomPicker;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* PoC 바: 실제 화면이 아니라 비교용 스위치와 상태 표시예요 */}
      <View style={styles.poc}>
        <View style={styles.pocRow}>
          <Text style={styles.pocLabel}>시트</Text>
          <Seg value={sheetImpl} options={["true-sheet", "gorhom"]} onChange={setSheetImpl} />
          <Text style={styles.pocLabel}>메모</Text>
          <Seg value={memoImpl} options={["rn", "swiftui"]} onChange={setMemoImpl} />
        </View>
        <View style={styles.pocRow}>
          <Pressable onPress={() => setHaptics((h) => !h)}>
            <Text style={styles.pocText}>햅틱 {haptics ? "켬" : "끔"}</Text>
          </Pressable>
          <Pressable onPress={() => setTaps(0)}>
            <Text style={styles.pocText}>탭 {taps}회 (누르면 0)</Text>
          </Pressable>
          <Text style={styles.pocText}>자릿수 {digits.length}</Text>
          <Text style={styles.pocText}>저장 {saved.length}건</Text>
        </View>
        {saved[0] ? (
          <Text style={styles.pocText} numberOfLines={1}>
            마지막 저장: {withCommas(String(saved[0].amount))}원 · {saved[0].method} · {saved[0].category} ·{" "}
            {saved[0].memo || "(메모 없음)"}
          </Text>
        ) : null}
      </View>

      {/* 금액 */}
      <Pressable style={styles.amountArea} onPress={backToAmount} accessibilityRole="button" accessibilityLabel={digits ? `금액 ${withCommas(digits)}원` : "금액 입력"}>
        <Text style={[styles.amount, !digits && styles.amountEmpty]} numberOfLines={1} adjustsFontSizeToFit>
          {digits ? `${withCommas(digits)}원` : "얼마를 썼나요?"}
        </Text>
      </Pressable>

      {/* 선택 행 */}
      <Pressable style={styles.field} onPress={() => openSheet(methodSheet)} accessibilityRole="button">
        <Text style={styles.fieldLabel}>결제수단</Text>
        <Text style={styles.fieldValue}>
          {method.emoji} {method.label}
        </Text>
      </Pressable>
      <Pressable style={styles.field} onPress={() => openSheet(categorySheet)} accessibilityRole="button">
        <Text style={styles.fieldLabel}>카테고리</Text>
        <Text style={[styles.fieldValue, !category && styles.placeholder]}>
          {category ? `${category.emoji} ${category.label}` : "선택해 주세요"}
        </Text>
      </Pressable>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>메모</Text>
        <MemoField
          key={memoImpl}
          ref={memoRef}
          impl={memoImpl}
          value={memo}
          onChange={setMemo}
          onFocus={() => setMode("memo")}
        />
      </View>

      <View style={{ flex: 1 }} />

      {/* 저장 버튼은 시스템 키보드가 올라오면 키보드 위에 붙어요 */}
      <KeyboardStickyView>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, !canSave && styles.saveOff]}
          accessibilityRole="button"
          accessibilityLabel="저장"
        >
          <Text style={styles.saveText}>{canSave ? "저장" : digits ? "카테고리를 골라 주세요" : "금액을 입력해 주세요"}</Text>
        </Pressable>
      </KeyboardStickyView>
      {mode === "amount" ? <Keypad onKey={onKey} onClear={() => setDigits("")} hapticsEnabled={haptics} /> : null}

      <Picker ref={methodSheet} title="결제수단" options={PAYMENT_METHODS} selectedId={method.id} onSelect={setMethod} />
      <Picker
        ref={categorySheet}
        title="카테고리"
        options={CATEGORIES}
        selectedId={category?.id}
        onSelect={setCategory}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <BottomSheetModalProvider>
            <Screen />
          </BottomSheetModalProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  poc: { backgroundColor: "#f2f4f6", paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  pocRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pocLabel: { fontSize: 12, color: "#4e5968", fontWeight: "600" },
  pocText: { fontSize: 12, color: "#4e5968" },
  seg: { flexDirection: "row", backgroundColor: "#e5e8eb", borderRadius: 8, padding: 2 },
  segItem: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  segOn: { backgroundColor: "#fff" },
  segText: { fontSize: 12, color: "#8b95a1" },
  segTextOn: { color: "#191f28", fontWeight: "600" },
  amountArea: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  amount: { fontSize: 40, fontWeight: "700", color: "#191f28" },
  amountEmpty: { color: "#b0b8c1" },
  field: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, minHeight: 56, gap: 16 },
  fieldLabel: { width: 64, fontSize: 15, color: "#8b95a1" },
  fieldValue: { flex: 1, fontSize: 17, color: "#191f28" },
  placeholder: { color: "#b0b8c1" },
  save: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#3182f6",
    alignItems: "center",
    justifyContent: "center",
  },
  saveOff: { backgroundColor: "#c9dcfb" },
  saveText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
