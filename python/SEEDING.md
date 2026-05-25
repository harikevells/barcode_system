# Database Seeding

This module provides seeders similar to **Seedjs** in NestJS for populating test data into your barcode database.

## Quick Start

### Seed Sample Data
```bash
python seed.py sample
```

### Seed All Data
```bash
python seed.py all
```

### Clear Database & Seed
```bash
python seed.py sample --clear
```

### Performance Testing (5000 records)
```bash
python seed.py performance --records 5000
```

## Available Seeders

### 1. **sample** - Sample Barcodes
Seeds 14 different barcode patterns × 8 scanners = **112 records**

Includes realistic barcode formats:
- Simple numeric: `123456789`
- SKU format: `SKU-2024-0001`
- Lot codes: `LOT-A1B2C3`
- Batch codes: `BATCH-001`

**Usage:**
```bash
python seed.py sample
```

### 2. **performance** - Load Testing Data
Seeds large dataset for performance benchmarking

**Usage:**
```bash
# Default 1000 records
python seed.py performance

# Custom record count
python seed.py performance --records 5000
```

### 3. **activity** - Realistic Activity Patterns
Seeds 48 hours of simulated scanner activity with realistic time distribution:
- Business hours (9am-5pm): 15 scans/scanner/hour
- Off-peak (6am-9am, 5pm-8pm): 5 scans/scanner/hour  
- Night (8pm-6am): 1 scan/scanner/hour

**Usage:**
```bash
python seed.py activity
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--clear` | Clear all existing data before seeding |
| `--records N` | Number of records (for performance seeder) |

## Examples

### Create fresh test environment
```bash
python seed.py all --clear
```

### Load test with 10K records
```bash
python seed.py performance --clear --records 10000
```

### Setup demo with activity patterns
```bash
python seed.py activity --clear
```

### Add samples to existing database
```bash
python seed.py sample
```

## Custom Seeders

Create custom seeders by extending the `Seeder` class:

```python
from seed import Seeder

class MyCustomSeeder(Seeder):
    def seed(self):
        """Your custom seeding logic."""
        # Access database via self.database
        self.database.save_scan(1, "/dev/ttyUSB0", "CUSTOM-001")
        print("✅ Seeded custom data")

# Register in SeedFactory.SEEDERS
```

Then add to `SeedFactory.SEEDERS`:

```python
SeedFactory.SEEDERS["custom"] = MyCustomSeeder
```

## Output Examples

### Sample Seeder
```
🌱 Seeding sample barcodes...
✅ Seeded 112 barcode records
```

### Performance Seeder
```
🌱 Seeding 5000 performance test records...
  Progress: 100/5000
  Progress: 200/5000
  ...
✅ Seeded 5000 performance test records
```

### All Seeders
```
==================================================
🌱 Running all seeders...
==================================================

🌱 Seeding sample barcodes...
✅ Seeded 112 barcode records

🌱 Seeding 1000 performance test records...
  Progress: 100/1000
  ...
✅ Seeded 1000 performance test records

🌱 Seeding scanner activity patterns...
✅ Seeded 11520 activity pattern records

==================================================
✅ Total records seeded: 12632
==================================================
```

## Programmatic Usage

Use seeders in your Python code:

```python
from threading import Lock
from seed import SeedFactory
from database import Database
from config import DATABASE

# Initialize
db_lock = Lock()
database = Database(DATABASE, db_lock)
database.init_database()

# Run seeders
factory = SeedFactory(database)
factory.seed("sample")
factory.seed("performance", num_records=5000)
factory.seed_all()
```

## Notes

- All timestamps are stored in ISO format: `YYYY-MM-DD HH:MM:SS`
- Scanner IDs range from 1-8
- Device ports use Linux format `/dev/ttyUSB0-7` for demo consistency
- Seeders use database locks for thread-safety
- No duplicates within each seeder run
