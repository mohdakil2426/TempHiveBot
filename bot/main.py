"""TempMail Telegram Bot - Entry Point."""

import logging
from telegram import BotCommand
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters

from .config import BOT_TOKEN, POLL_INTERVAL
from .handlers import start
from .handlers.buttons import message_handler, callback_handler
from .services.notifier import check_new_emails
from .database.storage import storage

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def post_init(application: Application) -> None:
    """Initialize database and set bot commands after application starts."""
    # Initialize database
    await storage.init_db()
    logger.info("Database initialized")
    
    # Set bot menu commands
    commands = [
        BotCommand("start", "Generate new email address, show inbox"),
        BotCommand("help", "Show help information"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("Bot commands set")


def main():
    """Start the bot."""
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not found in environment variables!")
        return
    
    # Build application
    application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    
    # Register command handlers
    application.add_handler(CommandHandler("start", start.start_command))
    application.add_handler(CommandHandler("help", start.help_command))
    
    # Register callback query handler for inline buttons
    application.add_handler(CallbackQueryHandler(callback_handler))
    
    # Register message handler for button presses (must be added after command handlers)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))
    
    # Set up background job for checking new emails
    job_queue = application.job_queue
    job_queue.run_repeating(
        check_new_emails,
        interval=POLL_INTERVAL,
        first=10  # Start checking 10 seconds after bot starts
    )
    
    logger.info("Starting TempMail Bot...")
    logger.info(f"Email check interval: {POLL_INTERVAL} seconds")
    
    # Run the bot
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
