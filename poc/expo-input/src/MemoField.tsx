// PROTOTYPE 메모 필드 두 가지 구현. 한글 조합 깨짐을 비교해요.
// - rn: RN 기본 TextInput (Fabric)
// - swiftui: @expo/ui SwiftUI TextField
import { Host, TextField, type TextFieldRef } from "@expo/ui/swift-ui";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, TextInput, type TextInputInstance, View } from "react-native";

export type MemoImpl = "rn" | "swiftui";
export type MemoHandle = { blur: () => void };

type Props = {
  impl: MemoImpl;
  value: string;
  onChange: (t: string) => void;
  onFocus: () => void;
};

export const MemoField = forwardRef<MemoHandle, Props>(function MemoField({ impl, value, onChange, onFocus }, ref) {
  const rnRef = useRef<TextInputInstance>(null);
  const swRef = useRef<TextFieldRef>(null);
  useImperativeHandle(ref, () => ({
    blur: () => {
      rnRef.current?.blur();
      swRef.current?.blur();
    },
  }));

  if (impl === "rn") {
    return (
      <TextInput
        ref={rnRef}
        style={styles.input}
        placeholder="메모 (예: 점심 김치찌개)"
        placeholderTextColor="#b0b8c1"
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        maxLength={40}
        returnKeyType="done"
      />
    );
  }

  // key로 구현을 바꿀 때 새로 마운트해요. SwiftUI 쪽은 자체 상태를 쓰고 변경만 받아요.
  return (
    <View style={styles.input}>
      <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
        <TextField
          ref={swRef}
          placeholder="메모 (예: 점심 김치찌개)"
          maxLength={40}
          onTextChange={onChange}
          onFocusChange={(f) => f && onFocus()}
        />
      </Host>
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 17,
    color: "#191f28",
    minHeight: 44,
    justifyContent: "center",
  },
});
