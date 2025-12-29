"""Configuration module for TempMail bot."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Telegram Bot Token
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Mail.tm API Configuration
MAILTM_API_BASE = "https://api.mail.tm"

# Polling interval for checking new emails (in seconds)
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", 30))

# Database path
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "bot.db"
