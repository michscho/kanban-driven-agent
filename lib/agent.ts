import { query } from '@anthropic-ai/claude-agent-sdk';
import { appendLog, getTodo, updateTodo, type Todo } from './db';
import { commitAll, hasChanges } from './git';

const WORK_SYSTEM_PROMPT = `You are implementing a feature in a Next.js 15 / React 19 / TypeScript repo (the kanban-driven-agent itself, self-contained).

ABSOLUTE RULE — feature flags:
- ALL new user-visible behavior MUST be gated behind the feature flag passed in the task.
- For logic / hooks / conditionals: \`import { useFeature } from '@/lib/features'\` then \`if (useFeature('<flag>')) { ... }\`.
- For UI blocks / JSX subtrees: \`import { Feature } from '@/lib/features'\` then \`<Feature flag="<flag>">...</Feature>\`.
- Pick whichever fits the surface naturally. Use the Feature component for self-contained JSX subtrees; useFeature for logic, state, or when you need the boolean value.
- New shared utilities / non-user-visible helpers may be added unflagged (they're inert until a flagged caller uses them), but every entry point that activates the feature must be flagged.
- Never modify lib/features.tsx, lib/db.ts, lib/agent.ts, lib/git.ts, or the API routes under app/api/ unless the task explicitly requests it.

Workflow:
1. Explore relevant files first (Read, Glob, Grep).
2. Implement the change minimally.
3. Do NOT run \`npm install\`, \`npm run dev\`, or \`git commit\` — the harness commits for you.
4. End by briefly stating what you changed.`;

const APPROVE_SYSTEM_PROMPT = `You are stripping a feature flag from a Next.js / React / TS codebase.

The feature has been approved. Remove ALL gating for flag "<FLAG>" while keeping the gated code:

- \`if (useFeature('<FLAG>')) { X }\` → keep X (unwrap the if).
- \`useFeature('<FLAG>')\` used as a boolean expression → replace with \`true\` and simplify (\`X && useFeature('<FLAG>')\` → \`X\`, ternaries collapse to the truthy branch).
- \`<Feature flag="<FLAG>">CHILDREN</Feature>\` → replace with CHILDREN (unwrap).
- Remove now-unused \`useFeature\` / \`Feature\` imports from affected files.
- Do NOT touch other flags or unrelated code.
- Do NOT run npm/git commands — the harness commits for you.

Be thorough: grep the whole repo first to find every occurrence.`;

export async function runWorkAgent(todoId: number): Promise<void> {
  const todo = getTodo(todoId);
  if (!todo) throw new Error(`todo ${todoId} not found`);

  updateTodo(todoId, { status: 'in_progress', started_at: Date.now(), error: null });

  const userPrompt = buildWorkPrompt(todo);

  try {
    await streamAgent(todoId, userPrompt, WORK_SYSTEM_PROMPT);
    if (!hasChanges()) {
      const sha = (await import('./git')).headSha();
      updateTodo(todoId, {
        status: 'done',
        completed_at: Date.now(),
        work_commit_sha: sha,
      });
      appendLog(todoId, '\n[harness] agent made no file changes; recording current HEAD\n');
      return;
    }
    const sha = commitAll(`todo #${todo.id}: ${todo.title} [flag: ${todo.slug}]`);
    updateTodo(todoId, {
      status: 'done',
      completed_at: Date.now(),
      work_commit_sha: sha,
    });
    appendLog(todoId, `\n[harness] committed ${sha}\n`);
  } catch (err: any) {
    updateTodo(todoId, { status: 'failed', error: String(err?.message ?? err) });
    appendLog(todoId, `\n[harness] ERROR: ${err?.message ?? err}\n`);
    throw err;
  }
}

export async function runApproveAgent(todoId: number): Promise<void> {
  const todo = getTodo(todoId);
  if (!todo) throw new Error(`todo ${todoId} not found`);
  if (todo.status !== 'done') throw new Error(`todo ${todoId} is ${todo.status}, expected done`);

  updateTodo(todoId, { status: 'approving' });

  const sysPrompt = APPROVE_SYSTEM_PROMPT.replaceAll('<FLAG>', todo.slug);
  const userPrompt = `Strip all gating for the feature flag "${todo.slug}" across the repo. Keep all gated code.`;

  try {
    await streamAgent(todoId, userPrompt, sysPrompt);
    const sha = commitAll(`approve #${todo.id}: strip flag ${todo.slug}`);
    updateTodo(todoId, {
      status: 'approved',
      approved_at: Date.now(),
      approve_commit_sha: sha,
    });
    appendLog(todoId, `\n[harness] approved, stripped flag, committed ${sha ?? '(no changes)'}\n`);
  } catch (err: any) {
    updateTodo(todoId, { status: 'failed', error: String(err?.message ?? err) });
    appendLog(todoId, `\n[harness] APPROVE ERROR: ${err?.message ?? err}\n`);
    throw err;
  }
}

function buildWorkPrompt(todo: Todo): string {
  return `# Todo #${todo.id}: ${todo.title}

Feature flag to use: \`${todo.slug}\`

## Description
${todo.description || '(no description provided)'}

Implement this. Gate all new user-visible code behind the flag "${todo.slug}".
After you're done, the user will preview at \`http://localhost:3010/?feature=${todo.slug}\`.`;
}

async function streamAgent(todoId: number, prompt: string, systemPrompt: string): Promise<void> {
  const iter = query({
    prompt,
    options: {
      cwd: process.cwd(),
      systemPrompt,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    },
  });

  for await (const msg of iter) {
    appendLog(todoId, formatMessage(msg));
  }
}

function formatMessage(msg: any): string {
  try {
    if (msg.type === 'system') {
      return `\n[system] ${msg.subtype ?? ''}\n`;
    }
    if (msg.type === 'assistant' && msg.message?.content) {
      const parts = msg.message.content
        .map((c: any) => {
          if (c.type === 'text') return c.text;
          if (c.type === 'tool_use') return `\n[tool: ${c.name}] ${JSON.stringify(c.input).slice(0, 500)}\n`;
          return '';
        })
        .join('');
      return parts + '\n';
    }
    if (msg.type === 'user' && msg.message?.content) {
      const parts = msg.message.content
        .map((c: any) => {
          if (c.type === 'tool_result') {
            const text = typeof c.content === 'string'
              ? c.content
              : (c.content?.map?.((x: any) => x.text).join('') ?? '');
            return `[tool_result] ${String(text).slice(0, 500)}\n`;
          }
          return '';
        })
        .join('');
      return parts;
    }
    if (msg.type === 'result') {
      return `\n[result] ${msg.subtype ?? ''} (${msg.duration_ms}ms, $${msg.total_cost_usd ?? '?'})\n`;
    }
    return '';
  } catch {
    return '';
  }
}
