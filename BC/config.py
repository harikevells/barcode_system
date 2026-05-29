
"""
Configuration file for Multi Barcode Scanner System
EVDEV version for HIDKBW barcode scanner
"""

from pathlib import Path

# ---------------- BASE PATH ----------------

BASE_DIR = Path(__file__).parent

# ---------------- DATABASE SETTINGS ----------------

DATABASE = BASE_DIR / "barcode_scans.db"
CSV_FILE = BASE_DIR / "barcode_export.xlsx"

# ---------------- LOGGING ----------------

LOG_LEVEL = "INFO"

# ---------------- SYSTEM SETTINGS ----------------

RECONNECT_DELAY = 5

# ---------------- SCANNER SETTINGS ----------------
# AUTO MODE (no manual mapping)

SCANNERS = {
    1: None,
    2: None,
    3: None,
    4: None,
    5: None,
    6: None,
    7: None,
    8: None,
}
