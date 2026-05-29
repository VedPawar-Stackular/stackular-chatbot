# Running Locally

```bash
# Install root dev deps
npm install

# Backend setup (one-time)
cd stackular-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Frontend setup (one-time)
cd stackular-frontend && npm install && cd ..

# Start both services
npm run dev:all
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```
