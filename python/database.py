"""
Database module for barcode scanner system.
Handles SQLite operations with thread safety.
"""

import sqlite3
import logging
from datetime import datetime
from threading import Lock

import pandas as pd

logger = logging.getLogger(__name__)


class Database:
    """Thread-safe database manager for barcode scans."""
    
    def __init__(self, db_file, lock=None):
        """
        Initialize database manager.
        
        Args:
            db_file: Path to SQLite database file
            lock: Threading lock for thread-safe operations
        """
        self.db_file = db_file
        self.lock = lock or Lock()
    
    def init_database(self):
        """Create database table if it doesn't exist."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS scans (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            scanner_id INTEGER NOT NULL,
                            device_port TEXT NOT NULL,
                            barcode TEXT NOT NULL,
                            timestamp TEXT NOT NULL
                        )
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_timestamp 
                        ON scans(timestamp)
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_scanner_id 
                        ON scans(scanner_id)
                    """)
                    conn.commit()
                logger.info("Database initialized successfully")
            except Exception as e:
                logger.error(f"Database initialization error: {e}")
                raise
    
    def save_scan(self, scanner_id, device_port, barcode):
        """
        Save a barcode scan to the database.
        
        Args:
            scanner_id: ID of the scanner
            device_port: Serial port of the scanner
            barcode: Scanned barcode value
        
        Returns:
            Row ID of the inserted record
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    cursor = conn.execute(
                        """
                        INSERT INTO scans (scanner_id, device_port, barcode, timestamp)
                        VALUES (?, ?, ?, ?)
                        """,
                        (scanner_id, device_port, barcode, timestamp),
                    )
                    conn.commit()
                    row_id = cursor.lastrowid
                
                logger.info(f"[Scanner {scanner_id}] {barcode} @ {timestamp}")
                return row_id
            except Exception as e:
                logger.error(f"Error saving scan: {e}")
                raise
    
    def get_recent_scans(self, limit=1000):
        """
        Fetch recent scans from database.
        
        Args:
            limit: Maximum number of records to fetch
        
        Returns:
            List of scan records as dictionaries
        """
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    conn.row_factory = sqlite3.Row
                    rows = conn.execute(
                        "SELECT * FROM scans ORDER BY id DESC LIMIT ?",
                        (limit,)
                    ).fetchall()
                
                return [dict(row) for row in rows]
            except Exception as e:
                logger.error(f"Error fetching scans: {e}")
                return []
    
    def get_scan_count(self):
        """Get total number of scans in database."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    count = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
                return count
            except Exception as e:
                logger.error(f"Error getting scan count: {e}")
                return 0
    
    def get_scans_by_scanner(self, scanner_id, limit=100):
        """Get recent scans from a specific scanner."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    conn.row_factory = sqlite3.Row
                    rows = conn.execute(
                        "SELECT * FROM scans WHERE scanner_id = ? ORDER BY id DESC LIMIT ?",
                        (scanner_id, limit)
                    ).fetchall()
                
                return [dict(row) for row in rows]
            except Exception as e:
                logger.error(f"Error fetching scans for scanner {scanner_id}: {e}")
                return []
    
    def export_to_csv(self, csv_file):
        """
        Export all scans to CSV file.
        
        Args:
            csv_file: Path to output CSV file
        """
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    df = pd.read_sql_query(
                        "SELECT * FROM scans ORDER BY id DESC", conn
                    )
                df.to_csv(csv_file, index=False)
                logger.info(f"Exported {len(df)} records to {csv_file}")
            except Exception as e:
                logger.error(f"Error exporting to CSV: {e}")
                raise
    
    def clear_old_scans(self, days=30):
        """
        Delete scans older than specified days.
        
        Args:
            days: Number of days to retain
        """
        with self.lock:
            try:
                with sqlite3.connect(self.db_file) as conn:
                    cursor = conn.execute(
                        """
                        DELETE FROM scans 
                        WHERE datetime(timestamp) < datetime('now', ? || ' days')
                        """,
                        (f"-{days}",)
                    )
                    conn.commit()
                    logger.info(f"Deleted {cursor.rowcount} scans older than {days} days")
            except Exception as e:
                logger.error(f"Error clearing old scans: {e}")
