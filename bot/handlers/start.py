"""Start and help command handlers."""

from telegram import Update
from telegram.ext import ContextTypes


WELCOME_MESSAGE = """
👋 *Welcome to TempMail Bot!*

📧 Generate temporary email addresses instantly
📬 Receive emails directly in Telegram
🔔 Get notified when new emails arrive
🗑️ Easily manage your inbox

*Available Commands:*
/new \\- Create a new temporary email
/mymail \\- Show your current email address
/inbox \\- View your inbox
/refresh \\- Check for new emails
/help \\- Show this help message

Get started by using /new to create your first temporary email\\!
"""

HELP_MESSAGE = """
📚 *TempMail Bot Help*

*Email Commands:*
/new \\- Generate a new temporary email address
/mymail \\- Display your current email address

*Inbox Commands:*
/inbox \\- View list of received emails
/refresh \\- Manually check for new emails

*Other:*
/start \\- Restart the bot
/help \\- Show this help message

💡 *Tips:*
• New emails will be forwarded to you automatically
• Click the buttons to read or delete messages
• Use /new to get a fresh email address anytime
"""


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /start command."""
    await update.message.reply_text(
        WELCOME_MESSAGE,
        parse_mode="MarkdownV2"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /help command."""
    await update.message.reply_text(
        HELP_MESSAGE,
        parse_mode="MarkdownV2"
    )
