# TempMail Telegram Bot - Project Brief

## Project Overview
A Telegram bot that provides temporary/disposable email addresses using the Mail.tm API. Users can generate emails, receive messages, and manage their inbox directly through Telegram.

## Core Requirements

### Functional Requirements
1. **Email Generation** - Create random temporary email addresses using Mail.tm domains
2. **Inbox Management** - View, read, and delete received emails
3. **Real-time Notifications** - Push notifications when new emails arrive
4. **Session Persistence** - Store user sessions across bot restarts

### Non-Functional Requirements
1. **Async Architecture** - Non-blocking operations for scalability
2. **Error Handling** - Graceful handling of API failures and rate limits
3. **User Experience** - Inline buttons for easy interaction

## Target Users
- Developers needing test email addresses
- Users who want privacy when signing up for services
- Anyone needing a quick disposable email

## Success Criteria
- Bot successfully generates working email addresses
- Emails are received and displayed correctly
- Background notifications work reliably
- User data persists across restarts
