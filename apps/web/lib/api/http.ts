import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  details?: string;
}

export function jsonError(message: string, init?: ResponseInit & { details?: string }): NextResponse<ApiErrorResponse> {
  const status = init?.status ?? 400;
  const { details, ...responseInit } = init || {};
  return NextResponse.json(
    { ok: false, error: message, ...(details ? { details } : {}) },
    { ...responseInit, status }
  );
}
