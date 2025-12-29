# 📧 TempMail Bot

A complete temporary email solution with **Telegram Bot** and **Mini App** powered by the [Mail.tm](https://mail.tm) API.

## ✨ Features

### Telegram Bot (@TempHiveBot)
- 🚀 Auto-generate temporary email on `/start`
- 📬 Real-time notifications for new emails
- 🔄 Persistent buttons: "Generate New / Delete" and "Refresh"
- 📱 "Open Mini App" button for full inbox experience

### Telegram Mini App
- 📨 Two-page navigation (Mail + Inbox)
- 🎨 Modern professional UI with dark/light theme
- 🔗 Synced with bot - same email in both interfaces
- 📧 Read full emails in modal view
- 🗑️ Delete emails with confirmation
- ⚡ Auto-refresh every 15 seconds

## 🖼️ Screenshots

| Bot | Mini App |
|-----|----------|
| Persistent keyboard + Open Mini App button | Two-page navigation with bottom nav |

## 🚀 Quick Start

### Using the Bot
1. Open Telegram
2. Search for **@TempHiveBot**
3. Send `/start`
4. Get your temporary email!
5. Click "📱 Open Mini App" for full experience

### Mini App
- **Live URL**: [https://mohdakil2426.github.io/TempHiveBot/](https://mohdakil2426.github.io/TempHiveBot/)

## 🛠️ Development Setup

### Prerequisites
- Python 3.10+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

```bash
# Clone repository
git clone https://github.com/mohdakil2426/TempHiveBot.git
cd TempHiveBot

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "BOT_TOKEN=your_bot_token_here" > .env
echo "POLL_INTERVAL=30" >> .env
```

### Running

**Telegram Bot:**
```bash
python -m bot.main
```

**Local Web Server (for testing):**
```bash
python server.py
```

## 📁 Project Structure

```
TempHiveBot/
├── bot/                    # Telegram Bot
│   ├── main.py            # Entry point
│   ├── handlers/          # Command & button handlers
│   ├── services/          # Mail.tm API, notifier
│   └── database/          # SQLite storage
├── web/                    # Mini App (GitHub Pages)
│   ├── index.html         # Main HTML
│   ├── styles.css         # Design system
│   └── app.js             # Application logic
├── .github/workflows/      # CI/CD
│   └── deploy.yml         # GitHub Pages deployment
├── requirements.txt
└── README.md
```

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Bot | Python, python-telegram-bot |
| HTTP | httpx |
| Database | SQLite (aiosqlite) |
| Mini App | HTML, CSS, JavaScript |
| SDK | Telegram WebApp SDK |
| Hosting | GitHub Pages |
| API | Mail.tm |

## 🔗 Links

- **Bot**: [@TempHiveBot](https://t.me/TempHiveBot)
- **Mini App**: [Open TempMail](https://mohdakil2426.github.io/TempHiveBot/)
- **Mail.tm API**: [Documentation](https://docs.mail.tm)

## 📄 License

MIT License - feel free to use and modify!

---

Made with ❤️ using Mail.tm API
