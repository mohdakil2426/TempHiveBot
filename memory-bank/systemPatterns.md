# TempMail Bot - System Patterns

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

### 3. Handler Pattern
- Separate handler modules for different command groups
- `start.py` - Welcome/help commands
- `email.py` - Email generation commands
- `inbox.py` - Inbox management commands
- `callbacks.py` - Inline button handlers

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

## Component Relationships

```
main.py
├── config.py (loads .env)
├── handlers/
│   ├── start.py (uses nothing)
│   ├── email.py (uses mailtm, storage, helpers)
│   ├── inbox.py (uses mailtm, storage, helpers)
│   └── callbacks.py (uses mailtm, storage, helpers)
├── services/
│   ├── mailtm.py (uses config)
│   └── notifier.py (uses mailtm, storage, helpers)
├── database/
│   └── storage.py (uses config)
└── utils/
    └── helpers.py (standalone)
```

## Error Handling Strategy

1. **API Errors** - Caught in `MailTMService`, wrapped in custom exceptions
2. **Rate Limits** - Automatic retry with exponential backoff
3. **Auth Failures** - Token refresh attempted before failing
4. **User Errors** - Friendly messages with guidance
