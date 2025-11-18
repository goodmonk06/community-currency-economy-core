.PHONY: help install dev build clean docker-up docker-down docker-logs db-push db-migrate db-seed db-studio test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pnpm install

dev: ## Run development servers
	pnpm dev

build: ## Build all packages
	pnpm build

clean: ## Clean build artifacts
	pnpm clean
	rm -rf node_modules

test: ## Run tests
	pnpm test

# Docker commands
docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-build: ## Build Docker images
	docker-compose build

# Database commands
db-push: ## Push Prisma schema to database
	cd packages/core && pnpm prisma db push

db-migrate: ## Run Prisma migrations
	cd packages/core && pnpm prisma migrate dev

db-seed: ## Seed the database
	cd packages/core && pnpm prisma db seed

db-studio: ## Open Prisma Studio
	cd packages/core && pnpm prisma studio

db-reset: ## Reset database and seed
	cd packages/core && pnpm prisma migrate reset --force

# Quick start
setup: install db-push db-seed ## Setup project (install, push schema, seed)
	@echo "✅ Setup complete! Run 'make dev' to start development servers."
