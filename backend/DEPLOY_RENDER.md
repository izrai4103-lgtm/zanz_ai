# Deploy Backend to Render

1. Go to https://render.com and sign up / log in
2. Click **New +** → **Web Service**
3. Connect your GitHub repo OR use **Deploy from Branch** with this repo
4. Configure:
   - **Name**: `halo-ai-chat`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Add environment variable:
   - **Key**: `GROQ_API_KEY`
   - **Value**: `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`
6. Click **Deploy Web Service**
7. After deploy, you'll get a URL like `https://halo-ai-chat.onrender.com`
8. Open the frontend, and click the ⚙️ settings icon to set this URL

## Alternative: Deploy manually

```bash
git clone <your-repo>
cd halo/backend

# Create a .env file
echo "GROQ_API_KEY=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" > .env

# Install and run
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Verify

```bash
curl https://halo-ai-chat.onrender.com/health
# → {"status":"ok","service":"halo-ai-chat"}
```
