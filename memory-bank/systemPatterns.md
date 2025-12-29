# TempMail - System Patterns

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Telegram      │────▶│   Python Bot    │────▶│   Mail.tm API   │
│   Users         │◀────│   (Backend)     │◀────│   (Provider)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   SQLite DB     │
                        │   (Sessions)    │
                        └─────────────────┘

┌─────────────────┐                           ┌─────────────────┐
│   Browser       │──────────────────────────▶│   Mail.tm API   │
│   Users         │◀──────────────────────────│   (Direct)      │
└─────────────────┘                           └─────────────────┘
        │
        ▼
┌─────────────────┐
│   localStorage  │
│   (Sessions)    │
└─────────────────┘
```

## Project Structure

```
TempMail/
├── bot/
│   ├── __init__.py
│   ├── main.py              # Entry point, handlers registration
│   ├── config.py            # Environment config
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── start.py         # /start, /help, show_email_status
│   │   └── buttons.py       # Keyboard button handlers, callbacks
│   ├── services/
│   │   ├── __init__.py
│   │   ├── mailtm.py        # Mail.tm API wrapper
│   │   └── notifier.py      # Background email checker
│   ├── database/
│   │   ├── __init__.py
│   │   └── storage.py       # SQLite user storage
│   └── utils/
│       ├── __init__.py
│       └── helpers.py       # Utility functions
├── web/
│   ├── index.html           # Main HTML structure
│   ├── styles.css           # Dark theme CSS
│   └── app.js               # Client-side JavaScript
├── data/
│   └── bot.db               # SQLite database (auto-created)
├── memory-bank/             # Project documentation
├── server.py                # Simple HTTP server for web
├── .env                     # Bot token (not in git)
├── .env.example             # Template
├── .gitignore
├── requirements.txt
└── README.md
```

## Design Patterns

### 1. Service Pattern
- `MailTMService` - Encapsulates all Mail.tm API interactions
- Single global instance for connection reuse
- Async methods for non-blocking I/O

### 2. Repository Pattern
- `Storage` class handles all database operations
- Clean separation between business logic and data access
- Async SQLite via `aiosqlite`

### 3. Handler Pattern (Telegram)
- `start.py` - Command handlers (/start, /help)
- `buttons.py` - Message handlers for persistent keyboard
- `buttons.py` - Callback handlers for inline buttons

### 4. Background Job Pattern
- `notifier.py` runs on APScheduler
- Polls for new emails every 30 seconds
- Sends push notifications via Telegram API

## Key Technical Decisions

### Why httpx over aiohttp?
- Pure Python, no C compilation needed
- Better Windows compatibility
- Simpler API for our use case

### Why SQLite over JSON files?
- Concurrent access support
- Better query capabilities
- Atomic operations

### Why polling over webhooks (Mercure)?
- Simpler deployment (no public URL needed)
- Works behind NAT/firewalls
- Sufficient for our scale

### Why plain text over Markdown in Telegram?
- Avoids escaping issues with special characters in emails
- More reliable message delivery
- Cleaner code

## Error Handling Strategy

1. **API Errors** - Caught in `MailTMService`, wrapped in custom exceptions
2. **Rate Limits** - Automatic retry with exponential backoff
3. **Auth Failures** - Token refresh attempted before failing
4. **User Errors** - Friendly messages with guidance
5. **Telegram Parse Errors** - Using plain text to avoid formatting issues
