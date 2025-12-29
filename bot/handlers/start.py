"""Start command handler - Auto-generates email on /start."""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage, UserSession
from ..utils.helpers import generate_username, generate_password, format_timestamp

logger = logging.getLogger(__name__)


# Persistent keyboard at bottom
def get_persistent_keyboard():
    """Get the persistent reply keyboard with Generate New/Delete and Refresh."""
    return ReplyKeyboardMarkup(
        [
            [
                KeyboardButton("➕ Generate New / Delete"),
                KeyboardButton("🔄 Refresh")
            ]
        ],
        resize_keyboard=True,
        is_persistent=True
    )


async def show_email_status(update_or_message, session, context: ContextTypes.DEFAULT_TYPE, is_callback: bool = False):
    """Show the current email status with inbox."""
    logger.info(f"Showing email status for {session.email}")
    try:
        # Fetch messages
        messages = await mailtm_service.get_messages(session.token)
        logger.info(f"Got {len(messages)} messages")
        
        # Build the message matching the reference format
        text = f"Current email address: {session.email}\n\n"
        
        if messages:
            # Show messages like reference image
            for msg in messages[:5]:
                sender_name = msg.get("from", {}).get("name", "")
                sender_email = msg.get("from", {}).get("address", "Unknown")
                sender = f"{sender_name} <{sender_email}>" if sender_name else sender_email
                subject = msg.get("subject", "No Subject")
                
                text += f"New email message\n\n"
                text += f"From: {sender}\n"
                text += f"Subject: {subject}"
                break  # Show only the latest message in main view
        else:
            text += "Your inbox is empty"
        
        # Create inline keyboard - use callback instead of URL for "Open in Browser"
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Open in Browser ➡️", callback_data="open_browser")]
        ])
        
        if is_callback:
            await update_or_message.edit_text(
                text,
                reply_markup=keyboard
            )
        else:
            await update_or_message.reply_text(
                text,
                reply_markup=keyboard
            )
            
    except MailTMError as e:
        logger.error(f"MailTM error in show_email_status: {e}")
        # Token might be expired, try refresh
        try:
            auth = await mailtm_service.get_token(session.email, session.password)
            await storage.update_token(session.telegram_id, auth["token"])
            session.token = auth["token"]
            # Retry
            await show_email_status(update_or_message, session, context, is_callback)
        except Exception as refresh_error:
            logger.error(f"Token refresh failed: {refresh_error}")
            error_text = "Current email address: (expired)\n\nYour inbox is empty"
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("Open in Browser ➡️", callback_data="open_browser")]
            ])
            if is_callback:
                await update_or_message.edit_text(error_text, reply_markup=keyboard)
            else:
                await update_or_message.reply_text(error_text, reply_markup=keyboard)


async def create_new_email(user_id: int) -> UserSession:
    """Create a new email account and return the session."""
    # Get available domain
    domain = await mailtm_service.get_active_domain()
    
    # Generate random credentials
    username = generate_username()
    password = generate_password()
    email_address = f"{username}@{domain}"
    
    # Create account
    account = await mailtm_service.create_account(email_address, password)
    
    # Get authentication token
    auth = await mailtm_service.get_token(email_address, password)
    
    # Create session
    session = UserSession(
        telegram_id=user_id,
        email=email_address,
        password=password,
        token=auth["token"],
        account_id=account["id"]
    )
    
    return session


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /start command - Auto-generate email and show status."""
    user_id = update.effective_user.id
    logger.info(f"Start command from user {user_id}")
    
    # Check if user already has an email
    session = await storage.get_user(user_id)
    logger.info(f"Existing session: {session is not None}")
    
    if not session:
        # Create new email for first-time user
        logger.info("Creating new email for user")
        try:
            session = await create_new_email(user_id)
            await storage.save_user(session)
            logger.info(f"Created email: {session.email}")
        except MailTMError as e:
            logger.error(f"Error creating email: {e}")
            await update.message.reply_text(
                f"❌ Error creating email: {str(e)}",
                reply_markup=get_persistent_keyboard()
            )
            return
        except Exception as e:
            logger.error(f"Unexpected error creating email: {e}", exc_info=True)
            await update.message.reply_text(
                f"❌ Unexpected error: {str(e)}",
                reply_markup=get_persistent_keyboard()
            )
            return
    
    # Show welcome with persistent keyboard
    logger.info("Sending welcome message")
    await update.message.reply_text(
        "🚀 Welcome to TempMail Bot!",
        reply_markup=get_persistent_keyboard()
    )
    
    # Show email status
    logger.info("Showing email status")
    try:
        await show_email_status(update.message, session, context)
    except Exception as e:
        logger.error(f"Error showing email status: {e}", exc_info=True)
        await update.message.reply_text(
            f"Your email: {session.email}\n\nYour inbox is empty"
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /help command."""
    help_text = """
📧 TempMail Bot Help

How to use:
• On /start you get a temporary email
• Click "Open in Browser" to view inbox in web
• Use buttons below to manage your email

Bottom Buttons:
• Generate New / Delete - Get a new email (deletes old one)
• Refresh - Refresh your inbox

Note: When you generate a new email, your old email and all its messages are permanently deleted.
    """
    await update.message.reply_text(
        help_text,
        reply_markup=get_persistent_keyboard()
    )
