import { NextResponse } from 'next/server';
import { getTodo } from '@/lib/db';
import { runApproveAgent } from '@/lib/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (todo.status !== 'done') {
    return NextResponse.json({ error: `cannot approve from status ${todo.status}` }, { status: 409 });
  }
  runApproveAgent(Number(id)).catch((e) => console.error('approve error', e));
  return NextResponse.json({ ok: true });
}
