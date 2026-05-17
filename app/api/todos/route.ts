import { NextResponse } from 'next/server';
import { createTodo, listTodos } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listTodos());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const todo = createTodo(title, description);
  return NextResponse.json(todo, { status: 201 });
}
