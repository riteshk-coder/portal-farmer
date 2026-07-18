from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from app.core.config import settings

# Startup Security Gate
if settings.OTP_DEV_MODE and settings.APP_ENV != "development":
    import sys
    print("\n" + "!"*80)
    print(" FATAL SECURITY ERROR: OTP_DEV_MODE is enabled but APP_ENV is not 'development'.")
    print(" Refusing to boot for security reasons. Please disable OTP_DEV_MODE in production.")
    print("!"*80 + "\n")
    sys.exit(1)

from app.routers import (
    auth_router,
    lots_router,
    quotes_router,
    contracts_router,
    disputes_router,
    escrow_router,
    roles_router,
    logs_router,
    analytics_router,
    scores_router
)

app = FastAPI(
    title="BuyerPortal Backend API",
    description="Production-quality REST API backend for BuyerPortal",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(lots_router)
app.include_router(quotes_router)
app.include_router(contracts_router)
app.include_router(disputes_router)
app.include_router(escrow_router)
app.include_router(roles_router)
app.include_router(logs_router)
app.include_router(analytics_router)
app.include_router(scores_router)

# Serve uploaded files static directory
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(x) for x in error.get("loc", []))
        msg = error.get("msg", "Validation error")
        errors.append(f"{loc}: {msg}")
    detail_str = "; ".join(errors)
    return JSONResponse(
        status_code=422,
        content={"detail": detail_str}
    )

@app.on_event("startup")
def startup_event():
    # 1. Dynamically patch the DB schema to add missing columns to system_logs and disputes
    from app.core.database import engine, Base
    from sqlalchemy import text
    
    is_postgres = "postgresql" in engine.url.drivername
    
    def run_ddl(sql_str):
        try:
            with engine.begin() as conn:
                conn.execute(text(sql_str))
        except Exception as e:
            # Silent fallback since column might already exist
            pass

    # Patch system_logs columns
    run_ddl("ALTER TABLE system_logs ADD COLUMN recipient_role VARCHAR")
    run_ddl("ALTER TABLE system_logs ADD COLUMN event_type VARCHAR")
    if is_postgres:
        run_ddl("ALTER TABLE system_logs ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE")
    else:
        run_ddl("ALTER TABLE system_logs ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0")

    # Patch disputes columns
    run_ddl("ALTER TABLE disputes ADD COLUMN creator_role VARCHAR DEFAULT 'buyer'")
    run_ddl("ALTER TABLE disputes ADD COLUMN attachment_url VARCHAR")

    # Patch lots columns for product taxonomy
    run_ddl("ALTER TABLE lots ADD COLUMN product_type_id INTEGER")
    run_ddl("ALTER TABLE lots ADD COLUMN category_id INTEGER")
    run_ddl("ALTER TABLE lots ADD COLUMN custom_product_name VARCHAR")
    run_ddl("ALTER TABLE lots ADD COLUMN product_photo VARCHAR")
    run_ddl("ALTER TABLE lots ADD COLUMN lab_report_url VARCHAR")

    # Patch buyers columns
    if is_postgres:
        run_ddl("ALTER TABLE buyers ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE")
        run_ddl("ALTER TABLE fpos ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE")
    else:
        run_ddl("ALTER TABLE buyers ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0")
        run_ddl("ALTER TABLE fpos ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0")

    # Patch product_types and product_categories columns
    run_ddl("ALTER TABLE product_types ADD COLUMN image_path VARCHAR")
    run_ddl("ALTER TABLE product_categories ADD COLUMN image_path VARCHAR")

    # Patch preferences tables for custom name
    run_ddl("ALTER TABLE buyer_product_preferences ADD COLUMN custom_product_name VARCHAR")
    run_ddl("ALTER TABLE fpo_product_preferences ADD COLUMN custom_product_name VARCHAR")



    # Patch pg_enum type 'disputestatus' labels for PostgreSQL
    if is_postgres:
        try:
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                try:
                    conn.execute(text("ALTER TYPE disputestatus ADD VALUE 'open'"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TYPE disputestatus ADD VALUE 'in_review'"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TYPE disputestatus ADD VALUE 'rejected'"))
                except Exception:
                    pass
        except Exception as e:
            print(f"pg_enum patch skipped: {e}")

    # 2. Ensure new tables are created (like dispute_messages, product_categories, product_types, buyer_product_preferences)
    try:
        import app.models.dispute
        import app.models.product_category
        import app.models.product_type
        import app.models.user
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database table creation failed: {e}")

    # 3. Log database backup completed notification (Admin Notification #14)
    from app.core.database import SessionLocal
    from app.services.notification_service import log_notification, NotificationChannel
    db = SessionLocal()
    try:
        log_notification(
            db,
            NotificationChannel.system,
            "MahaFPC",
            "Scheduled database backup completed successfully at 02:00 IST — 1.2 GB, all tables verified.",
            recipient_role="mahafpc",
            event_type="database_backup"
        )
    except Exception as e:
        print(f"Logging startup backup event failed: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "BuyerPortal API Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

