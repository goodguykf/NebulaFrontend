# NebulaX Train Condition Monitoring - backend

FastAPI service that puts the team's four trained pipelines (ACV, Door, Rail corrugation,
SHM) behind a web app: a user picks a subsystem, drops in a data file, sees the result
and downloads the prediction CSV in the hackathon submission format.

## 1. Architecture

```
Browser
  |-- "/"    Rail Intelligence (the team's Expo web app, served from frontend_dist/)
  |-- "/ui"  lightweight single-page app (static/index.html, no build step)
  v
FastAPI (main.py)
  |-- api/acv.py  door.py  rail.py  shm.py   POST /api/<subsystem>/predict   (synchronous)
  |-- api/analyses.py                        /api/v1/analyses ...            (job API used by both web apps)
  |-- api/uploads.py    validation + request-isolated temp storage
  |-- api/services.py   calls the inference modules, builds submission CSVs
  v
models/<subsystem>/features.py + inference.py   (plain Python, refactored from the notebooks)
models/<subsystem>/*.joblib, metadata.json      (trained artifacts, loaded once per process)
```

- The API never runs a notebook, never retrains and never reads the challenge folders.
- Every upload is streamed into a temporary directory that belongs to that request/job and
  is deleted when inference ends, also when it fails. Only the small result is kept (in
  memory, last 200 analyses) so the History screen and the CSV download work.
- Inference modules raise `core.errors.InvalidInputError` (-> HTTP 400 with a readable
  message), `ModelArtifactMissingError` and `InferenceError` (-> 500). Unexpected
  exceptions are logged server-side and returned as a generic 500, never as a stack trace.

## 2. How the notebooks relate to the backend

The notebooks stay the development/training environment. Only their final inference path
was moved into modules:

| Subsystem | Notebook | Backend modules | Trained artifact |
|---|---|---|---|
| ACV | `ACV_Fault_Localisation_Final_End_to_End.ipynb` (final consensus scorer) | `models/acv/features.py`, `inference.py` | none - the final scorer has no fitted parameters |
| Door | `DOOR_Anomaly_Detection.ipynb` (cells 1 and 7) | `models/door/features.py`, `inference.py` | `models/door/door_resistance_model.joblib` (saved by the notebook: two random forests, their column lists, threshold) |
| Rail | `Rail_Training_v2_Model_Zoo.ipynb` (`predict_recordings`) | `models/rail/features.py`, `inference.py` | `models/rail/lgbm_tuned_a.joblib`, `lgbm_tuned_b.joblib`, `xgb_tuned.joblib`, `metadata.json` (saved by the notebook run `v2_20260918_233818`) |
| SHM | `SHM_Fatigue_Damage_End_to_End.ipynb` (sections 26-27) | `models/shm/features.py`, `model.py`, `inference.py` | `models/shm/shm_final_model.joblib` (written by `scripts/export_shm_model.py`) |

Plots, cross-validation, model zoos, comparison tables, hard-coded paths and file-count
assertions were left in the notebooks.

## 3. Install

Python 3.11+ (developed on 3.13).

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # optional
pip install -r requirements.txt
```

The pinned versions are the ones the artifacts were trained and saved with. scikit-learn,
LightGBM and XGBoost pickles are not guaranteed to load under other versions.

## 4. Run

```bash
uvicorn main:app --reload            # development
uvicorn main:app --host 0.0.0.0 --port 8000
```

| URL | What |
|---|---|
| http://127.0.0.1:8000/ | Rail Intelligence web app (if `frontend_dist/` exists, otherwise a JSON index) |
| http://127.0.0.1:8000/ui | lightweight web app, always available |
| http://127.0.0.1:8000/docs | Swagger / OpenAPI |
| http://127.0.0.1:8000/health | `{"status": "ok"}` |

Settings (environment variables, all optional):

| Variable | Default | Meaning |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173,http://localhost:8081,http://localhost:19006` | comma-separated origins allowed to call the API from another host |
| `CORS_ORIGIN_REGEX` | unset | e.g. `https://.*\.vercel\.app` for preview deployments |
| `MAX_UPLOAD_MB` | `200` | largest single file |
| `FRONTEND_DIST` | `backend/frontend_dist` | exported Expo web build to serve at `/` |
| `WARM_MODELS` | `1` | load all models in a background thread at start-up |
| `NEBULA_DATA_DIR`, `NEBULA_REFERENCE_DIR` | the challenge folders next to this repo | only used by the export script and the regression tests |

