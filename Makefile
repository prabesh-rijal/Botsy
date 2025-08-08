# ===== paths =====
BACKEND_DIR=backend
FRONTEND_DIR=frontend
VENV=$(BACKEND_DIR)/.venv
UVICORN_MODULE=main:app   # change if your app is at app/main.py -> app.main:app

# ===== help =====
.PHONY: help
help:
	@echo "make setup      - fresh setup (backend venv + pip install, frontend npm install)"
	@echo "make dev        - run backend (uvicorn) + frontend (npm dev) together"
	@echo "make be         - run backend only (activates venv internally)"
	@echo "make fe         - run frontend only"
	@echo "make be.shell   - open a shell with backend venv activated"
	@echo "make be.install - (re)install backend requirements.txt"
	@echo "make fe.install - npm install in frontend"

# ===== one-time / fresh clone =====
.PHONY: setup be.install fe.install
setup: be.install fe.install

be.install:
	@test -d "$(VENV)" || (python3 -m venv "$(VENV)" && echo "✅ created venv at $(VENV)")
	@bash -lc '. "$(VENV)/bin/activate" && pip install -U pip && pip install -r "$(BACKEND_DIR)/requirements.txt" && echo "✅ backend deps installed"'

fe.install:
	@cd "$(FRONTEND_DIR)" && npm install

# ===== dev runners =====
.PHONY: dev be fe
dev:
	@cd "$(FRONTEND_DIR)" && npx concurrently \
		"bash -lc 'cd ../$(BACKEND_DIR) && . .venv/bin/activate && uvicorn $(UVICORN_MODULE) --reload --host 0.0.0.0 --port 8000'" \
		"npm run dev"

be:
	@bash -lc 'cd "$(BACKEND_DIR)" && . .venv/bin/activate && uvicorn $(UVICORN_MODULE) --reload --host 0.0.0.0 --port 8000'

fe:
	@cd "$(FRONTEND_DIR)" && npm run dev
