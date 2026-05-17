'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Todo, TodoStatus } from '@/lib/db';
import { Logo } from '@/components/Logo';

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const windowWidth = useWindowWidth();
  const isMobileView = windowWidth !== null && windowWidth < 768;

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
          <button className="settings-btn" onClick={() => setSettingsOpen(true)} title="Einstellungen">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

  // Mobile mini-view when screen is narrow (feature flagged)
  if (isMobileView) {
    return (
      <div className="app mobile-mini-view">
        <MobileMiniView
          todos={todos}
          title={title}
          desc={desc}
          setTitle={setTitle}
          setDesc={setDesc}
          submitting={submitting}
          onCreate={create}
          onAction={action}
          onRemove={remove}
          onOpenLog={setOpenLog}
          onRequestChanges={handleRequestChanges}
        />
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

  return (
    <div className="app">
      <div className={`todo-floating-container ${minimized ? 'minimized' : ''} todo-floating-top-spacing todo-floating-transparent`}>
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
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
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

  const shouldLimit = items.length >= SHOW_MORE_THRESHOLD && !expanded;
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
      {items.length >= SHOW_MORE_THRESHOLD && (
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

// Mobile Mini View - shown when screen is narrow (feature flag: wenn-verkleinert-bitte-eine-seite-erstellen-mit-ei)
function MobileMiniView({
  todos,
  title,
  desc,
  setTitle,
  setDesc,
  submitting,
  onCreate,
  onAction,
  onRemove,
  onOpenLog,
  onRequestChanges,
}: {
  todos: Todo[];
  title: string;
  desc: string;
  setTitle: (t: string) => void;
  setDesc: (d: string) => void;
  submitting: boolean;
  onCreate: (e: React.FormEvent) => void;
  onAction: (id: number, path: string) => void;
  onRemove: (id: number) => void;
  onOpenLog: (id: number) => void;
  onRequestChanges: (todo: Todo) => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'backlog' | 'progress' | 'review' | 'shipped'>('overview');

  // Group todos by status
  const backlogTodos = todos.filter(t => t.status === 'pending');
  const progressTodos = todos.filter(t => t.status === 'in_progress' || t.status === 'approving');
  const reviewTodos = todos.filter(t => t.status === 'done' || t.status === 'failed');
  const shippedTodos = todos.filter(t => t.status === 'approved' || t.status === 'reverted');

  return (
    <div className="mobile-mini-container">
      {/* Header */}
      <div className="mobile-header">
        <Logo size={28} />
        <h1>Kanban driven Agent</h1>
        <ThemeToggle />
      </div>

      {/* Tab navigation */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button
          className={`mobile-tab ${activeTab === 'backlog' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlog')}
        >
          Backlog ({backlogTodos.length})
        </button>
        <button
          className={`mobile-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          In Progress ({progressTodos.length})
        </button>
        <button
          className={`mobile-tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review ({reviewTodos.length})
        </button>
        <button
          className={`mobile-tab ${activeTab === 'shipped' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipped')}
        >
          Shipped ({shippedTodos.length})
        </button>
      </div>

      {/* Content area */}
      <div className="mobile-content">
        {activeTab === 'overview' && (
          <div className="mobile-overview">
            <div className="mobile-hero">
              <Logo size={48} />
              <h2>Baue deine Kanban driven Web App</h2>
              <p className="mobile-tagline">
                Ein selbstständiges Kanban-Board, bei dem Claude deine Todos implementiert.
              </p>
            </div>

            {/* Mini Board Preview */}
            <div className="mobile-board-preview">
              <h3>Todo Board Vorschau</h3>
              <div className="mini-board">
                <div className="mini-column">
                  <div className="mini-column-header">
                    <span>Backlog</span>
                    <span className="mini-count">{backlogTodos.length}</span>
                  </div>
                  <div className="mini-cards">
                    {backlogTodos.slice(0, 3).map(t => (
                      <div key={t.id} className="mini-card" onClick={() => setActiveTab('backlog')}>
                        <span className="mini-card-id">#{t.id}</span>
                        <span className="mini-card-title">{t.title.slice(0, 20)}{t.title.length > 20 ? '…' : ''}</span>
                      </div>
                    ))}
                    {backlogTodos.length > 3 && (
                      <div className="mini-card-more">+{backlogTodos.length - 3} mehr</div>
                    )}
                  </div>
                </div>
                <div className="mini-column">
                  <div className="mini-column-header">
                    <span>In Progress</span>
                    <span className="mini-count">{progressTodos.length}</span>
                  </div>
                  <div className="mini-cards">
                    {progressTodos.slice(0, 3).map(t => (
                      <div key={t.id} className="mini-card mini-card-active" onClick={() => setActiveTab('progress')}>
                        <span className="mini-card-id">#{t.id}</span>
                        <span className="mini-card-title">{t.title.slice(0, 20)}{t.title.length > 20 ? '…' : ''}</span>
                      </div>
                    ))}
                    {progressTodos.length > 3 && (
                      <div className="mini-card-more">+{progressTodos.length - 3} mehr</div>
                    )}
                  </div>
                </div>
                <div className="mini-column">
                  <div className="mini-column-header">
                    <span>Review</span>
                    <span className="mini-count">{reviewTodos.length}</span>
                  </div>
                  <div className="mini-cards">
                    {reviewTodos.slice(0, 3).map(t => (
                      <div key={t.id} className="mini-card mini-card-review" onClick={() => setActiveTab('review')}>
                        <span className="mini-card-id">#{t.id}</span>
                        <span className="mini-card-title">{t.title.slice(0, 20)}{t.title.length > 20 ? '…' : ''}</span>
                      </div>
                    ))}
                    {reviewTodos.length > 3 && (
                      <div className="mini-card-more">+{reviewTodos.length - 3} mehr</div>
                    )}
                  </div>
                </div>
                <div className="mini-column">
                  <div className="mini-column-header">
                    <span>Shipped</span>
                    <span className="mini-count">{shippedTodos.length}</span>
                  </div>
                  <div className="mini-cards">
                    {shippedTodos.slice(0, 3).map(t => (
                      <div key={t.id} className="mini-card mini-card-shipped" onClick={() => setActiveTab('shipped')}>
                        <span className="mini-card-id">#{t.id}</span>
                        <span className="mini-card-title">{t.title.slice(0, 20)}{t.title.length > 20 ? '…' : ''}</span>
                      </div>
                    ))}
                    {shippedTodos.length > 3 && (
                      <div className="mini-card-more">+{shippedTodos.length - 3} mehr</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick add form */}
            <div className="mobile-quick-add">
              <h3>Neues Todo</h3>
              <form className="mobile-form" onSubmit={onCreate}>
                <input
                  placeholder="Todo Titel…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Beschreibung (optional)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                />
                <button type="submit" disabled={submitting || !title.trim()}>
                  Hinzufügen
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'backlog' && (
          <MobileTodoList
            title="Backlog"
            todos={backlogTodos}
            onAction={onAction}
            onRemove={onRemove}
            onOpenLog={onOpenLog}
            onRequestChanges={onRequestChanges}
            emptyMessage="Keine Todos im Backlog"
          />
        )}

        {activeTab === 'progress' && (
          <MobileTodoList
            title="In Progress"
            todos={progressTodos}
            onAction={onAction}
            onRemove={onRemove}
            onOpenLog={onOpenLog}
            onRequestChanges={onRequestChanges}
            emptyMessage="Keine Todos in Bearbeitung"
          />
        )}

        {activeTab === 'review' && (
          <MobileTodoList
            title="Review"
            todos={reviewTodos}
            onAction={onAction}
            onRemove={onRemove}
            onOpenLog={onOpenLog}
            onRequestChanges={onRequestChanges}
            emptyMessage="Keine Todos zur Überprüfung"
          />
        )}

        {activeTab === 'shipped' && (
          <MobileTodoList
            title="Shipped"
            todos={shippedTodos}
            onAction={onAction}
            onRemove={onRemove}
            onOpenLog={onOpenLog}
            onRequestChanges={onRequestChanges}
            emptyMessage="Keine shipped Todos"
          />
        )}
      </div>
    </div>
  );
}

// Mobile Todo List component for the tabs
function MobileTodoList({
  title,
  todos,
  onAction,
  onRemove,
  onOpenLog,
  onRequestChanges,
  emptyMessage,
}: {
  title: string;
  todos: Todo[];
  onAction: (id: number, path: string) => void;
  onRemove: (id: number) => void;
  onOpenLog: (id: number) => void;
  onRequestChanges: (todo: Todo) => void;
  emptyMessage: string;
}) {
  return (
    <div className="mobile-todo-list">
      <h2>{title} <span className="mobile-count">{todos.length}</span></h2>
      {todos.length === 0 ? (
        <div className="mobile-empty">{emptyMessage}</div>
      ) : (
        <div className="mobile-cards">
          {todos.map(todo => (
            <MobileCard
              key={todo.id}
              todo={todo}
              onAction={onAction}
              onRemove={onRemove}
              onOpenLog={() => onOpenLog(todo.id)}
              onRequestChanges={onRequestChanges}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile Card component
function MobileCard({
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
  const MAX_DESC_LENGTH = 60;

  const displayDescription = todo.description && todo.description.length > MAX_DESC_LENGTH
    ? todo.description.slice(0, MAX_DESC_LENGTH) + '…'
    : todo.description;

  return (
    <div className="mobile-card-full">
      <div className="mobile-card-header">
        <span className="mobile-card-id">#{id}</span>
        <span className="mobile-card-status">{status}</span>
      </div>
      <div className="mobile-card-title">{todo.title}</div>
      <div className="mobile-card-slug">flag: {slug}</div>
      {todo.description && (
        <div className="mobile-card-desc" title={todo.description}>{displayDescription}</div>
      )}
      <div className="mobile-card-actions">
        {status === 'pending' && (
          <>
            <button className="primary" onClick={() => onAction(id, 'run')}>Run</button>
            <button onClick={() => onRemove(id)}>Löschen</button>
          </>
        )}
        {(status === 'in_progress' || status === 'approving') && (
          <button onClick={onOpenLog}>Log anzeigen…</button>
        )}
        {status === 'done' && (
          <>
            <a href={`/?feature=${slug}`}>Preview</a>
            <button className="primary" onClick={() => onAction(id, 'approve')}>Approve</button>
            <button className="warning" onClick={() => onRequestChanges(todo)}>Ändern</button>
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
            <button onClick={() => onRemove(id)}>Löschen</button>
          </>
        )}
        {status === 'reverted' && (
          <>
            <button onClick={onOpenLog}>Log</button>
            <button onClick={() => onRemove(id)}>Löschen</button>
          </>
        )}
      </div>
      {todo.error && <div className="mobile-card-error">{todo.error}</div>}
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

// Settings Modal Component (Feature: rechts-von-verkleinern-settings-button)
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('claude-api-key');
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  function handleSave() {
    localStorage.setItem('claude-api-key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    localStorage.removeItem('claude-api-key');
    setApiKey('');
  }

  return (
    <div className="log-modal" onClick={onClose}>
      <div className="inner settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <strong>Einstellungen</strong>
          <button onClick={onClose}>Schließen</button>
        </div>
        <div className="settings-content">
          <section className="settings-section">
            <h3>Claude API Key</h3>
            <p className="settings-description">
              Gib deinen Claude API Key ein, um den Kanban Agent zu nutzen.
              Der Key wird lokal in deinem Browser gespeichert.
            </p>
            <div className="settings-input-group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="settings-input"
              />
              <div className="settings-buttons">
                <button onClick={handleSave} className="primary" disabled={!apiKey.trim()}>
                  {saved ? 'Gespeichert!' : 'Speichern'}
                </button>
                {apiKey && (
                  <button onClick={handleClear} className="danger">
                    Löschen
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3>Anleitung</h3>
            <div className="settings-instructions">
              <ol>
                <li>
                  <strong>API Key besorgen:</strong> Gehe zu{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                    console.anthropic.com
                  </a>{' '}
                  und erstelle einen neuen API Key.
                </li>
                <li>
                  <strong>Key einfügen:</strong> Kopiere den Key und füge ihn oben ein.
                </li>
                <li>
                  <strong>Todo erstellen:</strong> Erstelle ein neues Todo mit Titel und Beschreibung.
                </li>
                <li>
                  <strong>Run klicken:</strong> Der Claude Agent implementiert dein Todo automatisch.
                </li>
                <li>
                  <strong>Preview & Approve:</strong> Prüfe die Änderungen via{' '}
                  <code>?feature=slug</code> und approven wenn zufrieden.
                </li>
              </ol>
            </div>
          </section>

          <section className="settings-section">
            <h3>Hinweise</h3>
            <ul className="settings-notes">
              <li>Der API Key wird nur lokal gespeichert und nie an unsere Server gesendet.</li>
              <li>Alle Code-Änderungen sind hinter Feature-Flags geschützt.</li>
              <li>Du kannst jederzeit Änderungen mit &quot;Revert&quot; rückgängig machen.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
