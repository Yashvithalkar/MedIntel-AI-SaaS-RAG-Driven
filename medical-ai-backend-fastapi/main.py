import os
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Import your routers (we will create these next in the routers/ folder)
from routers import auth_routes, patient_routes, doctor_routes, knowledge_routes

app = FastAPI(
    title="Medical AI API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ==============================================================
# CORS CONFIGURATION (Replaces express cors middleware)
# ==============================================================
client_url = os.getenv("CLIENT_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[client_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Note: Helmet security headers are handled natively by FastAPI/Starlette, 
# and JSON/URL-encoded body parsing is built-in automatically. Cookie parsing 
# is handled directly inside endpoint parameters via Cookie().


# ==============================================================
# HEALTH CHECK ENDPOINT
# ==============================================================
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "message": "Medical AI API is running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.getenv("NODE_ENV", "development"),
    }


# ==============================================================
# REGISTER API ROUTERS
# ==============================================================
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(patient_routes.router, prefix="/api/patient", tags=["Patient"])
app.include_router(doctor_routes.router, prefix="/api/doctor", tags=["Doctor"])
app.include_router(knowledge_routes.router, prefix="/api/knowledge", tags=["Knowledge"])


# ==============================================================
# GLOBAL ERROR HANDLER (Replaces middleware/errorHandler.js)
# ==============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # In production: log to error monitoring service (Sentry, Datadog)
    print(f"💥 Unhandled Exception: {str(exc)}")
    
    is_prod = os.getenv("NODE_ENV") == "production"
    error_message = "An unexpected error occurred" if is_prod else str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal Server Error",
            "error": error_message,
        },
    )


# ==============================================================
# SERVER STARTUP EVENT
# ==============================================================
@app.on_event("startup")
async def startup_event():
    port = os.getenv("PORT", "5000")
    node_env = os.getenv("NODE_ENV", "development")
    print("\n🚀 Medical AI Backend started (FastAPI)")
    print(f"   → Server:      http://localhost:{port}")
    print(f"   → Health:      http://localhost:{port}/health")
    print(f"   → Docs (Swagger): http://localhost:{port}/docs")
    print(f"   → Environment: {node_env}")
    print("")