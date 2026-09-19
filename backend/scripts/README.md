Offline, run-once scripts. Nothing here is imported by the API.

- `export_shm_model.py` fits the final SHM blend on the training data and writes
  `models/shm/shm_final_model.joblib`.
- `make_predictions_zip.py` sends the held-out test files through the running app
  (upload, wait, download CSV) and zips the four CSVs into `predictions.zip`.

Door and Rail have no export script: their trained artifacts were saved by the
notebooks themselves and are loaded as they are (see the main README).
