"""
Main entry point for Multi Barcode Scanner System
Supports multiple HID keyboard barcode scanners
"""

import signal
import logging
import time
import os

from scanner import ScannerManager
from database import DatabaseManager
from config import LOG_LEVEL, SCANNERS

# ---------------- CREATE REQUIRED FOLDERS ----------------

os.makedirs("/home/pi/BC/logs", exist_ok=True)
os.makedirs("/home/pi/BC/exports", exist_ok=True)

# ---------------- LOGGING SETUP ----------------

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("/home/pi/BC/logs/scanner.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# ---------------- DATABASE ----------------

database = DatabaseManager()

# ---------------- SCANNER MANAGER ----------------
# IMPORTANT:
# ScannerManager now handles:
# - barcode capture
# - terminal print
# - web transmission
# - NO duplication filtering

scanner_manager = ScannerManager(
    database=database,
    scanners=SCANNERS
)

# ---------------- GLOBAL RUNNING FLAG ----------------

running = True


# ---------------- SIGNAL HANDLER ----------------

def signal_handler(sig, frame):
    global running
    logger.info("Shutdown signal received")
    running = False
    scanner_manager.stop_all()


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ---------------- MAIN APPLICATION ----------------

def main():
    global running

    logger.info("====================================")
    logger.info("Starting Multi Barcode Scanner System")
    logger.info(f"Configured scanners: {len(SCANNERS)}")
    logger.info("====================================")

    scanner_manager.start_all()

    try:
        while running:

            active_count = scanner_manager.get_active_count()
            total_scans = database.get_scan_count()

            logger.info(
                f"Active scanners: {active_count} | Total scans: {total_scans}"
            )

            time.sleep(10)

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")

    except Exception as e:
        logger.exception(f"Main loop error: {e}")

    finally:
        logger.info("Stopping scanner workers...")
        scanner_manager.stop_all()
        logger.info("Scanner system stopped")


# ---------------- ENTRY POINT ----------------

if __name__ == "__main__":
    main()
