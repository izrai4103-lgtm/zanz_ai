"""
Halo AI Chat - Comprehensive Backend Server
Built with materials from the OpenClaw project:
  - gateway/platforms/api_server.py (OpenAI-compatible API pattern)
  - extensions/groq/openclaw.plugin.json (Groq model catalog)
  - extensions/webhooks/ (webhook architecture)
  - gateway/platforms/webhook.py (webhook handling)
"""
import os
import json
import logging
import hmac
import hashlib
import time
import uuid
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("halo-backend")

app = FastAPI(title="Halo AI Chat API", version="1.0.0")

# ── CORS – allow Anyclaw & local dev ──────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.anyclaw\.store|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_origins=["https://anyclaw.store"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Groq model catalog from zip materials ─────────────────────
GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY environment variable not set!")

def load_groq_models() -> List[Dict]:
    """Load models from the OpenClaw groq plugin catalog."""
    models_path = Path(__file__).parent / "groq_models.json"
    if models_path.exists():
        with open(models_path) as f:
            return json.load(f)
    # fallback
    return [
        {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant", "contextWindow": 131072},
        {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B Versatile", "contextWindow": 131072},
    ]

GROQ_MODELS = load_groq_models()

# ── Data models ────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str = "llama-3.3-70b-versatile"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096
    stream: Optional[bool] = True

class WebhookPayload(BaseModel):
    event: str = "default"
    payload: Dict[str, Any] = {}

# ── Webhook secrets (from webhook.py pattern) ──────────────────────
WEBHOOK_SECRETS: Dict[str, str] = {}
webhook_secrets_raw = os.environ.get("WEBHOOK_SECRETS", "")
if webhook_secrets_raw:
    for pair in webhook_secrets_raw.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            WEBHOOK_SECRETS[k.strip()] = v.strip()

# ── Sessions store (from api_server.py pattern) ────────────────────
sessions: Dict[str, Dict] = {}

# ═══════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    """Health check — from api_server.py pattern."""
    return {
        "status": "ok",
        "service": "halo-ai-chat",
        "version": "1.0.0",
        "models_loaded": len(GROQ_MODELS),
        "groq_configured": bool(GROQ_API_KEY),
    }

@app.get("/v1/models")
async def list_models():
    """List available models — from OpenClaw groq plugin catalog."""
    return {
        "object": "list",
        "data": [
            {
                "id": m["id"],
                "object": "model",
                "created": 1700000000,
                "owned_by": "groq",
                "name": m.get("name", m["id"]),
                "context_window": m.get("contextWindow", 131072),
            }
            for m in GROQ_MODELS
        ],
    }

@app.get("/v1/capabilities")
async def capabilities():
    """Machine-readable API capabilities — from api_server.py pattern."""
    return {
        "endpoints": {
            "chat_completions": "/v1/chat/completions",
            "models": "/v1/models",
            "health": "/health",
            "webhook": "/webhook/{route}",
            "sessions": "/api/sessions",
        },
        "streaming": True,
        "models": [m["id"] for m in GROQ_MODELS],
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """Proxy to Groq API — OpenAI-compatible format from api_server.py."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    # Validate model
    valid_ids = [m["id"] for m in GROQ_MODELS]
    if request.model not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{request.model}' not found. Available: {', '.join(valid_ids)}",
        )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": request.model,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
        "stream": request.stream,
    }

    import httpx

    async def stream_response():
        """Stream tokens SSE — pattern from api_server.py."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{GROQ_API_BASE}/chat/completions",
                                     headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    yield f"data: {json.dumps({'error': {'message': error_body.decode(), 'status': resp.status_code}})}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield line + "\n"
                        if line.strip() == "data: [DONE]":
                            break

    if request.stream:
        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{GROQ_API_BASE}/chat/completions",
                                  headers=headers, json={**payload, "stream": False})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return JSONResponse(content=resp.json())

# ── Sessions API (from api_server.py pattern) ──────────────────────

@app.post("/api/sessions")
async def create_session():
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "created": time.time(),
        "messages": [],
    }
    return {"object": "session", "id": session_id, "created": sessions[session_id]["created"]}

@app.get("/api/sessions")
async def list_sessions():
    """List all sessions."""
    return {"object": "list", "data": [{"id": sid, "created": s["created"]} for sid, s in sessions.items()]}

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a session."""
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"object": "session", "id": session_id, "created": s["created"], "messages": s["messages"]}

@app.post("/api/sessions/{session_id}/chat")
async def session_chat(session_id: str, request: ChatRequest):
    """Chat within a session — stores context."""
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store user message
    if request.messages:
        last_msg = request.messages[-1]
        s["messages"].append({"role": "user", "content": last_msg.content})

    # Forward to chat completions with full history
    all_messages = s["messages"] + [{"role": m.role, "content": m.content} for m in request.messages[:-1]]
    
    import httpx
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": request.model,
        "messages": all_messages,
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
        "stream": request.stream,
    }

    async def stream_with_session():
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{GROQ_API_BASE}/chat/completions",
                                     headers=headers, json=payload) as resp:
                full_response = ""
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield line + "\n"
                        if line.strip() == "data: [DONE]":
                            break
                        try:
                            data = json.loads(line[6:])
                            delta = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            full_response += delta or ""
                        except:
                            pass
                if full_response:
                    s["messages"].append({"role": "assistant", "content": full_response})

    if request.stream:
        return StreamingResponse(stream_with_session(), media_type="text/event-stream",
                                  headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{GROQ_API_BASE}/chat/completions",
                                  headers=headers, json={**payload, "stream": False})
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if content:
            s["messages"].append({"role": "assistant", "content": content})
        return JSONResponse(content=data)

# ── Webhook (from webhook.py & extensions/webhooks/ pattern) ───────

@app.post("/webhook/{route}")
async def webhook_receive(route: str, payload: WebhookPayload, request: Request):
    """Generic webhook receiver — pattern from gateway/platforms/webhook.py."""
    # HMAC validation if secret configured
    secret = WEBHOOK_SECRETS.get(route)
    if secret and secret != "INSECURE_NO_AUTH":
        sig = request.headers.get("X-Hub-Signature-256") or request.headers.get("X-Signature")
        if sig:
            body = await request.body()
            expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(f"sha256={expected}", sig):
                raise HTTPException(status_code=403, detail="Invalid signature")

    logger.info(f"Webhook received on route '{route}': {payload.event}")
    return {"ok": True, "event": payload.event, "route": route, "processed": True}

@app.get("/webhook/routes")
async def webhook_routes():
    """List configured webhook routes."""
    return {"object": "list", "routes": list(WEBHOOK_SECRETS.keys()) if WEBHOOK_SECRETS else ["default"]}

# ── Stats / usage (from gateway/ patterns) ─────────────────────────

@app.get("/stats")
async def stats():
    """Server statistics."""
    return {
        "sessions_count": len(sessions),
        "models_count": len(GROQ_MODELS),
        "models": [m["id"] for m in GROQ_MODELS],
        "webhook_routes": list(WEBHOOK_SECRETS.keys()) if WEBHOOK_SECRETS else [],
        "groq_configured": bool(GROQ_API_KEY),
    }

# ── Main ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting Halo AI Chat Backend on port {port}")
    logger.info(f"Loaded {len(GROQ_MODELS)} Groq models")
    uvicorn.run(app, host="0.0.0.0", port=port)
