export interface ApiResponseDto<T> {
  code: number;
  message: string;
  data: T;
}

export function createApiResponse<T>(data: T, message = ""): ApiResponseDto<T> {
  return {
    code: 200,
    message,
    data,
  };
}
