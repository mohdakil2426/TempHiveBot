# TempMail Telegram Bot 📧

A Telegram bot that provides temporary email addresses using the [Mail.tm](https://mail.tm) API. Generate disposable emails, receive messages in real-time, and manage your inbox directly through Telegram.

## Features

- 📧 **Instant Email Generation** - Create temporary email addresses with one command
- 📬 **Real-time Notifications** - Get notified when new emails arrive
- 📖 **Read Emails** - View full email content directly in Telegram
- 🗑️ **Easy Management** - Delete emails with a single tap
- 🔐 **Private** - Each user gets their own unique email address

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and instructions |
| `/new` | Generate a new temporary email |
| `/mymail` | Show your current email address |
| `/inbox` | View your inbox |
| `/refresh` | Manually check for new emails |
| `/help` | Display help message |

## Installation

### Prerequisites

- Python 3.10 or higher
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tempmail-bot.git
   cd tempmail-bot
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   # Copy example config
   cp .env.example .env
   
   # Edit .env and add your bot token
   BOT_TOKEN=your_telegram_bot_token_here
   POLL_INTERVAL=30
   ```

5. **Run the bot:**
   ```bash
   python -m bot.main
   ```

## Project Structure

```
TempMail/
├── bot/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── config.py            # Configuration
│   ├── handlers/            # Telegram command handlers
│   │   ├── start.py         # /start, /help
│   │   ├── email.py         # /new, /mymail
│   │   ├── inbox.py         # /inbox, /refresh
│   │   └── callbacks.py     # Button callbacks
│   ├── services/
│   │   ├── mailtm.py        # Mail.tm API wrapper
│   │   └── notifier.py      # Background notifications
│   ├── database/
│   │   └── storage.py       # SQLite storage
│   └── utils/
│       └── helpers.py       # Utility functions
├── data/                    # Database files
├── .env                     # Environment variables
├── requirements.txt
└── README.md
```

## API Reference

This bot uses the [Mail.tm API](https://docs.mail.tm) which provides:
- Free temporary email addresses
- No authentication required for basic usage
- Rate limit: 8 requests per second

## License

MIT License - feel free to use this project for any purpose.

## Credits

- [Mail.tm](https://mail.tm) - Temporary email API provider
- [python-telegram-bot](https://python-telegram-bot.org/) - Telegram Bot framework
