"""
Configuration for the barcode scanner system.
"""

import logging
from pathlib import Path

# Database Configuration
DATABASE = "barcode_scans.db"
CSV_FILE = "barcode_scans.csv"

# Serial Communication Configuration
BAUDRATE = 9600
SERIAL_TIMEOUT = 1  # seconds
RECONNECT_DELAY = 5  # seconds
MAX_RECONNECT_ATTEMPTS = 10

# Scanner Configuration
# Maps scanner ID to USB device port
SCANNERS = {
    1: "/dev/ttyUSB0",
    2: "/dev/ttyUSB1",
    3: "/dev/ttyUSB2",
    4: "/dev/ttyUSB3",
    5: "/dev/ttyUSB4",
    6: "/dev/ttyUSB5",
    7: "/dev/ttyUSB6",
    8: "/dev/ttyUSB7",
}

# Logging Configuration
LOG_LEVEL = logging.INFO
LOG_FILE = "barcode_system.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# API Configuration
API_HOST = "0.0.0.0"
API_PORT = 5000
API_DEBUG = False

# CSV Export Configuration
CSV_EXPORT_IMMEDIATE = True  # Export to CSV after each scan

# Duplicate Detection (in seconds)
DUPLICATE_WINDOW = 2  # Ignore same barcode within 2 seconds from same scanner
