import threading
import logging
import requests
import sys
import re
import time

try:
    import evdev
    EVDEV_AVAILABLE = True
except ImportError:
    EVDEV_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("evdev not available (Linux-specific). Running in mock mode.")

logger = logging.getLogger(__name__)

WEB_API_URL = "http://16.16.123.89:5001/api/barcode"

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
                    "scanner_id": self.scanner_id,
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
        self.scanners = scanners  # kept for compatibility
        self.workers = {}
        self.running = True
        self.last_detected_paths = set()

    # -------- AUTO DETECT SCANNERS --------

    def detect_scanners(self):
        if not EVDEV_AVAILABLE:
            logger.warning("evdev not available - no scanners will be detected")
            return []
        
        scanner_devices = []
        try:
            raw_paths = evdev.list_devices()
            def get_event_num(p):
                m = re.search(r'event(\d+)', str(p))
                return int(m.group(1)) if m else 0

            sorted_paths = sorted(raw_paths, key=get_event_num)

            devices = []
            for path in sorted_paths:
                try:
                    devices.append(evdev.InputDevice(path))
                except Exception as dev_err:
                    logger.warning(f"Could not open device {path}: {dev_err}")

            seen_phys = set()

            for d in devices:
                try:
                    name = d.name.lower()
                    logger.info(f"Inspecting device: {d.path} | Name: {d.name} | Phys: {d.phys}")

                    # Ignore non-scanner system events
                    if any(ignore in name for ignore in ["power button", "video bus", "sleep button", "control button"]):
                        continue

                    caps = d.capabilities()
                    if evdev.ecodes.EV_KEY not in caps:
                        continue

                    keys = caps[evdev.ecodes.EV_KEY]
                    if evdev.ecodes.KEY_ENTER not in keys:
                        continue

                    scanner_like_keys = (
                        evdev.ecodes.KEY_0,
                        evdev.ecodes.KEY_1,
                        evdev.ecodes.KEY_2,
                        evdev.ecodes.KEY_3,
                        evdev.ecodes.KEY_4,
                        evdev.ecodes.KEY_5,
                        evdev.ecodes.KEY_6,
                        evdev.ecodes.KEY_7,
                        evdev.ecodes.KEY_8,
                        evdev.ecodes.KEY_9,
                        evdev.ecodes.KEY_A,
                        evdev.ecodes.KEY_B,
                        evdev.ecodes.KEY_C,
                        evdev.ecodes.KEY_KP0,
                        evdev.ecodes.KEY_KP1,
                        evdev.ecodes.KEY_KP2,
                    )
                    if not any(k in keys for k in scanner_like_keys):
                        logger.info(f"Skipping non-scanner keyboard input device: {d.path} | Name: {d.name}")
                        continue

                    # Deduplicate multiple interfaces from the same physical USB device
                    phys_base = d.phys.rsplit('/', 1)[0] if d.phys else d.path
                    if phys_base in seen_phys:
                        continue
                    seen_phys.add(phys_base)

                    scanner_devices.append(d)
                except Exception as item_err:
                    logger.error(f"Error inspecting device {d.path}: {item_err}")

        except Exception as e:
            logger.error(f"Error in detect_scanners: {e}")

        return scanner_devices

    # -------- REFRESH & ASSIGN SLOTS --------

    def assign_slots(self):
        return self.refresh_scanners()

    def refresh_scanners(self):
        devices = self.detect_scanners()
        current_paths = set(d.path for d in devices[:8])

        # If connected device paths have not changed, return early
        if current_paths == self.last_detected_paths:
            return len(current_paths)

        self.last_detected_paths = current_paths
        detected_count = len(current_paths)
        logger.info(f"⚡ Active scanner count changed -> {detected_count} scanner(s) connected")

        # Notify Web API server immediately of new scanner count
        try:
            requests.post(
                WEB_API_URL.replace("/api/barcode", "/api/scanners/count"),
                json={"count": detected_count},
                timeout=2
            )
        except Exception as e:
            logger.error(f"Failed to send active scanner count: {e}")

        active_paths = set()
        for i, device in enumerate(devices[:8]):
            active_paths.add(device.path)
            scanner_id = i + 1

            if scanner_id in self.workers:
                current_worker = self.workers[scanner_id]
                if current_worker.device.path == device.path and current_worker.is_alive():
                    continue
                current_worker.running = False
                del self.workers[scanner_id]

            worker = ScannerWorker(scanner_id, device, self.database)
            worker.start()
            self.workers[scanner_id] = worker
            logger.info(f"Scanner {scanner_id} mapped -> {device.path}")

        # Stop workers for removed scanners
        for scanner_id, worker in list(self.workers.items()):
            if worker.device.path not in active_paths:
                worker.running = False
                del self.workers[scanner_id]
                logger.info(f"Scanner {scanner_id} removed -> {worker.device.path}")

        return detected_count

    def _monitor_loop(self):
        """Background loop: checks every 2 seconds for plugged/unplugged scanners"""
        while self.running:
            try:
                self.refresh_scanners()
            except Exception as e:
                logger.error(f"Error in scanner monitor loop: {e}")
            time.sleep(2)

    # -------- START ALL --------

    def start_all(self):
        self.refresh_scanners()
        monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        monitor_thread.start()

    # -------- STOP ALL --------

    def stop_all(self):
        self.running = False
        for worker in self.workers.values():
            worker.running = False

    # -------- ACTIVE COUNT --------

    def get_active_count(self):
        return len([w for w in self.workers.values() if w.is_alive()])
