"""
Utility functions for the barcode scanner system.
"""

import logging
import logging.handlers
from pathlib import Path

from config import LOG_FILE, LOG_FORMAT


def setup_logging(name, level=logging.INFO):
    """
    Configure logging for the application.
    
    Args:
        name: Logger name
        level: Logging level
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_formatter = logging.Formatter(LOG_FORMAT)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler with rotation
    log_path = Path(LOG_FILE)
    file_handler = logging.handlers.RotatingFileHandler(
        log_path,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(level)
    file_formatter = logging.Formatter(LOG_FORMAT)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    return logger


def validate_device_port(port):
    """
    Validate device port format.
    
    Args:
        port: Device port string (e.g., /dev/ttyUSB0)
    
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(port, str):
        return False
    
    # Check for common patterns
    valid_patterns = [
        port.startswith('/dev/ttyUSB'),  # Linux USB
        port.startswith('/dev/ttyACM'),  # Linux Arduino
        port.startswith('COM'),          # Windows
        port.startswith('/dev/cu.usbserial'),  # macOS
    ]
    
    return any(valid_patterns)


def format_barcode(barcode):
    """
    Format and validate barcode string.
    
    Args:
        barcode: Raw barcode string
    
    Returns:
        Cleaned barcode or None if invalid
    """
    if not isinstance(barcode, str):
        return None
    
    cleaned = barcode.strip()
    if len(cleaned) == 0:
        return None
    
    return cleaned


def get_system_info():
    """
    Get system information.
    
    Returns:
        Dictionary with system details
    """
    import platform
    import sys
    
    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "processor": platform.processor(),
    }