## 5. Endpoints

| Endpoint | Form field | Files | Returns |
|---|---|---|---|
| `POST /api/acv/predict` | `file` | one `.xlsx` | cars ranked most to least likely faulty |
| `POST /api/door/predict` | `file` | one `.csv` (continuous stream) | one entry per detected door cycle |
| `POST /api/rail/predict` | `files` (repeat) | one or many `.csv` | one class + probabilities per file |
| `POST /api/shm/predict` | `files` (repeat) | one or many `.csv` | one damage value per file |

Add `?format=csv` to any of them to get the hackathon submission file instead of JSON
(`acv_predictions.csv`, `door_predictions.csv`, `rail_predictions.csv`,
`shm_predictions.csv`). The Door CSV has exactly the official three columns
(`start_time,end_time,prediction`); confidence is returned in the JSON and shown in the
app, but never written to the CSV.

Job API used by the web apps (same models, same CSVs):

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/analyses` | fields `subsystem` (`acv`/`door`/`rail`/`shm`) + `files` -> `{"id", "status": "queued"}` |
| `GET /api/v1/analyses/{id}` | poll until `status` is `completed` or `failed` |
| `GET /api/v1/analyses?subsystem=&limit=` | history, newest first |
| `GET /api/v1/analyses/{id}/predictions.csv` | submission CSV download |
| `GET /api/v1/health` | `{"status": "ok"}` |

### curl examples

```bash
curl -F "file=@acv_test_case.xlsx" http://127.0.0.1:8000/api/acv/predict
curl -F "file=@Test.csv"           http://127.0.0.1:8000/api/door/predict
curl -F "files=@Test1.csv" -F "files=@Test2.csv" http://127.0.0.1:8000/api/rail/predict
curl -F "files=@test01.csv" -F "files=@test02.csv" http://127.0.0.1:8000/api/shm/predict

# submission file straight to disk
curl -F "files=@test01.csv" -F "files=@test02.csv" "http://127.0.0.1:8000/api/shm/predict?format=csv" -o shm_predictions.csv
```

### Responses

```jsonc
// ACV
{"subsystem": "acv", "results": [{"file_id": "acv_test_case.xlsx",
  "ranked_cars": ["01", "04", "03", "07", "08", "06", "02", "05"],
  "ranking_details": [{"car": "01", "score": 6.55}, {"car": "04", "score": 0.73}, ...]}]}

// Door
{"subsystem": "door", "file_id": "Test.csv", "segments": [
  {"start_time": "2023-7-5-0-0-0-0", "end_time": "2023-7-5-0-0-3-760", "prediction": "Normal", "confidence": 0.923},
  {"start_time": "2023-7-5-0-5-46-252", "end_time": "2023-7-5-0-5-49-992", "prediction": "Abnormal resistance", "confidence": 0.986}]}

// Rail
{"subsystem": "rail", "results": [{"file_id": "Test1.csv", "prediction": "Normal",
  "probabilities": {"Normal": 0.92, "Side I": 0.05, "Side II": 0.03}}]}

// SHM
{"subsystem": "shm", "results": [{"file_id": "test01.csv", "prediction": 0.03277748590712302}]}

