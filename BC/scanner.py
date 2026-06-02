import threading
import logging
import requests
import sys

try:
    import evdev
    EVDEV_AVAILABLE = True
except ImportError:
    EVDEV_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("evdev not available (Linux-specific). Running in mock mode.")

logger = logging.getLogger(__name__)

WEB_API_URL ="http://192.168.0.129:5001/api/barcode"


# ---------------- SCANNER WORKER ----------------

class ScannerWorker(threading.Thread):
    def __init__(self, scanner_id, device, database):
        super().__init__(daemon=True)
        self.scanner_id = scanner_id
        self.device = device
        self.database = database
        self.running = True

    def run(self):
        logger.info(f"[Scanner {self.scanner_id}] Connected -> {self.device.path}")

        barcode = ""

        try:
            for event in self.device.read_loop():
                if not self.running:
                    break

                if event.type == evdev.ecodes.EV_KEY:
                    key = evdev.categorize(event)

                    if key.keystate == key.key_down:
                        k = key.keycode

                        # END OF BARCODE
                        if k == "KEY_ENTER":
                            if barcode:
                                self.process_barcode(barcode)
                                barcode = ""
                        else:
                            if isinstance(k, list):
                                k = k[0]

                            if k.startswith("KEY_"):
                                char = k.replace("KEY_", "")

                                # handle number keys only (safe for barcode)
                                if char.startswith("NUM"):
                                    char = char.replace("NUM_", "")

                                if char.isdigit():
                                    barcode += char

        except Exception as e:
            logger.error(f"[Scanner {self.scanner_id}] Error: {e}")

    def process_barcode(self, barcode):
        # add scanner-specific prefix for scanner 1 and 2
        if self.scanner_id == 1:
            barcode = f"a{barcode}"
        elif self.scanner_id == 2:
            barcode = f"b{barcode}"

        # 1. TERMINAL OUTPUT
        print(f"🟢 Scanner {self.scanner_id} -> {barcode}")

        # 2. DATABASE SAVE (NO FILTERING)
        try:
            self.database.insert_scan(self.scanner_id, barcode)
        except Exception as e:
            logger.error(f"DB error: {e}")

        # 3. WEB TRANSMISSION
        try:
            requests.post(
                WEB_API_URL,
                json={
                    "scanner_id": self.scanner_id,
                    "barcode": barcode
                },
                timeout=2
            )
        except Exception as e:
            logger.error(f"Web API error: {e}")


# ---------------- SCANNER MANAGER ----------------

class ScannerManager:
    def __init__(self, database, scanners):
        self.database = database
        self.scanners = scanners  # kept for compatibility (not strictly needed now)
        self.workers = {}
        self.running = True

    # -------- AUTO DETECT SCANNERS --------

    def detect_scanners(self):
        if not EVDEV_AVAILABLE:
            logger.warning("evdev not available - no scanners will be detected")
            return []
        
        devices = [evdev.InputDevice(path) for path in evdev.list_devices()]

        scanner_devices = []

        for d in devices:
            name = d.name.lower()

            # filter barcode scanners
            if "hid" in name or "scanner" in name or "kbw" in name:
                scanner_devices.append(d)

        return scanner_devices

    # -------- ASSIGN TO 8 SLOTS --------

    def assign_slots(self):
        devices = self.detect_scanners()

        logger.info(f"Detected scanners: {len(devices)}")

        for i, device in enumerate(devices):

            if i >= 8:
                logger.warning("More than 8 scanners detected, ignoring extras")
                break

            scanner_id = i + 1

            worker = ScannerWorker(scanner_id, device, self.database)
            worker.start()

            self.workers[scanner_id] = worker

            logger.info(f"Scanner {scanner_id} mapped -> {device.path}")

    # -------- START ALL --------

    def start_all(self):
        self.assign_slots()

    # -------- STOP ALL --------

    def stop_all(self):
        self.running = False

        for worker in self.workers.values():
            worker.running = False

    # -------- ACTIVE COUNT --------

    def get_active_count(self):
        return len([w for w in self.workers.values() if w.is_alive()])
