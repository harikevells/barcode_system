#!/usr/bin/env python3
"""
Database seeding for barcode scanner system.
Provides utilities to populate test data similar to Seedjs in NestJS.
"""

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

from config import DATABASE
from database import Database

logger = logging.getLogger(__name__)


class Seeder:
    """Base seeder class for all seeders."""
    
    def __init__(self, database):
        """Initialize seeder with database instance."""
        self.database = database
    
    def seed(self):
        """Override this method in child classes."""
        raise NotImplementedError("Seed method must be implemented")


class BarcodeSampleSeeder(Seeder):
    """Seed barcode scans with sample data."""
    
    SAMPLE_BARCODES = [
        "123456789",
        "987654321",
        "555666777",
        "111222333",
        "444555666",
        "ABC123DEF456",
        "2024-05-001",
        "2024-05-002",
        "SKU-2024-0001",
        "SKU-2024-0002",
        "BATCH-001",
        "BATCH-002",
        "LOT-A1B2C3",
        "LOT-D4E5F6",
    ]
    
    def seed(self):
        """Seed sample barcode data."""
        print("🌱 Seeding sample barcodes...")
        
        count = 0
        base_time = datetime.now() - timedelta(hours=24)
        
        for scanner_id in range(1, 9):
            for i, barcode in enumerate(self.SAMPLE_BARCODES):
                timestamp = (base_time + timedelta(
                    seconds=i * 30 + scanner_id * 10
                )).strftime("%Y-%m-%d %H:%M:%S")
                
                try:
                    self.database.db_file = DATABASE
                    with self.database.lock:
                        import sqlite3
                        with sqlite3.connect(self.database.db_file) as conn:
                            conn.execute(
                                """
                                INSERT INTO scans 
                                (scanner_id, device_port, barcode, timestamp)
                                VALUES (?, ?, ?, ?)
                                """,
                                (
                                    scanner_id,
                                    f"/dev/ttyUSB{scanner_id - 1}",
                                    barcode,
                                    timestamp
                                ),
                            )
                            conn.commit()
                    count += 1
                except Exception as e:
                    logger.error(f"Error seeding barcode: {e}")
        
        print(f"✅ Seeded {count} barcode records")
        return count


class PerformanceTestSeeder(Seeder):
    """Seed large dataset for performance testing."""
    
    def seed(self, num_records=1000):
        """Seed performance test data."""
        print(f"🌱 Seeding {num_records} performance test records...")
        
        count = 0
        base_time = datetime.now() - timedelta(days=7)
        
        for i in range(num_records):
            scanner_id = (i % 8) + 1
            barcode = f"PERF-TEST-{i:06d}"
            timestamp = (base_time + timedelta(
                seconds=i * 2
            )).strftime("%Y-%m-%d %H:%M:%S")
            
            try:
                self.database.db_file = DATABASE
                with self.database.lock:
                    import sqlite3
                    with sqlite3.connect(self.database.db_file) as conn:
                        conn.execute(
                            """
                            INSERT INTO scans 
                            (scanner_id, device_port, barcode, timestamp)
                            VALUES (?, ?, ?, ?)
                            """,
                            (
                                scanner_id,
                                f"/dev/ttyUSB{scanner_id - 1}",
                                barcode,
                                timestamp
                            ),
                        )
                        conn.commit()
                count += 1
                
                if (i + 1) % 100 == 0:
                    print(f"  Progress: {count}/{num_records}")
            
            except Exception as e:
                logger.error(f"Error seeding performance data: {e}")
        
        print(f"✅ Seeded {count} performance test records")
        return count


