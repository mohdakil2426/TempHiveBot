# TempMail - Technical Context

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Python | 3.10+ |
| Bot Framework | python-telegram-bot | 22.5+ |
| HTTP Client | httpx | 0.27.0 |
| Database | SQLite (via aiosqlite) | 0.19.0 |
| Config | python-dotenv | 1.0.0 |
| Scheduler | APScheduler | 3.10.4 |
| Web Frontend | Vanilla HTML/CSS/JS | - |

## Development Setup

### Prerequisites
- Python 3.10 or higher
- pip package manager

### Installation
```bash
cd TempMail
pip install -r requirements.txt
```

### Configuration
Create `.env` file:
```
BOT_TOKEN=your_telegram_bot_token
POLL_INTERVAL=30
```

### Running

**Telegram Bot:**
```bash
python -m bot.main
```

**Web Interface:**
```bash
python server.py
# Opens http://localhost:8000 automatically
```

## External Dependencies

### Mail.tm API
- **Base URL**: `https://api.mail.tm`
- **Authentication**: JWT Bearer tokens
- **Rate Limit**: 8 requests per second
- **Documentation**: https://docs.mail.tm

### Key Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/domains` | GET | Get available email domains |
| `/accounts` | POST | Create new email account |
| `/accounts/{id}` | DELETE | Delete email account |
| `/token` | POST | Authenticate and get JWT |
| `/messages` | GET | List inbox messages |
| `/messages/{id}` | GET | Read full message |
| `/messages/{id}` | DELETE | Delete message |

## Technical Constraints

1. **Rate Limiting** - Max 8 API calls/second to Mail.tm
2. **Token Expiry** - JWT tokens expire, need refresh logic
3. **Polling Interval** - Balance between responsiveness and API limits
4. **Message Size** - Telegram has 4096 character limit per message
5. **localhost URLs** - Telegram doesn't allow localhost in inline button URLs

## Database Schema

```sql
CREATE TABLE users (
    telegram_id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    token TEXT NOT NULL,
    account_id TEXT NOT NULL,
    last_message_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Bot Commands (Menu)

| Command | Description |
|---------|-------------|
| `/start` | Generate new email address, show inbox |
| `/help` | Show help information |

## Persistent Keyboard Buttons

| Button | Action |
|--------|--------|
| ➕ Generate New / Delete | Creates new email, deletes old one |
| 🔄 Refresh | Refreshes inbox display |

## Inline Buttons

| Button | Action |
|--------|--------|
| Open in Browser ➡️ | Shows toast with web URL |
