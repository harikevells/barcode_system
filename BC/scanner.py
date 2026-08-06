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

WEB_API_URL ="http://192.168.0.141:5001/api/barcode"


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

                                # Handle numpad keys
                                if char.startswith("NUM_"):
                                    char = char.replace("NUM_", "")

                                # Accept ALL printable characters: digits AND letters
                                # Single character = letter or digit key (e.g. KEY_A -> A, KEY_1 -> 1)
                                if len(char) == 1:
                                    barcode += char.lower()

        except Exception as e:
            logger.error(f"[Scanner {self.scanner_id}] Error: {e}")
            print(f"❌ [Scanner {self.scanner_id}] Read error: {e}")

    def process_barcode(self, barcode):
        # 1. TERMINAL OUTPUT
        print(f"🟢 Scanner {self.scanner_id} -> {barcode}")

        # 2. WEB TRANSMISSION FIRST
        save_to_local = True
        try:
            response = requests.post(
                WEB_API_URL,
                json={
                    "scanner": str(self.scanner_id),
                    "barcode": barcode
                },
                timeout=2
            )
            
            # Check if backend explicitly rejected because there is no active audit
            if response.status_code != 200:
                try:
                    res_data = response.json()
                    if res_data.get("error") == "NO_ACTIVE_AUDIT":
                        save_to_local = False
                        print(f"⏩ Scan ignored (no active audit session on server): {barcode}")
                    else:
                        print(f"⚠️ Server rejected scan: {response.status_code} {response.text[:80]}")
                except Exception:
                    print(f"⚠️ Server returned error: {response.status_code}")
            else:
                print(f"📡 Sent to server: {barcode} | Response: {response.status_code} {response.text[:80]}")
                
        except Exception as e:
            logger.error(f"Web API error (offline mode): {e}")
            print(f"❌ Web API error (cannot reach {WEB_API_URL}): {e}. Saving locally.")

        # 3. DATABASE SAVE (ONLY IF NOT EXPLICITLY REJECTED BY SERVER)
        if save_to_local:
            try:
                self.database.insert_scan(self.scanner_id, barcode)
                print(f"💾 Saved to local database: {barcode}")
            except Exception as e:
                logger.error(f"DB error: {e}")
                print(f"❌ DB error: {e}")


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
        seen_phys = set()

        for d in devices:
            name = d.name.lower()
            logger.info(f"Inspecting device: {d.path} | Name: {d.name} | Phys: {d.phys}")

            # Ignore non-scanner system events
            if any(ignore in name for ignore in ["power button", "video bus", "sleep button", "control button"]):
                continue

            caps = d.capabilities()
            if evdev.ecodes.EV_KEY not in caps:
                continue

            keys = caps[evdev.ecodes.EV_KEY]
            # Barcode HID scanners send standard keyboard keycodes (must have KEY_ENTER and KEY_1)
            if evdev.ecodes.KEY_ENTER not in keys or evdev.ecodes.KEY_1 not in keys:
                continue

            # Deduplicate multiple interfaces from the same physical USB device
            phys_base = d.phys.rsplit('/', 1)[0] if d.phys else d.path
            if phys_base in seen_phys:
                continue
            seen_phys.add(phys_base)

            scanner_devices.append(d)

        return scanner_devices

    # -------- ASSIGN TO 8 SLOTS --------

    def assign_slots(self):
        devices = self.detect_scanners()

        logger.info(f"Detected scanners: {len(devices)}")

        # Notify Web API server of detected active scanner count
        try:
            requests.post(
                WEB_API_URL.replace("/api/barcode", "/api/scanners/count"),
                json={"count": len(devices)},
                timeout=2
            )
        except Exception as e:
            logger.error(f"Failed to send active scanner count: {e}")

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
