"""
Database manager for Multi Barcode Scanner System
SQLite based storage for grocery POS scanning
"""

import sqlite3
import logging
from pathlib import Path
from datetime import datetime

from config import DATABASE

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self):
        self.db_path = DATABASE
        self.init_db()

    # ---------------- INIT DATABASE ----------------

    def init_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scanner_id INTEGER,
                    barcode TEXT,
                    timestamp TEXT
                )
            """)

            conn.commit()
            conn.close()

            logger.info("Database initialized")

        except Exception as e:
            logger.error(f"DB init error: {e}")

    # ---------------- INSERT SCAN (FIX FOR YOUR ERROR) ----------------

    def insert_scan(self, scanner_id, barcode):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO scans (scanner_id, barcode, timestamp)
                VALUES (?, ?, ?)
            """, (
                scanner_id,
                barcode,
                datetime.now().isoformat()
            ))

            conn.commit()
            conn.close()

        except Exception as e:
            logger.error(f"Insert scan error: {e}")

    # ---------------- GET TOTAL SCANS ----------------

    def get_scan_count(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM scans")
            count = cursor.fetchone()[0]

            conn.close()
            return count

        except Exception as e:
            logger.error(f"Count error: {e}")
            return 0

    # ---------------- GET LAST SCANS (optional use) ----------------

    def get_last_scans(self, limit=20):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT scanner_id, barcode, timestamp
                FROM scans
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))

            rows = cursor.fetchall()
            conn.close()

            return rows

        except Exception as e:
            logger.error(f"Fetch error: {e}")
            return []
