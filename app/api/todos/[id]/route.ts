import { NextResponse } from 'next/server';
import { deleteTodo, getTodo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(todo);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteTodo(Number(id));
  return NextResponse.json({ ok: true });
}
