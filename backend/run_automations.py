"""
Lancer le worker des automations.

Usage:
    python run_automations.py

Le worker vérifie toutes les 5 minutes les automations actives
et exécute celles dont les conditions sont remplies.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers.automation_worker import run_automation_worker

if __name__ == "__main__":
    asyncio.run(run_automation_worker())
