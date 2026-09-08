"""
Lancer le scheduler des campagnes programmées.

Usage:
    python run_scheduler.py

Le scheduler vérifie toutes les 60 secondes s'il y a des campagnes
dont la date d'envoi est atteinte, et les envoie via 3MI.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers.scheduler import run_scheduler

if __name__ == "__main__":
    asyncio.run(run_scheduler())
