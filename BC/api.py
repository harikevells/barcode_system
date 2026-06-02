"""
Flask API for Multi Barcode Scanner System
Receives barcode data from scanners and stores in database
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import DatabaseManager

# ---- SETUP ----
app = Flask(__name__)
CORS(app)

logger = logging.getLogger(__name__)
database = DatabaseManager()

# ---- ENDPOINTS ----

@app.route("/api/barcode", methods=["POST"])
def receive_barcode():
    """Receive barcode data from scanner"""
    try:
        data = request.get_json()
        
        if not data or "barcode" not in data:
            return jsonify({"error": "Missing barcode"}), 400
        
        scanner_id = data.get("scanner_id", 0)
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


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Multi Barcode Scanner API",
        "port": 8000
    }), 200


if __name__ == "__main__":
    logger.info("Starting Flask API on port 8000...")
    app.run(host="127.0.0.1", port=8000, debug=False)
