import { NextRequest, NextResponse } from 'next/server';
import { usersRepository } from '@collabverse/api';
import { flags } from '@/lib/flags';

export async function GET(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const query = (req.nextUrl.searchParams.get('q') ?? '').toLowerCase().trim();
  const allUsers = await usersRepository.list();
  const items = allUsers
    .filter((user) => {
      if (!query) {
        return true;
      }
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.title ? user.title.toLowerCase().includes(query) : false)
      );
    })
    .slice(0, 20);
  return NextResponse.json({ items });
}
