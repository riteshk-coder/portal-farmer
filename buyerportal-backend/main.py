from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import uvicorn

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

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "BuyerPortal API Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
