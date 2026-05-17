import { NextResponse } from 'next/server';
import { getTodo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    status: todo.status,
    log: todo.agent_log,
    error: todo.error,
    work_commit_sha: todo.work_commit_sha,
    approve_commit_sha: todo.approve_commit_sha,
  });
}
