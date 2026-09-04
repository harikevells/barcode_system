"""
Flask API for Multi Barcode Scanner System
Receives barcode data from scanners and stores in database
"""

import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import DatabaseManager

# ---- SETUP ----
app = Flask(__name__)
CORS(app)

logger = logging.getLogger(__name__)
database = DatabaseManager()
ACTIVE_SCANNER_COUNT = 0
ACTIVE_SCANNER_UPDATED_AT = None

# ---- ENDPOINTS ----

@app.route("/api/barcode", methods=["POST"])
def receive_barcode():
    """Receive barcode data from scanner"""
    try:
        data = request.get_json()
        
        if not data or "barcode" not in data:
            return jsonify({"error": "Missing barcode"}), 400
        scanner_id = data.get("scanner_id", 0)
        # scanner_id = data.get("scanner_id", data.get("scanner", 0))
        # if isinstance(scanner_id, str):
            # scanner_id = int(scanner_id) if scanner_id.isdigit() else 0
        barcode = data.get("barcode", "")
        
        # Store in database
        database.insert_scan(scanner_id, barcode)
        
        logger.info(f"✅ Received barcode from Scanner {scanner_id}: {barcode}")
        return jsonify({
            "status": "success",
            "message": "Barcode received",
            "scanner_id": scanner_id,
            "barcode": barcode
        }), 200
        
    except Exception as e:
        logger.error(f"Error receiving barcode: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/scans", methods=["GET"])
def get_scans():
    """Get all scans from database"""
    try:
        limit = request.args.get("limit", 100, type=int)
        scans = database.get_last_scans(limit=limit)
        
        return jsonify({
            "status": "success",
            "count": len(scans),
            "scans": [
                {
                    "scanner_id": s[0],
                    "barcode": s[1],
                    "timestamp": s[2]
                }
                for s in scans
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching scans: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/scanners/count", methods=["POST", "GET"])
def scanner_count():
    """Store and return the number of active scanners currently detected."""
    global ACTIVE_SCANNER_COUNT, ACTIVE_SCANNER_UPDATED_AT

    if request.method == "POST":
        try:
            data = request.get_json(silent=True) or {}
            count = data.get("count", ACTIVE_SCANNER_COUNT)
            if isinstance(count, str):
                count = int(count)
            count = max(0, min(int(count), 8))

            ACTIVE_SCANNER_COUNT = count
            ACTIVE_SCANNER_UPDATED_AT = datetime.utcnow().isoformat() + "Z"

            logger.info(f"Updated active scanner count: {ACTIVE_SCANNER_COUNT}")
            return jsonify({
                "status": "success",
                "count": ACTIVE_SCANNER_COUNT,
                "updated_at": ACTIVE_SCANNER_UPDATED_AT
            }), 200
        except Exception as e:
            logger.error(f"Error updating scanner count: {e}")
            return jsonify({"error": str(e)}), 500

    return jsonify({
        "status": "success",
        "count": ACTIVE_SCANNER_COUNT,
        "updated_at": ACTIVE_SCANNER_UPDATED_AT
    }), 200


@app.route("/api/scanners/recompact", methods=["POST"])
def recompact_scanners():
    """Trigger recompacting of scanner IDs for a new audit session"""
    try:
        from main import scanner_manager
        count = scanner_manager.recompact_scanners()
        return jsonify({"status": "success", "count": count}), 200
    except Exception as e:
        logger.error(f"Error recompacting scanners: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Multi Barcode Scanner API",
        "port": 5001
    }), 200


if __name__ == "__main__":
    logger.info("Starting Flask API on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=False)
