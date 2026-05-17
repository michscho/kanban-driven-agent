import { NextResponse } from 'next/server';
import { getTodo } from '@/lib/db';
import { runWorkAgent } from '@/lib/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (todo.status === 'in_progress' || todo.status === 'approving') {
    return NextResponse.json({ error: 'already running' }, { status: 409 });
  }
  // fire and forget; client polls /log
  runWorkAgent(Number(id)).catch((e) => console.error('agent error', e));
  return NextResponse.json({ ok: true });
}
