"""
Utility functions.
"""

import logging
import sys


def setup_logging(name, level="INFO"):
    """
    Setup application logger.
    """

    logger = logging.getLogger(name)

    # Prevent duplicate handlers
    if logger.hasHandlers():
        return logger

    logger.setLevel(level)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    # Console output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    # Prevent duplicate parent logging
    logger.propagate = False

    return logger
