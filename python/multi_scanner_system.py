#!/usr/bin/env python3
"""
Multi-scanner barcode system for Raspberry Pi 4.
Supports 8 USB serial barcode scanners connected through 2 powered USB hubs.
"""

import threading
import logging
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import pandas as pd

from config import DATABASE, CSV_FILE, BAUDRATE, SCANNERS, LOG_LEVEL
from database import Database
from scanner import ScannerManager
from utils import setup_logging

# Setup logging
logger = setup_logging("barcode_system", LOG_LEVEL)

db_lock = threading.Lock()
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
database = Database(DATABASE, db_lock)
scanner_manager = None


# -------------------- API ROUTES --------------------
@app.route("/api/scans")
def api_scans():
    """Fetch last 1000 scans from database."""
    try:
        scans = database.get_recent_scans(1000)
        return jsonify(scans)
    except Exception as e:
        logger.error(f"Error fetching scans: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/status")
def api_status():
    """Get system status and scanner information."""
    try:
        total = database.get_scan_count()
        return jsonify({
            "system": "running",
            "scanners": len(SCANNERS),
            "total_scans": total,
            "active_scanners": scanner_manager.get_active_count() if scanner_manager else 0,
        })
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/download/csv")
def download_csv():
    """Download all scans as CSV."""
    try:
        database.export_to_csv(CSV_FILE)
        return send_file(CSV_FILE, as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading CSV: {e}")
        return jsonify({"error": str(e)}), 500


# -------------------- COMPATIBILITY ENDPOINTS (FOR REACT DASHBOARD) --------------------
@app.route("/api/shelves")
def get_shelves():
    """Get all shelf records (uses scans as shelves)."""
    try:
        scans = database.get_recent_scans(1000)
        # Group scans by unique barcodes (treat as shelves)
        shelves = {}
        for scan in scans:
            key = scan.get("barcode", "Unknown")
            if key not in shelves:
                shelves[key] = {
                    "shelfCode": key,
                    "timestamp": scan.get("timestamp"),
                    "products": []
                }
            shelves[key]["products"].append(scan)
        
        return jsonify(list(shelves.values()))
    except Exception as e:
        logger.error(f"Error fetching shelves: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/scan", methods=["POST"])
def add_scan():
    """Add a manual scan."""
    try:
        data = request.get_json()
        scanner_id = data.get("scanner_id", 1)
        barcode = data.get("barcode", "")
        
        if not barcode:
            return jsonify({"error": "Barcode required"}), 400
        
        database.save_scan(scanner_id, f"/dev/ttyUSB{scanner_id-1}", barcode)
        return jsonify({"success": True, "barcode": barcode})
    except Exception as e:
        logger.error(f"Error adding scan: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/clear", methods=["DELETE"])
def clear_database():
    """Clear all scans from database."""
    try:
        import sqlite3
        with database.lock:
            with sqlite3.connect(database.db_file) as conn:
                conn.execute("DELETE FROM scans")
                conn.commit()
        logger.info("Database cleared")
        return jsonify({"success": True, "message": "Database cleared"})
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/shelf/start", methods=["POST"])
def start_shelf():
    """Start tracking a new shelf."""
    return jsonify({"success": True, "message": "Shelf started"})


@app.route("/api/shelf/resume", methods=["POST"])
def resume_shelf():
    """Resume a previous shelf."""
    return jsonify({"success": True, "message": "Shelf resumed"})


@app.route("/api/manual", methods=["POST"])
def manual_entry():
    """Manual barcode entry."""
    try:
        data = request.get_json()
        barcode = data.get("barcode", "")
        column = data.get("column", "A")
        
        if not barcode:
            return jsonify({"error": "Barcode required"}), 400
        
        scanner_id = 1 if column == "A" else 2
        database.save_scan(scanner_id, f"/dev/ttyUSB{scanner_id-1}", barcode)
        return jsonify({"success": True, "barcode": barcode})
    except Exception as e:
        logger.error(f"Error manual entry: {e}")
        return jsonify({"error": str(e)}), 500


# -------------------- MAIN --------------------
def main():
    global scanner_manager
    
    logger.info("Initializing Barcode Scanner System")
    database.init_database()
    
    scanner_manager = ScannerManager(database, SCANNERS)
    scanner_manager.start_all()
    
    logger.info("Barcode Scanner System Started")
    logger.info(f"Flask API running on 0.0.0.0:5000")
    
    try:
        app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        scanner_manager.stop_all()


if __name__ == "__main__":
    main()
