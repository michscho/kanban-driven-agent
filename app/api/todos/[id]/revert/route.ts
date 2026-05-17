import { NextResponse } from 'next/server';
import { getTodo, updateTodo } from '@/lib/db';
import { revertCommits } from '@/lib/git';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const shas: string[] = [];
  if (todo.approve_commit_sha) shas.push(todo.approve_commit_sha);
  if (todo.work_commit_sha) shas.push(todo.work_commit_sha);
  if (!shas.length) return NextResponse.json({ error: 'no commits to revert' }, { status: 400 });
  try {
    revertCommits(shas);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
  updateTodo(Number(id), { status: 'reverted', reverted_at: Date.now() });
  return NextResponse.json({ ok: true });
}
