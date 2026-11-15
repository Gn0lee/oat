// PROTOTYPE — 앱 스택 PoC의 SwiftUI 기준점. Expo 버전과 같은 화면이에요. 버리는 코드예요.
// 통과 기준: https://github.com/Gn0lee/oat/issues/521
import SwiftUI
import UIKit

@main
struct OatSwiftUIPoCApp: App {
    var body: some Scene {
        WindowGroup { InputScreen() }
    }
}

// MARK: - 목업 데이터 (Expo 버전 src/data.ts와 같은 목록)

struct Option: Identifiable, Hashable {
    let id: String
    let emoji: String
    let label: String
    var sub: String? = nil
}

let paymentMethods: [Option] = [
    ("💳", "신한 Deep Dream", "신용 · 신한카드 15일 결제"), ("💳", "현대카드 M", "신용 · 현대카드 25일 결제"),
    ("💳", "삼성 taptap O", "신용 · 삼성카드 14일 결제"), ("💳", "국민 노리2", "체크 · 국민 입출금"),
    ("💳", "토스뱅크 체크", "체크 · 토스뱅크 통장"), ("🟡", "카카오페이 머니", "페이머니"),
    ("🟢", "네이버페이 머니", "페이머니"), ("🟢", "네이버페이 포인트", "포인트"),
    ("🎁", "온누리상품권", "상품권"), ("🎁", "지역화폐", "상품권"), ("💵", "현금", "지갑"),
    ("🏦", "국민 입출금", "계좌이체"), ("🏦", "토스뱅크 통장", "계좌이체"), ("🏦", "카카오뱅크 세이프박스", "계좌이체"),
    ("💳", "롯데 LOCA", "신용 · 롯데카드 10일 결제"), ("💳", "우리 카드의정석", "신용 · 우리카드 23일 결제"),
    ("💳", "하나 원더카드", "신용 · 하나카드 13일 결제"), ("🍎", "애플페이 (현대카드 M)", "간편결제"),
    ("🔵", "삼성페이 (taptap O)", "간편결제"), ("🟣", "페이코 포인트", "포인트"), ("🟠", "OK캐쉬백", "포인트"),
    ("🔴", "CJ ONE", "포인트"), ("⚪️", "해피머니", "상품권"), ("⚫️", "컬쳐랜드", "상품권"),
].enumerated().map { Option(id: "pm\($0.offset + 1)", emoji: $0.element.0, label: $0.element.1, sub: $0.element.2) }

let categories: [Option] = [
    "🍚 식비", "☕️ 카페·간식", "🛒 장보기", "🍺 술·유흥", "🚌 대중교통", "🚕 택시", "⛽️ 주유",
    "🅿️ 주차·통행료", "🏠 월세·관리비", "💡 공과금", "📱 통신비", "🎬 문화·여가", "📚 도서",
    "🏋️ 운동", "💊 의료·약국", "💇 미용", "👕 의류", "👟 신발·잡화", "🧴 생활용품", "🛋️ 가구·가전",
    "🎁 선물·경조사", "✈️ 여행", "🏨 숙박", "🐶 반려동물", "👶 육아", "🎓 교육", "💼 업무",
    "🧾 세금·보험", "📦 구독", "🍽️ 외식", "🧸 취미", "❓ 기타",
].enumerated().map { i, s in
    let parts = s.split(separator: " ", maxSplits: 1)
    return Option(id: "c\(i)", emoji: String(parts[0]), label: String(parts[1]))
}

// MARK: - 화면

struct SavedRecord: Identifiable {
    let id = UUID()
    let amount: Int
    let method: String
    let category: String
    let memo: String
}

enum Sheet: String, Identifiable { case method, category; var id: String { rawValue } }

let maxDigits = 10

func withCommas(_ digits: String) -> String {
    guard let n = Int(digits) else { return digits }
    let f = NumberFormatter()
    f.numberStyle = .decimal
    return f.string(from: NSNumber(value: n)) ?? digits
}

struct InputScreen: View {
    @State private var haptics = true
    @State private var taps = 0

    @State private var digits = ""
    @State private var method = paymentMethods[0]
    @State private var category: Option? = nil
    @State private var memo = ""
    @State private var saved: [SavedRecord] = []
    @State private var sheet: Sheet? = nil
    @FocusState private var memoFocused: Bool

    private let feedback = UISelectionFeedbackGenerator()

    var canSave: Bool { !digits.isEmpty && category != nil }

