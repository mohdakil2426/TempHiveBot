# TempMail - Product Context

## Why This Project Exists
Temporary email addresses are essential for:
- **Privacy Protection** - Avoid spam when signing up for services
- **Testing** - Developers need disposable emails for automated tests
- **Convenience** - Quick email access without creating permanent accounts

## Problem It Solves
1. **Traditional temp mail sites** require visiting a website and manually refreshing
2. **No mobile-friendly interface** for checking temp emails on the go
3. **No instant notifications** when emails arrive
4. **No cross-platform solution** - users want bot AND web access

## How It Works

### Telegram Bot Flow
1. User sends `/start` command
2. Bot auto-generates a new email address
3. Shows email with persistent keyboard buttons
4. Background job polls for new emails every 30 seconds
5. Notifications sent when new emails arrive

### Web Interface Flow
1. User opens `http://localhost:8000`
2. Email auto-generated on first visit
3. Auto-refresh every 10 seconds
4. Click to read emails in modal
5. Session persists in localStorage

## User Experience Goals
- **Instant** - Email generation in under 2 seconds
- **Simple** - No configuration needed, just `/start` or open browser
- **Mobile-first** - Works perfectly on Telegram mobile
- **Seamless** - Auto-notifications without manual refresh

## Key User Flows

### Telegram: Generate Email
```
User: /start
Bot: 🚀 Welcome to TempMail Bot!
     
     Current email address: abc123@domain.com
     Your inbox is empty
     
     [Open in Browser ➡️]

     [➕ Generate New / Delete] [🔄 Refresh]
```

### Telegram: Receive Email
```
Bot: New email message

     From: sender@site.com
     Subject: Verify your account
     
     [Open in Browser ➡️]
```

### Web: View Inbox
```
┌─────────────────────────────────────┐
│  📧 TempMail                        │
│  abc123@domain.com    [Copy] [New]  │
├─────────────────────────────────────┤
│  Inbox (2)                          │
│  ┌─────────────────────────────────┐│
│  │ S  sender@site.com    2m ago   ││
│  │    Verify your account         ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```
