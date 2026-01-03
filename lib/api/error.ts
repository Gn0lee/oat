/**
 * API 에러 클래스
 */
export class APIError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * APIError를 에러 응답 형식으로 변환
 */
export function toErrorResponse(error: APIError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}
