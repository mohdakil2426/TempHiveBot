"""Message handlers for persistent keyboard buttons and callbacks."""

import logging
from telegram import Update
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage
from .start import create_new_email, show_email_status, get_persistent_keyboard

logger = logging.getLogger(__name__)


async def handle_generate_new(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle 'Generate New / Delete' button press - instant, no loading message."""
    user_id = update.effective_user.id
    logger.info(f"Generate new email for user {user_id}")
    
    try:
        # Get existing session
        old_session = await storage.get_user(user_id)
        
        # Delete old account if exists (silently)
        if old_session:
            try:
                await mailtm_service.delete_account(old_session.token, old_session.account_id)
            except MailTMError:
                # Account might already be deleted or token expired, continue anyway
                pass
            
            # Remove from database
            await storage.delete_user(user_id)
        
        # Create new email
        session = await create_new_email(user_id)
        await storage.save_user(session)
        
        # Show confirmation and new email status directly (no loading message)
        await update.message.reply_text(
            "✅ New email generated! Old email deleted.",
            reply_markup=get_persistent_keyboard()
        )
        await show_email_status(update.message, session, context)
        
    except MailTMError as e:
        logger.error(f"Error generating email: {e}")
        await update.message.reply_text(
            f"❌ Error: {str(e)}",
            reply_markup=get_persistent_keyboard()
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await update.message.reply_text(
            f"❌ Unexpected error: {str(e)}",
            reply_markup=get_persistent_keyboard()
        )


async def handle_refresh(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle 'Refresh' button press - refresh inbox."""
    user_id = update.effective_user.id
    logger.info(f"Refresh inbox for user {user_id}")
    
    # Get user session
    session = await storage.get_user(user_id)
    
    if not session:
        await update.message.reply_text(
            "📭 No email found. Press 'Generate New / Delete' to create one.",
            reply_markup=get_persistent_keyboard()
        )
        return
    
    # Show email status (this will refresh the inbox)
    await show_email_status(update.message, session, context)


async def handle_open_browser(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle 'Open in Browser' button callback - just acknowledge."""
    query = update.callback_query
    # Just answer the callback without sending any message
    await query.answer("Visit http://localhost:8000 in your browser", show_alert=True)


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle all callback queries from inline buttons."""
    query = update.callback_query
    callback_data = query.data
    
    if callback_data == "open_browser":
        await handle_open_browser(update, context)
    else:
        await query.answer("Unknown action")


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle all text messages including button presses."""
    text = update.message.text
    
    if text == "➕ Generate New / Delete":
        await handle_generate_new(update, context)
    elif text == "🔄 Refresh":
        await handle_refresh(update, context)
    else:
        # Unknown message, remind user about commands
        await update.message.reply_text(
            "Use the buttons below or /start to begin.",
            reply_markup=get_persistent_keyboard()
        )