    var body: some View {
        VStack(spacing: 0) {
            pocBar

            Button(action: backToAmount) {
                Text(digits.isEmpty ? "얼마를 썼나요?" : "\(withCommas(digits))원")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundStyle(digits.isEmpty ? Color(white: 0.72) : Color.primary)
                    .lineLimit(1).minimumScaleFactor(0.5)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24).padding(.top, 32).padding(.bottom, 24)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(digits.isEmpty ? "금액 입력" : "금액 \(withCommas(digits))원")

            fieldRow("결제수단", "\(method.emoji) \(method.label)", placeholder: false) { open(.method) }
            fieldRow("카테고리", category.map { "\($0.emoji) \($0.label)" } ?? "선택해 주세요", placeholder: category == nil) { open(.category) }
            HStack(spacing: 16) {
                Text("메모").font(.system(size: 15)).foregroundStyle(.secondary).frame(width: 64, alignment: .leading)
                TextField("메모 (예: 점심 김치찌개)", text: $memo)
                    .font(.system(size: 17))
                    .focused($memoFocused)
                    .submitLabel(.done)
                    .onChange(of: memo) { _, v in if v.count > 40 { memo = String(v.prefix(40)) } }
            }
            .padding(.horizontal, 24).frame(minHeight: 56)

            Spacer(minLength: 0)

            // 저장 버튼: 키보드가 올라오면 SwiftUI 기본 동작으로 키보드 위로 올라와요
            Button(action: save) {
                Text(canSave ? "저장" : digits.isEmpty ? "금액을 입력해 주세요" : "카테고리를 골라 주세요")
                    .font(.system(size: 17, weight: .bold)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).frame(height: 56)
                    .background(canSave ? Color(red: 0.19, green: 0.51, blue: 0.96) : Color(red: 0.79, green: 0.86, blue: 0.98))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .disabled(!canSave)
            .padding(.horizontal, 16).padding(.bottom, 8)

            if !memoFocused {
                Keypad(onKey: onKey, onClear: { digits = "" })
            }
        }
        .sheet(item: $sheet) { s in
            PickerSheet(
                title: s == .method ? "결제수단" : "카테고리",
                options: s == .method ? paymentMethods : categories,
                selectedId: s == .method ? method.id : category?.id
            ) { o in
                if s == .method { method = o } else { category = o }
                sheet = nil
            }
            .presentationDetents([.fraction(0.6), .large])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(20)
        }
    }

    private var pocBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 12) {
                Button("햅틱 \(haptics ? "켬" : "끔")") { haptics.toggle() }
                Button("탭 \(taps)회 (누르면 0)") { taps = 0 }
                Text("자릿수 \(digits.count)")
                Text("저장 \(saved.count)건")
            }
            if let last = saved.first {
                Text("마지막 저장: \(withCommas(String(last.amount)))원 · \(last.method) · \(last.category) · \(last.memo.isEmpty ? "(메모 없음)" : last.memo)")
                    .lineLimit(1)
            }
        }
        .font(.system(size: 12)).foregroundStyle(Color(white: 0.35)).buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12).padding(.vertical, 6)
        .background(Color(white: 0.95))
    }

    private func fieldRow(_ label: String, _ value: String, placeholder: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Text(label).font(.system(size: 15)).foregroundStyle(.secondary).frame(width: 64, alignment: .leading)
                Text(value).font(.system(size: 17)).foregroundStyle(placeholder ? Color(white: 0.72) : Color.primary)
                Spacer()
            }
            .padding(.horizontal, 24).frame(minHeight: 56).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func onKey(_ k: String) {
        if haptics { feedback.selectionChanged() }
        taps += 1
        if k == "back" { digits = String(digits.dropLast()); return }
        var next = digits + k
        while next.hasPrefix("0") { next.removeFirst() }
        if next.count <= maxDigits { digits = next }
    }

    private func backToAmount() { memoFocused = false }

    private func open(_ s: Sheet) {
        memoFocused = false
        sheet = s
    }

    private func save() {
        guard canSave, let c = category else { return }
        saved.insert(SavedRecord(amount: Int(digits) ?? 0, method: method.label, category: c.label, memo: memo), at: 0)
        digits = ""; category = nil; memo = ""
        backToAmount()
    }
}

// MARK: - 키패드 (손을 떼기 전, 누르는 순간 입력돼요)

struct Keypad: View {
    let onKey: (String) -> Void
    let onClear: () -> Void
    private let rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["00", "0", "back"]]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 0) {
                    ForEach(row, id: \.self) { k in
                        KeyButton(key: k, onDown: { onKey(k) }, onLong: k == "back" ? onClear : nil)
                    }
                }
            }
        }
        .padding(.horizontal, 8).padding(.bottom, 4)
    }
}

struct KeyButton: View {
    let key: String
    let onDown: () -> Void
    let onLong: (() -> Void)?
    @State private var pressed = false

    var body: some View {
        Text(key == "back" ? "⌫" : key)
            .font(.system(size: 26, weight: .medium))
            .frame(maxWidth: .infinity).frame(height: 60)
            .background(RoundedRectangle(cornerRadius: 12).fill(pressed ? Color(white: 0.93) : .clear))
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in if !pressed { pressed = true; onDown() } }
                    .onEnded { _ in pressed = false }
            )
            .simultaneousGesture(LongPressGesture(minimumDuration: 0.4).onEnded { _ in onLong?() })
            .accessibilityElement()
            .accessibilityLabel(key == "back" ? "지우기, 길게 누르면 전체 삭제" : key == "00" ? "영영" : key)
            .accessibilityAddTraits(.isKeyboardKey)
            .accessibilityAction { onDown() }
    }
}

// MARK: - 선택 시트 (네이티브 .sheet + detents)

struct PickerSheet: View {
    let title: String
    let options: [Option]
    let selectedId: String?
    let onPick: (Option) -> Void

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                Text(title).font(.system(size: 20, weight: .bold)).padding(.bottom, 12)
                ForEach(options) { o in
                    Button { onPick(o) } label: {
                        HStack {
                            Text(o.emoji).font(.system(size: 22)).frame(width: 40, alignment: .leading)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(o.label).font(.system(size: 17))
                                if let sub = o.sub { Text(sub).font(.system(size: 13)).foregroundStyle(.secondary) }
                            }
                            Spacer()
                            if o.id == selectedId { Text("✓").font(.system(size: 18, weight: .bold)).foregroundStyle(.blue) }
                        }
                        .padding(.vertical, 14).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(o.id == selectedId ? .isSelected : [])
                }
            }
            .padding(.horizontal, 20).padding(.top, 24).padding(.bottom, 40)
        }
    }
}
