"""Background email notification service."""

import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage
from ..utils.helpers import format_timestamp, truncate_text

logger = logging.getLogger(__name__)


async def check_new_emails(context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Background job to check for new emails for all users.
    Called periodically by the job queue.
    """
    try:
        users = await storage.get_all_users()
        
        for user in users:
            try:
                await check_user_emails(context, user)
            except Exception as e:
                logger.warning(f"Error checking emails for user {user.telegram_id}: {e}")
                
    except Exception as e:
        logger.error(f"Error in background email check: {e}")


async def check_user_emails(context: ContextTypes.DEFAULT_TYPE, user) -> None:
    """Check for new emails for a specific user."""
    try:
        # Fetch messages
        messages = await mailtm_service.get_messages(user.token)
        
        if not messages:
            return
        
        # Get the latest message
        latest_msg = messages[0]
        latest_id = latest_msg["id"]
        
        # Check if this is a new message
        if user.last_message_id == latest_id:
            return  # No new messages
        
        # Find all new messages
        new_messages = []
        for msg in messages:
            if msg["id"] == user.last_message_id:
                break
            new_messages.append(msg)
        
        if not new_messages:
            return
        
        # Send notification for each new message (max 5)
        for msg in new_messages[:5]:
            await send_email_notification(context, user.telegram_id, msg)
        
        # Update last message ID
        await storage.update_last_message(user.telegram_id, latest_id)
        
    except MailTMError as e:
        # Token might be expired, try to refresh
        try:
            auth = await mailtm_service.get_token(user.email, user.password)
            await storage.update_token(user.telegram_id, auth["token"])
        except MailTMError:
            logger.warning(f"Failed to refresh token for user {user.telegram_id}")


async def send_email_notification(context: ContextTypes.DEFAULT_TYPE, user_id: int, message: dict) -> None:
    """Send a notification for a new email."""
    sender = message.get("from", {}).get("address", "Unknown")
    subject = message.get("subject", "No Subject")
    intro = message.get("intro", "")
    msg_id = message["id"]
    time_ago = format_timestamp(message.get("createdAt", ""))
    
    # Escape for MarkdownV2
    def escape_md(s):
        chars = r'_*[]()~`>#+-=|{}.!'
        return ''.join(f'\\{c}' if c in chars else c for c in str(s))
    
    text = (
        f"📬 *New Email Received\\!*\n\n"
        f"*From:* {escape_md(sender)}\n"
        f"*Subject:* {escape_md(truncate_text(subject, 50))}\n"
        f"📅 {escape_md(time_ago)}\n\n"
    )
    
    if intro:
        text += f"_{escape_md(truncate_text(intro, 100))}_"
    
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📖 Read Full", callback_data=f"read_{msg_id}"),
            InlineKeyboardButton("🗑️ Delete", callback_data=f"delete_{msg_id}")
        ]
    ])
    
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=text,
            parse_mode="MarkdownV2",
            reply_markup=keyboard
        )
    except Exception as e:
        logger.warning(f"Failed to send notification to user {user_id}: {e}")
