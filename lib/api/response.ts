import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  errors: null;
};

export type ApiError = {
  success: false;
  message: string;
  data: null;
  errors: Record<string, string[]> | null;
};

export function apiSuccess<T>(
  data: T,
  message = "OK",
  status = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, message, data, errors: null }, { status });
}

export function apiError(
  message: string,
  errors: Record<string, string[]> | null = null,
  status = 400,
): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message, data: null, errors }, { status });
}
