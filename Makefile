# The True Path Islam — developer/ops task runner.
# `make help` lists every target.
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Load .env if present so targets see DATABASE_URL etc.
ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: help install gen migrate migrate-dev seed seed-agents ingest \
        dev build start test test-watch lint typecheck verify \
        up down logs ps backup restore smoke reset clean

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies + generate Prisma client
	npm ci || npm install
	npm run db:generate

gen: ## Generate the Prisma client
	npm run db:generate

migrate: ## Apply migrations to the current DATABASE_URL
	npm run db:deploy

migrate-dev: ## Create + apply a migration in development
	npm run db:migrate

seed: ## Seed staff user, biography, shahada steps, config
	npm run seed

seed-agents: ## Seed the dawah agent roster + review gates
	npm run seed:agents

ingest: ## Import Quran, tafsir and hadith from the open datasets
	npm run ingest:quran
	npm run ingest:tafsir
	npm run ingest:hadith

dev: ## Run the dev server
	npm run dev

build: ## Production build
	npm run build

start: ## Serve the production build
	npm start

test: ## Run the test suite once
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

lint: ## Lint
	npm run lint

typecheck: ## TypeScript type check
	npx tsc --noEmit

verify: lint typecheck test ## Lint + typecheck + test (what CI runs)

up: ## Start Postgres + app via docker compose
	docker compose up -d

down: ## Stop the compose stack
	docker compose down

logs: ## Tail compose logs
	docker compose logs -f

ps: ## Show compose services
	docker compose ps

backup: ## Dump the database to backups/ (DATABASE_URL)
	bash scripts/backup-db.sh

restore: ## Restore a dump: make restore FILE=backups/trupath-*.sql
	bash scripts/backup-db.sh --restore "$(FILE)"

smoke: ## Smoke-test a running instance: make smoke BASE=https://...
	bash scripts/smoke.sh "$(BASE)"

reset: ## Drop and re-create the local database, then migrate+seed
	npx prisma migrate reset --force
	$(MAKE) ingest seed seed-agents

clean: ## Remove build artifacts
	rm -rf .next node_modules/.cache
