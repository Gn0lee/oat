export const BRIDGE_TOOL_DEFINITIONS = [
  {
    name: "get_context",
    description:
      "현재 oat MCP 연결의 사용자, 가구, 권한, privacy 모델을 조회합니다. 일반적으로 캐시된 값을 사용합니다. 사용자가 방금 MCP 토큰, 가구, 프로필 정보를 변경했고 최신값 확인을 명시한 경우에만 forceRefresh를 true로 설정하세요.",
    inputSchema: {
      type: "object",
      properties: {
        forceRefresh: {
          type: "boolean",
          description:
            "캐시를 우회해 최신 연결 컨텍스트를 조회합니다. 자동 재시도, polling, 일반 호출에는 사용하지 말고, 사용자가 방금 변경한 값을 다시 확인하라고 요청한 경우에만 true로 설정하세요.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_financial_overview",
    description:
      "이번 달 공용/토큰 소유자 개인 현금흐름과 현재 자산/주식 요약을 함께 조회합니다. 두 현금흐름은 합산하지 않습니다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_references",
    description:
      "가구원, 카테고리, 계좌, 결제수단 참조 목록을 조회합니다. 일반적으로 캐시된 값을 사용합니다. 사용자가 방금 설정/참조 데이터를 변경했고 최신값 확인을 명시한 경우에만 forceRefresh를 true로 설정하세요.",
    inputSchema: {
      type: "object",
      properties: {
        forceRefresh: {
          type: "boolean",
          description:
            "캐시를 우회해 최신 참조 데이터를 조회합니다. 자동 재시도, polling, 일반 호출에는 사용하지 말고, 사용자가 방금 변경한 값을 다시 확인하라고 요청한 경우에만 true로 설정하세요.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_money_endpoint_detail",
    description:
      "계좌 또는 결제수단의 현재 잔액과 최근 변동 내역을 조회합니다. timeline에는 가계부 기록, 잔액 조정, 계좌의 경우 주식 거래가 포함될 수 있습니다. 상세 사용자 데이터이므로 일반 연결 확인이나 반복 polling에는 사용하지 마세요.",
    inputSchema: {
      type: "object",
      properties: {
        endpointType: {
          type: "string",
          enum: ["account", "paymentMethod"],
          description: "조회할 Money Endpoint 유형",
        },
        endpointId: {
          type: "string",
          description: "조회할 계좌 또는 결제수단 ID",
        },
      },
      required: ["endpointType", "endpointId"],
      additionalProperties: false,
    },
  },
  {
    name: "search_ledger_entries",
    description:
      "가계부 상세 내역을 조회합니다. source/destination은 account 또는 paymentMethod 기반 Money Endpoint이며, 파트너 개인 지출 상세는 제외됩니다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
        query: { type: "string" },
        types: {
          type: "array",
          items: { type: "string", enum: ["expense", "income", "transfer"] },
        },
        categoryIds: { type: "array", items: { type: "string" } },
        endpointIds: { type: "array", items: { type: "string" } },
        endpointTypes: {
          type: "array",
          items: { type: "string", enum: ["account", "paymentMethod"] },
        },
        ownerIds: { type: "array", items: { type: "string" } },
        isShared: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_ledger_stats",
    description:
      "가계부 요약, 멤버별, 카테고리별, Money Endpoint별 집계를 조회합니다. 현금흐름 summary는 공용/토큰 소유자 개인 장부를 분리하고 이체를 제외합니다.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        month: { type: "number" },
        months: { type: "number", minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_asset_snapshot",
    description: "총자산, 주식 보유, 자산 배분과 수익률 snapshot을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        includeHoldings: { type: "boolean" },
        includeAllocation: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_ledger_entry",
    description:
      "새로운 가계부 기록을 생성합니다. 토큰 소유자의 기록으로 생성되며, 기본적으로 가구원에게 공유됩니다. 공유를 원치 않으면 isShared를 false로 설정하세요.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["expense", "income", "transfer"] },
        amount: { type: "number", minimum: 0 },
        title: { type: "string" },
        categoryId: { type: "string" },
        fromAccountId: { type: "string" },
        fromPaymentMethodId: { type: "string" },
        toAccountId: { type: "string" },
        toPaymentMethodId: { type: "string" },
        transactedAt: { type: "string" },
        isShared: { type: "boolean" },
        memo: { type: "string" },
      },
      required: ["type", "amount", "title", "transactedAt"],
      additionalProperties: false,
    },
  },
  {
    name: "update_ledger_entry",
    description:
      "기존 가계부 기록을 수정합니다. 토큰 소유자의 기록만 수정할 수 있습니다. 수정할 필드만 전달하세요.",
    inputSchema: {
      type: "object",
      properties: {
        entryId: { type: "string" },
        amount: { type: "number", minimum: 0 },
        title: { type: "string" },
        categoryId: { type: "string" },
        fromAccountId: { type: "string" },
        fromPaymentMethodId: { type: "string" },
        toAccountId: { type: "string" },
        toPaymentMethodId: { type: "string" },
        transactedAt: { type: "string" },
        memo: { type: "string" },
      },
      required: ["entryId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_ledger_entry",
    description:
      "기존 가계부 기록을 삭제합니다. 토큰 소유자의 기록만 삭제할 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        entryId: { type: "string" },
      },
      required: ["entryId"],
      additionalProperties: false,
    },
  },
] as const;
