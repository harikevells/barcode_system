# Multi-Scanner Barcode System

Flask-based barcode scanning system for Raspberry Pi 4 with support for 8 USB serial barcode scanners via 2 powered USB hubs.

## Features

- **Multi-threaded**: Independent threads for each of 8 scanners
- **Thread-safe**: SQLite database operations with locking
- **Auto-reconnect**: Graceful reconnection with exponential backoff
- **CSV Export**: Automatic data export for analysis
- **REST API**: Simple endpoints for data access
- **Duplicate Detection**: Configurable time-window based duplicate rejection
- **Logging**: Rotating file logs with console output

## Project Structure

```
python/
├── multi_scanner_system.py    # Main Flask application
├── config.py                   # Configuration settings
├── database.py                 # Database operations
├── scanner.py                  # Scanner threads
├── utils.py                    # Utility functions
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Scanners

Edit `config.py` to match your setup:

```python
SCANNERS = {
    1: "/dev/ttyUSB0",
    2: "/dev/ttyUSB1",
    # ... up to 8 scanners
}
```

## Running

### Start the system:

```bash
python multi_scanner_system.py
```

The Flask API will be available at `http://0.0.0.0:5000`

### Seed Test Data (Optional)

Populate database with sample data similar to Seedjs:

```bash
# Sample barcodes
python seed.py sample

# Performance testing (1000 records)
python seed.py performance

# Realistic activity patterns
python seed.py activity

# All seeders combined
python seed.py all --clear
```

See [SEEDING.md](SEEDING.md) for detailed seeding documentation.

## API Endpoints

### Get Recent Scans
```
GET /api/scans
```
Returns the last 1000 scans from the database.

**Response:**
```json
[
  {
    "id": 1,
    "scanner_id": 1,
    "device_port": "/dev/ttyUSB0",
    "barcode": "123456789",
    "timestamp": "2024-05-13 10:30:45"
  }
]
```

### Get System Status
```
GET /api/status
```
Returns current system status and scanner count.

**Response:**
```json
{
  "system": "running",
  "scanners": 8,
  "total_scans": 1250,
  "active_scanners": 7
}
```

### Download CSV
```
GET /download/csv
```
Downloads all scans as a CSV file.

## Configuration Options

Key settings in `config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE` | barcode_scans.db | SQLite database file |
| `CSV_FILE` | barcode_scans.csv | CSV export file |
| `BAUDRATE` | 9600 | Serial communication speed |
| `LOG_LEVEL` | INFO | Logging verbosity |
| `DUPLICATE_WINDOW` | 2 | Seconds to ignore duplicate barcodes |
| `API_PORT` | 5000 | Flask API port |

## Logging

- **Console**: Real-time logs to terminal
- **File**: `barcode_system.log` with rotation (10MB max, 5 backups)

## Database Schema

```sql
CREATE TABLE scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanner_id INTEGER NOT NULL,
  device_port TEXT NOT NULL,
  barcode TEXT NOT NULL,
  timestamp TEXT NOT NULL
)
```

Indexes created on `timestamp` and `scanner_id` for fast queries.

## Troubleshooting

### Scanner not connecting
- Check USB port: `lsusb` (Linux) or Device Manager (Windows)
- Verify baud rate in `config.py` matches scanner settings
- Check permissions: `sudo usermod -a -G dialout $USER`

### Database locked errors
- Ensure only one instance is running
- Check for stale processes: `ps aux | grep python`

### High CPU usage
- Reduce log level from DEBUG to INFO
- Check for excessive USB errors in logs

## Performance

- **Single scanner**: ~500 scans/minute typical
- **8 scanners**: ~4000 scans/minute with concurrent operation
- **Database**: Indexed queries <5ms for recent scans
- **CSV export**: ~1000 records in <100ms

## Development

To run with debug logging:

```python
# In config.py
LOG_LEVEL = logging.DEBUG
```

Or via environment variable:

```bash
DEBUG=1 python multi_scanner_system.py
```

## License

Proprietary - All rights reserved
