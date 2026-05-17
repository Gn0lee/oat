export class ApiQueryError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiQueryError";
  }

  isCode(code: string) {
    return this.code === code;
  }
}

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export async function fetchApiData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const json = (await response.json()) as ApiDataResponse<T> | ApiErrorResponse;

  if (!response.ok) {
    const error = (json as ApiErrorResponse).error;
    throw new ApiQueryError(
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "요청에 실패했습니다.",
      response.status,
    );
  }

  return (json as ApiDataResponse<T>).data;
}
