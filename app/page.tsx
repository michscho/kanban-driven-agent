'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Todo, TodoStatus } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { useFeature, Feature } from '@/lib/features';

const COLUMNS: { key: TodoStatus | 'wip'; label: string; match: (s: TodoStatus) => boolean }[] = [
  { key: 'pending', label: 'Backlog', match: (s) => s === 'pending' },
  { key: 'wip', label: 'In Progress', match: (s) => s === 'in_progress' || s === 'approving' },
  { key: 'done', label: 'Review', match: (s) => s === 'done' || s === 'failed' },
  { key: 'approved', label: 'Shipped', match: (s) => s === 'approved' || s === 'reverted' },
];

// Custom hook for responsive breakpoint detection
function useWindowWidth() {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    // Set initial width
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openLog, setOpenLog] = useState<number | null>(null);
  const [feedbackTodo, setFeedbackTodo] = useState<Todo | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Feature flag for responsive mini-view
  const responsiveMiniViewEnabled = useFeature('wenn-verkleinert-bitte-eine-seite-erstellen-mit-ei');
  const windowWidth = useWindowWidth();
  const isMobileView = responsiveMiniViewEnabled && windowWidth !== null && windowWidth < 768;

  const refresh = useCallback(async () => {
    const r = await fetch('/api/todos', { cache: 'no-store' });
    if (r.ok) setTodos(await r.json());
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 2500);
    return () => clearInterval(iv);
  }, [refresh]);

  // Update document title
  useEffect(() => {
    document.title = 'Kanban driven Agent';
  }, []);

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

  function handleRequestChanges(todo: Todo) {
    setFeedbackTodo(todo);
  }

  async function submitFeedback(feedback: string) {
    if (!feedbackTodo) return;
    // For now, we just run the action - the feedback is logged
    console.log(`Feedback for todo #${feedbackTodo.id}:`, feedback);
    await action(feedbackTodo.id, 'run');
    setFeedbackTodo(null);
  }

  const todoInterface = (
    <>
      <div className="header">
        <HeaderBrand />
        <div className="header-right">
          <div className="muted">port 3010 · preview a feature: <code>?feature=&lt;slug&gt;</code></div>
          <ThemeToggle />
          <button className="minimize-btn" onClick={() => setMinimized(true)} title="Minimieren">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
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
            <Column
              key={col.key}
              label={col.label}
              items={items}
              onAction={action}
              onRemove={remove}
              onOpenLog={setOpenLog}
              onRequestChanges={handleRequestChanges}
            />
          );
        })}
      </div>
    </>
  );

  return (
    <div className="app">
      <div className={`todo-floating-container ${minimized ? 'minimized' : ''} todo-floating-top-spacing`}>
        {todoInterface}
      </div>

      {/* Minimized floating logo button */}
      {minimized && (
        <button
          className="floating-logo-btn floating-logo-btn-right"
          onClick={() => setMinimized(false)}
          title="Kanban Board öffnen"
        >
          <Logo size={32} />
        </button>
      )}

      {openLog !== null && <LogModal id={openLog} onClose={() => setOpenLog(null)} />}
      {feedbackTodo && (
        <FeedbackModal
          todo={feedbackTodo}
          onClose={() => setFeedbackTodo(null)}
          onSubmit={submitFeedback}
        />
      )}
    </div>
  );
}

const SHOW_MORE_THRESHOLD = 12;

function Column({
  label,
  items,
  onAction,
  onRemove,
  onOpenLog,
  onRequestChanges,
}: {
  label: string;
  items: Todo[];
  onAction: (id: number, path: string) => void;
  onRemove: (id: number) => void;
  onOpenLog: (id: number) => void;
  onRequestChanges: (todo: Todo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const showMoreEnabled = useFeature('bei-der-todo-spalte-ab-12-mehr-anzeigen-erlauben-s');

  const shouldLimit = showMoreEnabled && items.length >= SHOW_MORE_THRESHOLD && !expanded;
  const displayedItems = shouldLimit ? items.slice(0, SHOW_MORE_THRESHOLD) : items;
  const hiddenCount = items.length - SHOW_MORE_THRESHOLD;

  return (
    <div className="col">
      <h2>{label}<span className="count">{items.length}</span></h2>
      {displayedItems.map((t) => (
        <Card
          key={t.id}
          todo={t}
          onAction={onAction}
          onRemove={onRemove}
          onOpenLog={() => onOpenLog(t.id)}
          onRequestChanges={onRequestChanges}
        />
      ))}
      {showMoreEnabled && items.length >= SHOW_MORE_THRESHOLD && (
        <button
          className="show-more-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Weniger anzeigen' : `${hiddenCount} weitere anzeigen…`}
        </button>
      )}
    </div>
  );
}

function Card({
  todo,
  onAction,
  onRemove,
  onOpenLog,
  onRequestChanges,
}: {
  todo: Todo;
  onAction: (id: number, path: string) => void;
  onRemove: (id: number) => void;
  onOpenLog: () => void;
  onRequestChanges: (todo: Todo) => void;
}) {
  const { status, slug, id } = todo;
  const MAX_DESC_LENGTH = 100;

  const displayDescription = todo.description && todo.description.length > MAX_DESC_LENGTH
    ? todo.description.slice(0, MAX_DESC_LENGTH) + '…'
    : todo.description;

  return (
    <div className="card">
      <div className="title">#{id} {todo.title}</div>
      <div className="slug">flag: {slug} · {status}</div>
      {todo.description && <div className="desc" title={todo.description}>{displayDescription}</div>}
      <div className="actions">
        {status === 'pending' && (
          <button className="primary" onClick={() => onAction(id, 'run')}>Run</button>
        )}
        {(status === 'in_progress' || status === 'approving') && (
          <button onClick={onOpenLog}>View log…</button>
        )}
        {status === 'done' && (
          <>
            <a href={`/?feature=${slug}`}>Preview</a>
            <button className="primary" onClick={() => onAction(id, 'approve')}>Approve</button>
            <button className="warning" onClick={() => onRequestChanges(todo)}>Änderungen</button>
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

function FeedbackModal({
  todo,
  onClose,
  onSubmit,
}: {
  todo: Todo;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(feedback);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="log-modal" onClick={onClose}>
      <div className="inner feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <strong>Änderungen anfordern — #{todo.id}</strong>
          <button onClick={onClose}>Abbrechen</button>
        </div>
        <form onSubmit={handleSubmit} className="feedback-form">
          <p className="feedback-info">
            Was soll geändert werden? Beschreibe die gewünschten Änderungen:
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="z.B. Bitte füge einen Button hinzu, der die Farbe ändert..."
            rows={5}
            autoFocus
            required
          />
          <div className="feedback-actions">
            <button type="button" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="primary" disabled={submitting || !feedback.trim()}>
              {submitting ? 'Wird gesendet…' : 'Änderungen anfordern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-hero-brand">
          <Logo size={56} />
          <h1>Kanban driven Agent</h1>
        </div>
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
  return (
    <div className="header-brand">
      <Logo />
      <h1>Kanban driven Agent</h1>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Zu Light Mode wechseln' : 'Zu Dark Mode wechseln'}>
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
