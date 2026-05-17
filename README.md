# kanban-driven-agent

Self-contained kanban board where Claude (via Agent SDK) implements your todos behind URL feature flags.

## Flow

1. **Create todo** in `/` (title + description) → status `pending`, auto-generated slug becomes the flag name (e.g. `add-dark-mode`).
2. **Run** → Claude Agent SDK works on the repo, gates all new code behind `useFeature('add-dark-mode')` or `<Feature flag="add-dark-mode">`, commits. Status: `in_progress` → `done`.
3. **Preview** at `http://localhost:3010/?feature=add-dark-mode` (comma-separate for multiple).
4. **Approve** → second agent run strips the flag conditionals → status `approved`.
5. **Revert** → `git revert` of the work commit (+ approve commit) → status `reverted`.

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3010
```

The DB lives in `data/todos.db` (gitignored).

## Feature flags

```tsx
import { useFeature, Feature } from '@/lib/features';

// logic
if (useFeature('my-flag')) { ... }

// UI block
<Feature flag="my-flag"><NewWidget /></Feature>
```

URL: `?feature=flag1,flag2`
