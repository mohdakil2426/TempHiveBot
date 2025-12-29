# TempMail Bot - Active Context

## Current State
**Status**: ✅ Complete and Running  
**Last Updated**: 2025-12-29

## Recent Changes (2025-12-28)
1. Initialized full project structure
2. Implemented Mail.tm API wrapper with httpx
3. Created SQLite storage for user sessions
4. Built all Telegram command handlers
5. Added background email notification system
6. Fixed Python 3.13 compatibility issues

## Current Focus
- Bot is fully functional
- Ready for production use or further enhancements

## Next Steps (Potential)
- [ ] Add `/deletemail` command to delete current email and account
- [ ] Add support for email attachments download
- [ ] Implement email forwarding rules
- [ ] Add admin commands for bot management
- [ ] Multi-language support

## Active Decisions
- Using polling instead of Mercure SSE (simpler deployment)
- 30-second poll interval (balances responsiveness vs API limits)
- SQLite for storage (good enough for single-bot deployment)

## Important Patterns
1. **Async Everywhere** - All I/O operations are async
2. **Global Service Instances** - `mailtm_service` and `storage` are singletons
3. **MarkdownV2** - All Telegram messages use escaped MarkdownV2

## Known Issues
None currently - bot is working as expected.

## Session Info
- **Bot Token**: Stored in `.env`
- **Database**: `data/bot.db` (auto-created on first run)
- **Logs**: Console output with timestamps
