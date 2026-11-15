// PROTOTYPE 선택 시트 두 가지 구현. 같은 데이터·같은 행 UI로 비교해요.
// - TrueSheetPicker: iOS 네이티브 시트(UISheetPresentationController)
// - GorhomPicker: JS(Reanimated) 시트
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import type { Option } from "./data";

export type PickerHandle = { open: () => void };

type Props = {
  title: string;
  options: Option[];
  selectedId?: string;
  onSelect: (o: Option) => void;
};

function Rows({ title, options, selectedId, onPick }: Omit<Props, "onSelect"> & { onPick: (o: Option) => void }) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onPick(o)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === selectedId }}
        >
          <Text style={styles.emoji}>{o.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{o.label}</Text>
            {o.sub ? <Text style={styles.sub}>{o.sub}</Text> : null}
          </View>
          {o.id === selectedId ? <Text style={styles.check}>✓</Text> : null}
        </Pressable>
      ))}
      <View style={{ height: 40 }} />
    </>
  );
}

export const TrueSheetPicker = forwardRef<PickerHandle, Props>(function TrueSheetPicker(props, ref) {
  const sheet = useRef<TrueSheet>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  useImperativeHandle(ref, () => ({ open: () => void sheet.current?.present() }));
  return (
    <TrueSheet ref={sheet} detents={[0.6, 1]} grabber cornerRadius={20} scrollableRef={scrollRef}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} nestedScrollEnabled>
        <Rows
          {...props}
          onPick={(o) => {
            props.onSelect(o);
            sheet.current?.dismiss();
          }}
        />
      </ScrollView>
    </TrueSheet>
  );
});

export const GorhomPicker = forwardRef<PickerHandle, Props>(function GorhomPicker(props, ref) {
  const sheet = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => ({ open: () => sheet.current?.present() }));
  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={["60%", "100%"]}
      enableDynamicSizing={false}
      topInset={50}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Rows
          {...props}
          onPick={(o) => {
            props.onSelect(o);
            sheet.current?.dismiss();
          }}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#191f28", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderRadius: 12 },
  rowPressed: { backgroundColor: "#f2f4f6" },
  emoji: { fontSize: 22, width: 40 },
  label: { fontSize: 17, color: "#191f28" },
  sub: { fontSize: 13, color: "#8b95a1", marginTop: 2 },
  check: { fontSize: 18, color: "#3182f6", fontWeight: "700" },
});
