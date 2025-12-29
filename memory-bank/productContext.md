# TempMail Bot - Product Context

## Why This Project Exists
Temporary email addresses are essential for:
- **Privacy Protection** - Avoid spam when signing up for services
- **Testing** - Developers need disposable emails for automated tests
- **Convenience** - Quick email access without creating permanent accounts

## Problem It Solves
1. **Traditional temp mail sites** require visiting a website and manually refreshing
2. **No mobile-friendly interface** for checking temp emails on the go
3. **No instant notifications** when emails arrive

## How It Works
1. User sends `/new` command in Telegram
2. Bot creates an account on Mail.tm API
3. Bot returns a unique email address to the user
4. When emails arrive, bot sends push notifications
5. User can read/delete emails directly in Telegram

## User Experience Goals
- **Instant** - Email generation in under 2 seconds
- **Simple** - No configuration needed, just `/new`
- **Mobile-first** - Works perfectly on Telegram mobile
- **Seamless** - Auto-notifications without manual refresh

## Key User Flows

### Generate Email
```
User: /new
Bot: ✅ Your email is ready!
     📧 abc123@domain.com
     [Copy] [New Email]
```

### Receive Email
```
Bot: 📬 New Email!
     From: noreply@site.com
     Subject: Verify your account
     [Read] [Delete]
```

### Read Email
```
User: clicks [Read]
Bot: Full email content displayed
     with sender, subject, body
```
