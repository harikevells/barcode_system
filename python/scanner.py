"""
Scanner module for reading barcode data from USB serial devices.
"""

import threading
import logging
import time
from datetime import datetime, timedelta

import serial

from config import BAUDRATE, SERIAL_TIMEOUT, RECONNECT_DELAY, MAX_RECONNECT_ATTEMPTS, DUPLICATE_WINDOW

logger = logging.getLogger(__name__)


class ScannerWorker(threading.Thread):
    """Thread worker for individual barcode scanner."""
    
    def __init__(self, scanner_id, device_port, database):
        """
        Initialize scanner worker thread.
        
        Args:
            scanner_id: Unique scanner identifier
            device_port: Serial port path (e.g., /dev/ttyUSB0)
            database: Database instance for storing scans
        """
        super().__init__(daemon=True)
        self.scanner_id = scanner_id
        self.device_port = device_port
        self.database = database
        self.running = True
        self.connected = False
        self.last_barcode = None
        self.last_barcode_time = None
    
    def run(self):
        """Main scanner worker loop with reconnection logic."""
        reconnect_count = 0
        
        while self.running:
            try:
                logger.info(f"[Scanner {self.scanner_id}] Opening port {self.device_port}")
                with serial.Serial(
                    self.device_port,
                    BAUDRATE,
                    timeout=SERIAL_TIMEOUT
                ) as ser:
                    self.connected = True
                    reconnect_count = 0
                    logger.info(f"[Scanner {self.scanner_id}] Connected")
                    
                    while self.running and self.connected:
                        line = ser.readline()
                        if line:
                            barcode = line.decode("utf-8", errors="ignore").strip()
                            if barcode and self._check_duplicate(barcode):
                                self.database.save_scan(
                                    self.scanner_id,
                                    self.device_port,
                                    barcode
                                )
                                self.last_barcode = barcode
                                self.last_barcode_time = datetime.now()
            
            except serial.SerialException as e:
                self.connected = False
                reconnect_count += 1
                if reconnect_count <= MAX_RECONNECT_ATTEMPTS:
                    logger.warning(
                        f"[Scanner {self.scanner_id}] Connection error: {e}. "
                        f"Reconnect attempt {reconnect_count}/{MAX_RECONNECT_ATTEMPTS} "
                        f"in {RECONNECT_DELAY}s"
                    )
                    time.sleep(RECONNECT_DELAY)
                else:
                    logger.error(
                        f"[Scanner {self.scanner_id}] Max reconnection attempts reached. "
                        f"Stopping scanner."
                    )
                    self.running = False
            
            except Exception as e:
                self.connected = False
                logger.error(f"[Scanner {self.scanner_id}] Unexpected error: {e}")
                time.sleep(RECONNECT_DELAY)
        
        logger.info(f"[Scanner {self.scanner_id}] Worker stopped")
    
    def _check_duplicate(self, barcode):
        """
        Check if barcode is a duplicate within the duplicate window.
        
        Args:
            barcode: Barcode to check
        
        Returns:
            True if not a duplicate, False if duplicate
        """
        if self.last_barcode is None or self.last_barcode_time is None:
            return True
        
        if barcode == self.last_barcode:
            elapsed = (datetime.now() - self.last_barcode_time).total_seconds()
            if elapsed < DUPLICATE_WINDOW:
                logger.debug(
                    f"[Scanner {self.scanner_id}] Duplicate barcode rejected: {barcode}"
                )
                return False
        
        return True
    
    def stop(self):
        """Stop the scanner worker thread."""
        self.running = False


class ScannerManager:
    """Manager for all barcode scanner threads."""
    
    def __init__(self, database, scanners_config):
        """
        Initialize scanner manager.
        
        Args:
            database: Database instance
            scanners_config: Dictionary of scanner_id -> device_port mappings
        """
        self.database = database
        self.scanners_config = scanners_config
        self.workers = {}
    
    def start_all(self):
        """Start all scanner workers."""
        for scanner_id, device_port in self.scanners_config.items():
            worker = ScannerWorker(scanner_id, device_port, self.database)
            worker.start()
            self.workers[scanner_id] = worker
            logger.info(f"Started scanner {scanner_id}")
    
    def stop_all(self):
        """Stop all scanner workers."""
        for scanner_id, worker in self.workers.items():
            worker.stop()
            logger.info(f"Stopped scanner {scanner_id}")
    
    def get_active_count(self):
        """Get number of currently connected scanners."""
        return sum(1 for w in self.workers.values() if w.connected)
    
    def get_scanner_status(self):
        """Get status of all scanners."""
        return {
            scanner_id: {
                "connected": worker.connected,
                "last_barcode": worker.last_barcode,
                "last_scan_time": worker.last_barcode_time.isoformat() if worker.last_barcode_time else None
            }
            for scanner_id, worker in self.workers.items()
        }
