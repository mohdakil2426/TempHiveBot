"""Inbox management command handlers."""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError, AuthenticationError
from ..database.storage import storage
from ..utils.helpers import format_timestamp, strip_html, truncate_text


async def _refresh_token_if_needed(session):
    """Try to refresh token if authentication fails."""
    try:
        auth = await mailtm_service.get_token(session.email, session.password)
        await storage.update_token(session.telegram_id, auth["token"])
        return auth["token"]
    except MailTMError:
        return None


async def inbox_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /inbox command - list all emails."""
    user_id = update.effective_user.id
    
    # Get user session
    session = await storage.get_user(user_id)
    
    if not session:
        await update.message.reply_text(
            "📭 You don't have an email address yet\\.\n\n"
            "Use /new to create one\\!",
            parse_mode="MarkdownV2"
        )
        return
    
    loading_msg = await update.message.reply_text("⏳ Loading inbox...")
    
    try:
        # Fetch messages
        messages = await mailtm_service.get_messages(session.token)
        
        if not messages:
            await loading_msg.edit_text(
                "📭 *Your inbox is empty*\n\n"
                "Waiting for emails\\.\\.\\.",
                parse_mode="MarkdownV2",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔄 Refresh", callback_data="check_inbox")]
                ])
            )
            return
        
        # Build message list
        text = f"📬 *Your Inbox* \\({len(messages)} message{'s' if len(messages) != 1 else ''}\\)\n\n"
        buttons = []
        
        for i, msg in enumerate(messages[:10], 1):  # Show first 10 messages
            sender = msg.get("from", {}).get("address", "Unknown")
            subject = msg.get("subject", "No Subject")
            time_ago = format_timestamp(msg.get("createdAt", ""))
            seen = "✓" if msg.get("seen", False) else "•"
            
            # Escape for MarkdownV2
            sender_escaped = sender.replace(".", "\\.").replace("-", "\\-").replace("_", "\\_")
            subject_escaped = truncate_text(subject, 40).replace(".", "\\.").replace("-", "\\-").replace("_", "\\_").replace("!", "\\!").replace("(", "\\(").replace(")", "\\)")
            time_escaped = time_ago.replace(".", "\\.")
            
            text += f"{seen} *{i}\\)* {subject_escaped}\n"
            text += f"   _From: {sender_escaped}_\n"
            text += f"   📅 {time_escaped}\n\n"
            
            # Add buttons for each message
            msg_id = msg["id"]
            buttons.append([
                InlineKeyboardButton(f"📖 Read #{i}", callback_data=f"read_{msg_id}"),
                InlineKeyboardButton(f"🗑️ Delete #{i}", callback_data=f"delete_{msg_id}")
            ])
        
        # Add refresh button
        buttons.append([InlineKeyboardButton("🔄 Refresh", callback_data="check_inbox")])
        
        await loading_msg.edit_text(
            text,
            parse_mode="MarkdownV2",
            reply_markup=InlineKeyboardMarkup(buttons)
        )
        
        # Update last message ID
        if messages:
            await storage.update_last_message(user_id, messages[0]["id"])
            
    except AuthenticationError:
        # Try to refresh token
        new_token = await _refresh_token_if_needed(session)
        if new_token:
            await loading_msg.edit_text("🔄 Session refreshed. Please try again.")
        else:
            await loading_msg.edit_text(
                "❌ Session expired. Please create a new email with /new"
            )
    except MailTMError as e:
        await loading_msg.edit_text(f"❌ Error: {str(e)}")


async def refresh_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /refresh command - alias for /inbox."""
    await inbox_command(update, context)


async def read_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /read <id> command - read specific message."""
    user_id = update.effective_user.id
    
    # Get user session
    session = await storage.get_user(user_id)
    
    if not session:
        await update.message.reply_text("📭 Use /new to create an email first.")
        return
    
    # Get message ID from command args
    if not context.args:
        await update.message.reply_text(
            "Usage: /read <message\\_number>\n\n"
            "Use /inbox to see your messages first\\.",
            parse_mode="MarkdownV2"
        )
        return
    
    await update.message.reply_text("💡 Please use the buttons in /inbox to read messages.")


async def delete_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /delete <id> command - delete specific message."""
    await update.message.reply_text("💡 Please use the buttons in /inbox to delete messages.")
