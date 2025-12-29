# TempMail - Project Brief

## Project Overview
A dual-interface temporary email solution with **Telegram Bot** and **Web Interface** using the Mail.tm API. Users can generate disposable emails, receive messages, and manage their inbox through Telegram or browser.

## Core Requirements

### Functional Requirements
1. **Email Generation** - Create random temporary email addresses using Mail.tm domains
2. **Inbox Management** - View received emails with sender, subject, preview
3. **Real-time Notifications** - Background polling for new emails (Telegram)
4. **Session Persistence** - SQLite for bot, LocalStorage for web
5. **Dual Interface** - Same functionality via Telegram Bot and Web Browser

### Non-Functional Requirements
1. **Async Architecture** - Non-blocking operations for scalability
2. **Error Handling** - Graceful handling of API failures and rate limits
3. **User Experience** - Persistent keyboard buttons, instant actions

## Target Users
- Developers needing test email addresses
- Users who want privacy when signing up for services
- Anyone needing a quick disposable email

## Success Criteria
- ✅ Bot successfully generates working email addresses
- ✅ Emails are received and displayed correctly
- ✅ Background notifications work reliably
- ✅ User data persists across restarts
- ✅ Web interface provides same core functionality