class ScannerActivitySeeder(Seeder):
    """Seed realistic scanner activity patterns."""
    
    def seed(self):
        """Seed activity patterns simulating real usage."""
        print("🌱 Seeding scanner activity patterns...")
        
        count = 0
        base_time = datetime.now() - timedelta(hours=48)
        
        # Simulate activity over 48 hours
        for hour in range(48):
            current_time = base_time + timedelta(hours=hour)
            
            # Activity density varies by hour (more scans during business hours)
            hour_of_day = current_time.hour
            if 9 <= hour_of_day <= 17:  # Business hours
                scans_per_scanner = 15
            elif 6 <= hour_of_day < 9 or 17 < hour_of_day <= 20:  # Off-peak
                scans_per_scanner = 5
            else:  # Night hours
                scans_per_scanner = 1
            
            for scanner_id in range(1, 9):
                for scan_num in range(scans_per_scanner):
                    # Add randomness to scan times
                    offset = (scan_num * 240) + (scanner_id * 30)
                    scan_time = (
                        current_time + timedelta(seconds=offset)
                    ).strftime("%Y-%m-%d %H:%M:%S")
                    
                    barcode = f"ACT-S{scanner_id}-H{hour}-{scan_num:02d}"
                    
                    try:
                        self.database.db_file = DATABASE
                        with self.database.lock:
                            import sqlite3
                            with sqlite3.connect(self.database.db_file) as conn:
                                conn.execute(
                                    """
                                    INSERT INTO scans 
                                    (scanner_id, device_port, barcode, timestamp)
                                    VALUES (?, ?, ?, ?)
                                    """,
                                    (
                                        scanner_id,
                                        f"/dev/ttyUSB{scanner_id - 1}",
                                        barcode,
                                        scan_time
                                    ),
                                )
                                conn.commit()
                        count += 1
                    except Exception as e:
                        logger.error(f"Error seeding activity: {e}")
        
        print(f"✅ Seeded {count} activity pattern records")
        return count


class SeedFactory:
    """Factory for managing all seeders."""
    
    SEEDERS = {
        "sample": BarcodeSampleSeeder,
        "performance": PerformanceTestSeeder,
        "activity": ScannerActivitySeeder,
    }
    
    def __init__(self, database):
        """Initialize seed factory."""
        self.database = database
    
    def seed(self, seeder_name="sample", **kwargs):
        """
        Run a specific seeder.
        
        Args:
            seeder_name: Name of seeder to run
            **kwargs: Additional arguments for seeder
        """
        if seeder_name not in self.SEEDERS:
            raise ValueError(
                f"Unknown seeder: {seeder_name}. "
                f"Available: {', '.join(self.SEEDERS.keys())}"
            )
        
        seeder_class = self.SEEDERS[seeder_name]
        seeder = seeder_class(self.database)
        
        if kwargs:
            return seeder.seed(**kwargs)
        return seeder.seed()
    
    def seed_all(self):
        """Run all seeders in sequence."""
        print("\n" + "="*50)
        print("🌱 Running all seeders...")
        print("="*50 + "\n")
        
        total = 0
        for name in self.SEEDERS.keys():
            print()
            total += self.seed(name)
        
        print("\n" + "="*50)
        print(f"✅ Total records seeded: {total}")
        print("="*50 + "\n")
        return total


def main():
    """Main seeding CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Seed the barcode scanner database"
    )
    parser.add_argument(
        "seeder",
        nargs="?",
        default="sample",
        choices=list(SeedFactory.SEEDERS.keys()) + ["all"],
        help="Seeder to run (default: sample)"
    )
    parser.add_argument(
        "--records",
        type=int,
        default=1000,
        help="Number of records for performance seeder (default: 1000)"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear database before seeding"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    # Initialize database
    from threading import Lock
    db_lock = Lock()
    database = Database(DATABASE, db_lock)
    
    # Initialize if needed
    try:
        database.init_database()
    except Exception as e:
        logger.warning(f"Database already initialized: {e}")
    
    # Clear if requested
    if args.clear:
        print("🗑️  Clearing existing data...")
        try:
            import sqlite3
            with sqlite3.connect(DATABASE) as conn:
                conn.execute("DELETE FROM scans")
                conn.commit()
            print("✅ Database cleared\n")
        except Exception as e:
            logger.error(f"Error clearing database: {e}")
            return 1
    
    # Run seeder(s)
    factory = SeedFactory(database)
    
    try:
        if args.seeder == "all":
            factory.seed_all()
        elif args.seeder == "performance":
            factory.seed("performance", num_records=args.records)
        else:
            factory.seed(args.seeder)
        
        return 0
    
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
