import threading
import logging
import requests
import sys
import re

try:
    import evdev
    EVDEV_AVAILABLE = True
except ImportError:
    EVDEV_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("evdev not available (Linux-specific). Running in mock mode.")

logger = logging.getLogger(__name__)
WEB_API_URL = "http://16.16.123.89:5001/api/barcode"
# AWS deployment target
# WEB_API_URL = "http://16.16.123.89:5001/api/barcode"


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
        print(f"🟢 Scanner {self.scanner_id} -> {barcode}")
        try:
            self.database.record_scan_and_enqueue(self.scanner_id, barcode)
            print(f"💾 Saved locally and queued for web delivery: {barcode}")
        except Exception as e:
            logger.error(f"DB queue error: {e}")
            print(f"❌ Scan was not saved or queued: {e}")


class DeliveryWorker(threading.Thread):
    def __init__(self, database):
        super().__init__(daemon=True)
        self.database = database
        self.stop_event = threading.Event()

    def run(self):
        logger.info("Web delivery queue started")

        while not self.stop_event.is_set():
            pending_scans = self.database.get_pending_scans()
            if not pending_scans:
                self.stop_event.wait(1)
                continue

            for pending_id, scan_id, scanner_id, barcode, attempts in pending_scans:
                try:
                    response = requests.post(
                        WEB_API_URL,
                        json={
                            "scan_id": scan_id,
                            "scanner_id": scanner_id,
                            "scanner": str(scanner_id),
                            "barcode": barcode,
                        },
                        timeout=2,
                    )

                    if response.status_code == 200:
                        self.database.mark_pending_delivered(pending_id)
                        logger.info(
                            f"Delivered queued scan {pending_id}: scanner={scanner_id}"
                        )
                        continue

                    try:
                        response_data = response.json()
                    except ValueError:
                        response_data = {}

                    if response_data.get("error") == "NO_ACTIVE_AUDIT":
                        self.database.discard_pending(pending_id, "NO_ACTIVE_AUDIT")
                        if hasattr(self, 'scanner_manager') and self.scanner_manager:
                            self.scanner_manager.needs_recompact = True
                        continue

                    raise RuntimeError(
                        f"HTTP {response.status_code}: {response.text[:120]}"
                    )
                except Exception as e:
                    next_attempts = attempts + 1
                    self.database.mark_pending_retry(pending_id, next_attempts, e)
                    logger.warning(
                        f"Queued scan {pending_id} retry {next_attempts}: {e}"
                    )

        logger.info("Web delivery queue stopped")

    def stop(self):
        self.stop_event.set()


# ---------------- SCANNER MANAGER ----------------

