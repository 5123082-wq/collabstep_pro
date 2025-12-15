import { NextResponse } from 'next/server';

export async function GET() {
  // В тестовом/локальном окружении отдаём пустой счётчик, чтобы не ронять UI при отсутствии реальных инвайтов.
  return NextResponse.json({ ok: true, data: { count: 0 } });
}
