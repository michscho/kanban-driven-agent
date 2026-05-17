'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Todo, TodoStatus } from '@/lib/db';
import { Feature, useFeature } from '@/lib/features';
import { Logo } from '@/components/Logo';

const COLUMNS: { key: TodoStatus | 'wip'; label: string; match: (s: TodoStatus) => boolean }[] = [
  { key: 'pending', label: 'Backlog', match: (s) => s === 'pending' },
  { key: 'wip', label: 'In Progress', match: (s) => s === 'in_progress' || s === 'approving' },
  { key: 'done', label: 'Review', match: (s) => s === 'done' || s === 'failed' },
  { key: 'approved', label: 'Shipped', match: (s) => s === 'approved' || s === 'reverted' },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openLog, setOpenLog] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/todos', { cache: 'no-store' });
    if (r.ok) setTodos(await r.json());
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 2500);
    return () => clearInterval(iv);
  }, [refresh]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, description: desc }),
      });
      setTitle('');
      setDesc('');
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function action(id: number, path: string) {
    await fetch(`/api/todos/${id}/${path}`, { method: 'POST' });
    refresh();
  }

  async function remove(id: number) {
    if (!confirm('Delete this todo?')) return;
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="app">
      <LandingPage />

      <div className="header">
        <HeaderBrand />
        <div className="muted">port 3010 · preview a feature: <code>?feature=&lt;slug&gt;</code></div>
      </div>

      <form className="new-form" onSubmit={create}>
        <input
          placeholder="Todo title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description / acceptance criteria (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button type="submit" disabled={submitting || !title.trim()}>Add</button>
      </form>

      <div className="board">
        {COLUMNS.map((col) => {
          const items = todos.filter((t) => col.match(t.status));
          return (
            <div key={col.key} className="col">
              <h2>{col.label}<span className="count">{items.length}</span></h2>
              {items.map((t) => (
                <Card key={t.id} todo={t} onAction={action} onRemove={remove} onOpenLog={() => setOpenLog(t.id)} />
              ))}
            </div>
          );
        })}
      </div>

      {openLog !== null && <LogModal id={openLog} onClose={() => setOpenLog(null)} />}
    </div>
  );
}

function Card({
  todo,
  onAction,
  onRemove,
  onOpenLog,
}: {
  todo: Todo;
  onAction: (id: number, path: string) => void;
  onRemove: (id: number) => void;
  onOpenLog: () => void;
}) {
  const { status, slug, id } = todo;
  return (
    <div className="card">
      <div className="title">#{id} {todo.title}</div>
      <div className="slug">flag: {slug} · {status}</div>
      {todo.description && <div className="desc">{todo.description}</div>}
      <div className="actions">
        {status === 'pending' && (
          <button className="primary" onClick={() => onAction(id, 'run')}>Run</button>
        )}
        {(status === 'in_progress' || status === 'approving') && (
          <button onClick={onOpenLog}>View log…</button>
        )}
        {status === 'done' && (
          <>
            <a href={`/?feature=${slug}`} target="_blank" rel="noreferrer">Preview ↗</a>
            <button className="primary" onClick={() => onAction(id, 'approve')}>Approve</button>
            <Feature flag="review-prozess-verbessern">
              <button className="warning" onClick={() => onAction(id, 'run')}>Änderungen</button>
            </Feature>
            <button className="danger" onClick={() => onAction(id, 'revert')}>Revert</button>
            <button onClick={onOpenLog}>Log</button>
          </>
        )}
        {status === 'approved' && (
          <>
            <button className="danger" onClick={() => onAction(id, 'revert')}>Revert</button>
            <button onClick={onOpenLog}>Log</button>
          </>
        )}
        {status === 'failed' && (
          <>
            <button className="primary" onClick={() => onAction(id, 'run')}>Retry</button>
            <button onClick={onOpenLog}>Log</button>
          </>
        )}
        {status === 'reverted' && <button onClick={onOpenLog}>Log</button>}
        {(status === 'pending' || status === 'failed' || status === 'reverted') && (
          <button onClick={() => onRemove(id)}>Delete</button>
        )}
      </div>
      {todo.error && <div className="err">{todo.error}</div>}
    </div>
  );
}

function LogModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [log, setLog] = useState('(loading…)');
  const [status, setStatus] = useState<string>('');
  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await fetch(`/api/todos/${id}/log`, { cache: 'no-store' });
      if (!alive || !r.ok) return;
      const j = await r.json();
      setLog(j.log || '(no output yet)');
      setStatus(j.status);
    }
    tick();
    const iv = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(iv); };
  }, [id]);
  return (
    <div className="log-modal" onClick={onClose}>
      <div className="inner" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <strong>Agent log — #{id} ({status})</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <pre>{log}</pre>
      </div>
    </div>
  );
}

function LandingPage() {
  const hasBetterBranding = useFeature('besseres-branding');

  return (
    <div className="landing-page">
      <div className="landing-hero">
        {hasBetterBranding ? (
          <div className="landing-hero-brand">
            <Logo size={56} />
            <h1>kanban-driven-agent</h1>
          </div>
        ) : (
          <h1>🚀 kanban-driven-agent</h1>
        )}
        <p className="landing-tagline">
          Ein selbstständiges Kanban-Board, bei dem Claude (via Agent SDK) deine Todos implementiert –
          geschützt hinter URL-Feature-Flags.
        </p>
      </div>

      <div className="landing-section">
        <h2>🎯 Was ist das?</h2>
        <p>
          Dieses Projekt ist ein experimentelles Tool, das AI-gesteuerte Entwicklung mit Feature-Flags kombiniert.
          Du erstellst eine Aufgabe (Todo), und ein Claude-Agent implementiert sie automatisch in diesem Repository.
          Alle Änderungen werden hinter Feature-Flags versteckt, sodass du sie sicher testen kannst,
          bevor sie endgültig übernommen werden.
        </p>
      </div>

      <div className="landing-section">
        <h2>⚙️ Wie funktioniert es?</h2>
        <ol className="landing-steps">
          <li>
            <strong>Todo erstellen:</strong> Gib einen Titel und eine Beschreibung ein.
            Ein Slug wird automatisch generiert (z.B. <code>add-dark-mode</code>).
          </li>
          <li>
            <strong>Run klicken:</strong> Der Claude Agent SDK arbeitet am Repo und erstellt
            Code hinter <code>useFeature(&apos;slug&apos;)</code> oder <code>&lt;Feature flag=&quot;slug&quot;&gt;</code>.
          </li>
          <li>
            <strong>Vorschau:</strong> Besuche <code>?feature=slug</code>, um die Änderungen zu sehen.
          </li>
          <li>
            <strong>Approve:</strong> Ein zweiter Agent-Lauf entfernt die Flag-Conditionals – die Funktion ist live!
          </li>
          <li>
            <strong>Revert:</strong> Falls etwas schiefgeht, <code>git revert</code> macht alles rückgängig.
          </li>
        </ol>
      </div>

      <div className="landing-section">
        <h2>🛠️ Feature-Flags verwenden</h2>
        <pre className="landing-code">{`import { useFeature, Feature } from '@/lib/features';

// Für Logik
if (useFeature('my-flag')) {
  // neuer Code hier
}

// Für UI-Blöcke
<Feature flag="my-flag">
  <NeueKomponente />
</Feature>`}</pre>
      </div>

      <div className="landing-section">
        <h2>🚀 Los geht&apos;s!</h2>
        <p>
          Erstelle dein erstes Todo im Formular unten und beobachte, wie Claude es für dich implementiert.
        </p>
      </div>

      <hr className="landing-divider" />
    </div>
  );
}

function HeaderBrand() {
  const hasBetterBranding = useFeature('besseres-branding');

  if (hasBetterBranding) {
    return (
      <div className="header-brand">
        <Logo />
        <h1>kanban-driven-agent</h1>
      </div>
    );
  }

  return <h1>kanban-driven-agent</h1>;
}
