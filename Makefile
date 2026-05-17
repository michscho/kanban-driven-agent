.PHONY: help install dev build start typecheck reset-db clean

help:
	@echo "Targets:"
	@echo "  make install     Install npm deps + create .env.local"
	@echo "  make dev         Start dev server on http://localhost:3010 (auto-installs if needed)"
	@echo "  make build       Production build (auto-installs if needed)"
	@echo "  make start       Run production build on port 3010"
	@echo "  make typecheck   Run tsc --noEmit"
	@echo "  make reset-db    Delete SQLite DB (data/todos.db*)"
	@echo "  make clean       Remove node_modules + .next"

.env.local:
	@cp .env.example .env.local
	@echo ">>> Created .env.local — edit it and add your ANTHROPIC_API_KEY before running 'make dev'"

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

install: .env.local node_modules

dev: .env.local node_modules
	@if ! grep -q '^ANTHROPIC_API_KEY=sk-' .env.local 2>/dev/null; then \
		echo ">>> WARNING: ANTHROPIC_API_KEY not set in .env.local — agent runs will fail"; \
	fi
	npm run dev

build: node_modules
	npm run build

start: node_modules
	npm run start

typecheck:
	npx tsc --noEmit

reset-db:
	rm -f data/todos.db data/todos.db-shm data/todos.db-wal data/todos.db-journal
	@echo "DB reset."

clean:
	rm -rf node_modules .next
