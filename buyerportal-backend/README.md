# BuyerPortal Backend API

A production-quality REST API backend built using **Python, FastAPI, SQLAlchemy, Alembic, and PostgreSQL/SQLite**. This API serves as the backend layer for the BuyerPortal Next.js frontend, implementing JWT authentication, custom roles permission control, and complete trade lifecycle state-machine validations.

---

## Technical Architecture

The backend follows a layered monolithic architecture:
- **`app/models/`**: Declarative SQLAlchemy models mapping database tables.
- **`app/schemas/`**: Pydantic models for request validation and response formatting. Outputs are automatically converted from database `snake_case` to frontend `camelCase`.
- **`app/routers/`**: APIRouters grouping REST endpoints (`auth`, `lots`, `quotes`, `contracts`, `disputes`, `roles`, `ops`).
- **`app/services/`**: Pure business services enforcing server-side rules (negotiation rounds, AI matching, escrow payouts splits).
- **`app/core/`**: JWT configurations, secure password hashing, and dependency-injection guards.

---

## Database Configuration

By default, the backend connects to a local **SQLite** database (`buyerportal.db`) to enable zero-dependency execution. 

To run it on **PostgreSQL**, configure the connection string in your `.env` file:
```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/buyerportal
```

---

## Setup & Running Instructions

### 1. Prerequisites
Ensure you have Python installed. If Astral's `uv` tool is installed on your system (recommended), you can run commands directly using `uv`.

### 2. Install Dependencies
Run the following command from the `buyerportal-backend` folder to create a virtual environment and install packages:
```bash
# If using uv (highly recommended)
uv venv
uv pip install -r requirements.txt

# Or using standard pip
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Run Migrations
Initialize the database tables via Alembic:
```bash
# Using uv
uv run alembic upgrade head

# Or using standard python
alembic upgrade head
```

### 5. Seed Database
Seed the database with the exact demo data, FPO profiles, buyer names, and trade histories used in the frontend:
```bash
# Using uv
uv run python seed.py

# Or using standard python
python seed.py
```
This seeds the users:
- **FPO User**: `fpo@buyerportal.com` (password: `password`)
- **Buyer User**: `buyer@buyerportal.com` (password: `password`)
- **Regulator User**: `mahafpc@buyerportal.com` (password: `password`)
- **Escrow User**: `escrow@buyerportal.com` (password: `password`)
- **Portal User**: `portal@buyerportal.com` (password: `password`)

### 6. Run Test Suite
Run automated tests verifying all business rules (48h quote windows, 3-round counter limits, 70/30 escrow splits, permissions guards):
```bash
# Using uv
uv run python -m pytest

# Or using standard python
python -m pytest
```

### 7. Start API Server
Launch the FastAPI uvicorn development server:
```bash
# Using uv
uv run uvicorn app.main:app --reload --port 8000

# Or using standard python
uvicorn app.main:app --reload --port 8000
```

Once running, the interactive API documentation is available at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
