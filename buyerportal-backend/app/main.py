from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.database import engine, Base
from app.routers import auth, lots, quotes, contracts, disputes, roles, ops

# Create database tables automatically on startup (fallback if migrations aren't run)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BuyerPortal Backend API",
    description="REST API backend for the BuyerPortal agriculture marketplace.",
    version="1.0.0"
)

# CORS configuration
# Allows communication with the Next.js frontend (usually on port 3000 or 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(lots.router)
app.include_router(quotes.router)
app.include_router(contracts.router)
app.include_router(disputes.router)
app.include_router(roles.router)
app.include_router(ops.router)

# Custom validation error handler to match the required consistent error shape: { "detail": "message" }
@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    # Construct a human-readable detail message
    error_details = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "invalid value")
        error_details.append(f"{loc}: {msg}")
    
    detail_msg = "; ".join(error_details)
    return JSONResponse(
        status_code=422,
        content={"detail": f"Validation error: {detail_msg}"}
    )

@app.get("/")
def read_root():
    return {
        "name": "BuyerPortal Backend API",
        "status": "active",
        "documentation": "/docs"
    }