// any error
{"detail": "Invalid Rail CSV 'x.csv': expected 129 columns but received 12.", "error": "..."}
```

Status codes: `400` bad upload (wrong extension, empty, corrupt, wrong columns), `422`
missing form field, `404` unknown analysis id, `500` missing model artifact or an
unexpected server error. `error` repeats `detail` as a plain string for the Expo client.

## 6. Model artifacts

| Artifact | State | How to (re)create |
|---|---|---|
| `models/door/door_resistance_model.joblib` | present | saved by `DOOR_Anomaly_Detection.ipynb`; copy it here |
| `models/rail/*.joblib`, `metadata.json` | present | saved by `Rail_Training_v2_Model_Zoo.ipynb` into `rail_runs/<run>/models/`; copy the four files here |
| `models/shm/shm_final_model.joblib` | present, generated | `python scripts/export_shm_model.py` (about 1 minute; needs `02_Datasets/SHM`; `--data-dir` to point elsewhere) |
| ACV | not needed | - |

If an artifact is missing the endpoint answers 500 with the command to run; the rest of
the API keeps working.

## 7. Bundling the frontend

`frontend_dist/` is the exported web build of the Expo app at the root of this repository.
To rebuild it after frontend changes:

```bash
# from the repository root (the Expo project)
npm ci
set EXPO_PUBLIC_USE_MOCK_API=false
set EXPO_PUBLIC_API_URL=
npx expo export -p web --clear --output-dir backend/frontend_dist
```

`--clear` matters: Metro caches the inlined `EXPO_PUBLIC_*` values, so without it a build can
silently keep the previous mock/live setting.

With `EXPO_PUBLIC_API_URL` empty the app calls the API on its own origin, so
`uvicorn main:app` alone serves the complete application. To run the frontend separately
instead (Expo dev server or Vercel), set `EXPO_PUBLIC_API_URL` to the backend URL and add
the frontend origin to `CORS_ORIGINS`.

## 8. Tests

```bash
pytest                                   # everything that can run on this machine
pytest -m "not regression"               # API tests only, inference mocked, no data needed
pytest -m regression                     # backend vs notebook predictions (needs the challenge data)
pytest -m "regression and slow"          # includes all 68 Rail recordings
```

- `tests/test_acv.py`, `test_door.py`, `test_rail.py`, `test_shm.py`, `test_service.py`,
  `test_analyses.py`, `test_frontend_hosting.py`: endpoints, schemas, single/multi upload,
  wrong extension, missing/empty file, path-traversal names, temp-file cleanup, error
  shapes. Inference is replaced with fakes, so they run without data or artifacts.
- `tests/test_*_regression.py`: run the real modules on the challenge test files and
  compare with the notebook outputs in `FINAL_SUBMISSION/predictions/`. They skip when the
  data is not on the machine.

## 9. Backend vs notebook predictions

Checked on 2026-09-19 with `pytest` (94 passed) and by sending every held-out test file
through the running app (`python scripts/make_predictions_zip.py`).

| Subsystem | Compared with | Result |
|---|---|---|
| ACV | `acv_predictions.csv`, scores printed by notebook cell 103, six training cases | ranking `01\|04\|03\|07\|08\|06\|02\|05` identical; scores bit-identical; true car ranked 1st in cases 01, 02, 03, 05, 06 and 2nd in case 04, as the notebook reports |
| Door | `door_predictions.csv` (38 segments), `Train_Segments_Answer.csv` (110 segments) | every boundary and label identical, confidence difference 0.0; the 423 + 43 feature columns are bit-identical to the notebook functions |
| Rail | `rail_predictions.csv`, `rail_prediction_probabilities.csv`, `features_v2.npz` | 68/68 labels identical; features bit-identical; probabilities equal to the file's 4-decimal rounding |
| SHM | `shm_predictions.csv` (16 files) | max relative difference 2.4e-15 (8 of 16 values identical to the last digit) |

Known, deliberate differences from the literal notebook code:

- **SHM, last-digit difference.** The notebook fitted and predicted on proxies that had been
  written to a CSV cache and read back, which moves some values by one unit in the last
  place. The export script repeats that round trip for the training proxies, so the fitted
  model equals the notebook's; inference uses the freshly computed proxies. Effect on the
  score: none (1e-15 relative).
- **ACV, non-standard workbooks.** The notebook's final scorer reads only the standard column
  names and was validated on the five standard cases. Training case 04 uses other headers
  (`Passenger Cabin Temperature Detected Value`, `Target Temperature Value`, ...); the backend
  accepts those aliases (taken from the notebook's own section 21.1 mapping) instead of
  returning an arbitrary ranking. Cars that have headers but no data are ranked last with
  `score: null`. Results on standard files are unchanged.
- **ACV, workbook reader.** The case files store every string as an inline cell, which makes
  openpyxl take 15 s to several minutes. `load_case` streams only the needed columns from
  the workbook XML and falls back to `pandas.read_excel(engine="openpyxl")` on any problem;
  both loaders give identical values on all seven data files.
- **Rail, recordings longer than 1 s** use their first 10,000 samples (the models were trained
  on 1 s recordings); shorter ones are rejected with a 400.
- **Door CSV download** has the official three columns. The notebook's file had a fourth
  `confidence` column, which the submission schema does not define, so it is left out.
- **Door/Rail export scripts** were not written because both notebooks already persist their
  final models; the saved files are loaded unchanged.

Typical timings on a laptop: ACV 5 s per workbook, Door 2 s per stream, Rail 0.3 s per
recording in a batch (68 recordings: 13 s upload + 20 s analysis), SHM 0.6 s per recording.