class ScannerManager:
    def __init__(self, database, scanners):
        self.database = database
        self.scanners = scanners  # kept for compatibility (not strictly needed now)
        self.workers = {}
        self.running = True
        self.delivery_worker = DeliveryWorker(database)
        self.delivery_worker.scanner_manager = self
        self.needs_recompact = False
        self._monitor_stop = threading.Event()
        self._last_detected_paths = set()

    @staticmethod
    def device_key(device):
        """Return a stable identity across Linux event path changes and USB interfaces."""
        if device.phys:
            # Strip interface specifiers (e.g. :1.0, :1.1, /input0) to isolate physical USB port
            clean = re.sub(r'[:/].*', '', device.phys)
            if clean:
                return clean
        return device.path

    # -------- AUTO DETECT SCANNERS --------

    def detect_scanners(self):
        if not EVDEV_AVAILABLE:
            logger.warning("evdev not available - no scanners will be detected")
            return []
        
        raw_paths = evdev.list_devices()
        # Sort paths by event number ascending (event0, event1, event2...)
        # This ensures 1st connected scanner = Scanner 1, 2nd = Scanner 2, 3rd = Scanner 3
        sorted_paths = sorted(raw_paths, key=lambda p: int(re.search(r'\d+', str(p)).group()) if re.search(r'\d+', str(p)) else 0)
        devices = [evdev.InputDevice(path) for path in sorted_paths]


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
                logger.info(f"Skipping non-keyboard input device: {d.path} | Name: {d.name}")
                continue

            keys = caps[evdev.ecodes.EV_KEY]
                # Some HID barcode scanners expose ENTER plus digit/alpha keys under different mappings,
                # not always KEY_1. Accept standard keyboard scanner patterns instead of requiring only KEY_1.
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
            if not any(key in keys for key in scanner_like_keys):
                logger.info(f"Skipping keyboard without barcode keys: {d.path} | Name: {d.name}")
                continue

            # Deduplicate multiple interfaces from the same physical USB device
            phys_base = ScannerManager.device_key(d)
            if phys_base in seen_phys:
                logger.info(f"Skipping duplicate interface for physical device {phys_base}: {d.path}")
                continue
            seen_phys.add(phys_base)

            scanner_devices.append(d)
    
        return scanner_devices

    # -------- ASSIGN TO 8 SLOTS --------

    def assign_slots(self):
        return self.refresh_scanners()

    def recompact_scanners(self):
        """Reset and recompact all connected scanner IDs sequentially (1, 2, 3...).
        Called when starting a new audit session."""
        logger.info("Recompacting scanner IDs for new audit session...")
        self.needs_recompact = False
        self._last_detected_paths = set()

        devices = self.detect_scanners()
        detected_count = min(len(devices), 8)

        desired = {}
        for i, device in enumerate(devices[:8]):
            desired[i + 1] = device

        keep = {}
        for sid, device in desired.items():
            if sid in self.workers:
                w = self.workers[sid]
                if self.device_key(w.device) == self.device_key(device) and w.is_alive():
                    keep[sid] = w

        for sid, worker in self.workers.items():
            if sid not in keep:
                worker.running = False
                try:
                    worker.device.close()
                except Exception:
                    pass
                logger.info(f"Scanner {sid} removed for recompact -> {worker.device.path}")

        new_workers = dict(keep)
        for sid, device in desired.items():
            if sid not in new_workers:
                worker = ScannerWorker(sid, device, self.database)
                worker.start()
                new_workers[sid] = worker
                logger.info(f"Scanner {sid} recompacted -> {device.path}")

        self.workers = new_workers
        active_count = len(self.workers)

        logger.info(f"Active scanners after recompact: {active_count}")

        try:
            requests.post(
                WEB_API_URL.replace("/api/barcode", "/api/scanners/count"),
                json={"count": active_count},
                timeout=2
            )
        except Exception as e:
            logger.error(f"Failed to send active scanner count on recompact: {e}")

        return active_count

    def refresh_scanners(self):
        if getattr(self, 'needs_recompact', False):
            return self.recompact_scanners()

        devices = self.detect_scanners()
        current_paths = set(d.path for d in devices[:8])

        # If connected device paths have not changed, skip re-assignment
        if current_paths == self._last_detected_paths:
            return len(self.workers)

        self._last_detected_paths = current_paths

        # Map detected devices by their physical device key
        detected_map = {}
        for d in devices[:8]:
            key = self.device_key(d)
            if key not in detected_map:
                detected_map[key] = d

        new_workers = {}
        claimed_keys = set()

        # Step 1: Retain existing active workers whose physical devices are still connected
        for sid, worker in self.workers.items():
            w_key = self.device_key(worker.device)
            if w_key in detected_map and worker.is_alive():
                new_workers[sid] = worker
                claimed_keys.add(w_key)
            else:
                # Device unplugged or worker dead: stop worker and close device
                worker.running = False
                try:
                    worker.device.close()
                except Exception:
                    pass
                logger.info(f"Scanner {sid} removed -> {worker.device.path}")

        # Step 2: Assign newly plugged-in devices to lowest available scanner IDs (1..8)
        unclaimed_devices = [d for d in devices[:8] if self.device_key(d) not in claimed_keys]

        for device in unclaimed_devices:
            # Find lowest available scanner_id between 1 and 8
            free_id = None
            for candidate in range(1, 9):
                if candidate not in new_workers:
                    free_id = candidate
                    break

            if free_id is None:
                logger.warning(f"Maximum scanner limit (8) reached. Skipping device {device.path}")
                continue

            worker = ScannerWorker(free_id, device, self.database)
            worker.start()
            new_workers[free_id] = worker
            claimed_keys.add(self.device_key(device))
            logger.info(f"Scanner {free_id} mapped -> {device.path}")

        self.workers = new_workers
        active_count = len(self.workers)

        logger.info(f"Active scanners: {active_count}")

        # Notify Web API server of detected active scanner count
        try:
            requests.post(
                WEB_API_URL.replace("/api/barcode", "/api/scanners/count"),
                json={"count": active_count},
                timeout=2
            )
        except Exception as e:
            logger.error(f"Failed to send active scanner count: {e}")

        return active_count

    # -------- MONITOR LOOP --------

    def _monitor_loop(self):
        """Background loop: checks every 2 seconds for plugged/unplugged scanners"""
        while not self._monitor_stop.is_set():
            try:
                self.refresh_scanners()
            except Exception as e:
                logger.error(f"Error in scanner monitor loop: {e}")
            self._monitor_stop.wait(2)

    # -------- START ALL --------

    def start_all(self):
        if not self.delivery_worker.is_alive():
            self.delivery_worker.start()
        self.refresh_scanners()
        monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        monitor_thread.start()

    # -------- STOP ALL --------

    def stop_all(self):
        self.running = False
        self._monitor_stop.set()
        self.delivery_worker.stop()

        for worker in self.workers.values():
            worker.running = False

    # -------- ACTIVE COUNT --------

    def get_active_count(self):
        return len([w for w in self.workers.values() if w.is_alive()])
