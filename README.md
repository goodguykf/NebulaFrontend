# Rail Intelligence (NebulaFrontend)

Expo / React Native Web app for the NebulaX train condition-monitoring models: pick a
subsystem (ACV, Door, Rail corrugation, SHM), upload the data file, read the result and
download the prediction CSV.

## Run

```bash
npm ci
npx expo start --web        # http://localhost:8081
npm run typecheck
```

## Connecting to the backend

The app talks to the FastAPI backend (`backend/` in the team submission) through:

| Call | Purpose |
|---|---|
| `POST /api/v1/analyses` | multipart `subsystem` + `files` (repeat per file) -> `{id, status}` |
| `GET /api/v1/analyses/{id}` | polled every 2 s until `completed` or `failed` |
| `GET /api/v1/analyses` | history |
| `GET /api/v1/analyses/{id}/predictions.csv` | "Download predictions CSV" button |
| `GET /api/v1/health` | Settings > backend status |

Environment (inlined at build time, see `.env.example`):

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_USE_MOCK_API` | `true` (default) shows the bundled published predictions; `false` uses the backend |
| `EXPO_PUBLIC_API_URL` | backend URL, e.g. `http://127.0.0.1:8000`. Leave empty when the backend serves this web build itself: the app then calls its own origin |

Two ways to run the full app:

1. **One process (used for the demo):** export the web build into the backend and start it.
   ```bash
   EXPO_PUBLIC_USE_MOCK_API=false EXPO_PUBLIC_API_URL= npx expo export -p web --output-dir ../backend/frontend_dist
   cd ../backend && uvicorn main:app          # open http://127.0.0.1:8000
   ```
2. **Separate dev servers:** `uvicorn main:app` in `backend/`, then
   `EXPO_PUBLIC_USE_MOCK_API=false EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npx expo start --web`.
   `http://localhost:8081` is already in the backend's default CORS list; for a hosted
   frontend set `CORS_ORIGINS` (or `CORS_ORIGIN_REGEX`) on the backend.

File upload uses the browser's file picker and drag & drop, so it is available in the web
build only.
