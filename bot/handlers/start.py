"""Start command handler - Auto-generates email on /start."""

import base64
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage, UserSession
from ..utils.helpers import generate_username, generate_password, format_timestamp

logger = logging.getLogger(__name__)

# Mini App URL (GitHub Pages)
MINI_APP_URL = "https://mohdakil2426.github.io/TempHiveBot"


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


def get_mini_app_url(email: str, password: str, page: str = "inbox") -> str:
    """Generate Mini App URL with auth credentials."""
    credentials = base64.urlsafe_b64encode(f"{email}:{password}".encode()).decode()
    return f"{MINI_APP_URL}/?auth={credentials}&page={page}"


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
        
        # Create inline keyboard with Mini App WebAppInfo
        mini_app_url = get_mini_app_url(session.email, session.password, "inbox")
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("📱 Open Mini App", web_app=WebAppInfo(url=mini_app_url))]
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
                [InlineKeyboardButton("📱 Open Mini App", web_app=WebAppInfo(url=MINI_APP_URL))]
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

    # Check for Sync Start Parameter
    if context.args and context.args[0].startswith("SYNC_"):
        logger.info("Received Sync request from Mini App")
        try:
            # Format: SYNC_Base64(email:password)
            payload = context.args[0][5:]
            # Ensure padding if needed (though standard b64 usually fine, urlsafe might need it)
            # JS btoa uses +/, so we replace to urlsafe standard if we want, or just receive as is.
            # Our valid chars are usually just alphanumeric + @.
            # Python's urlsafe_b64decode expects -_ but can handle standard if validated.
            # However, JS btoa produces +/ (standard base64).
            # Let's handle standard base64 decoding.
            # We must fix padding.
            padding = len(payload) % 4
            if padding:
                payload += "=" * (4 - padding)
            
            # Replace -_ with +/ just in case it came as urlsafe, or vice versa.
            # Actually, standardizing: replace - with + and _ with / to process as standard b64
            payload = payload.replace('-', '+').replace('_', '/')
            
            decoded = base64.b64decode(payload).decode()
            email, password = decoded.split(":")
            
            # Verify and get token
            auth = await mailtm_service.get_token(email, password)
            token = auth["token"]
            
            # Get Account ID (needed for DB schema)
            account_info = await mailtm_service.get_account(token)
            account_id = account_info["id"] # Assuming API returns id usually
            if not account_id:
                 # Fallback if /me doesn't return id (it generally does)
                 # We can search accounts? No.
                 # Actually creates_account returns ID. /me returns ID.
                 account_id = account_info.get("id", "unknown")

            # Update Session
            session = UserSession(
                telegram_id=user_id,
                email=email,
                password=password,
                token=token,
                account_id=account_id
            )
            await storage.save_user(session)
            
            await update.message.reply_text(
                f"✅ <b>Synced!</b>\n\nActive email updated to: {email}",
                parse_mode="HTML",
                reply_markup=get_persistent_keyboard()
            )
            
            # Show status immediately
            await show_email_status(update.message, session, context)
            return

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            await update.message.reply_text("❌ Sync failed. Please try again or generate a new email here.")
            # Fallthrough to normal start
    
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
• Click "Open Mini App" to view inbox
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
