"""Start command handler - Auto-generates email on /start."""

import base64
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage, UserSession
from ..utils.helpers import generate_username, generate_password

logger = logging.getLogger(__name__)

# Mini App URL (GitHub Pages)
MINI_APP_URL = "https://mohdakil2426.github.io/TempHiveBot"


def get_mini_app_url(email: str, password: str, page: str = "inbox") -> str:
    """Generate Mini App URL with auth credentials."""
    credentials = base64.urlsafe_b64encode(f"{email}:{password}".encode()).decode()
    return f"{MINI_APP_URL}/?auth={credentials}&page={page}"


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
    """Handle the /start command - Auto-generate email and show app launcher."""
    user_id = update.effective_user.id
    logger.info(f"Start command from user {user_id}")
    
    # Check for Sync Start Parameter
    if context.args and context.args[0].startswith("SYNC_"):
        logger.info("Received Sync request from Mini App")
        try:
            # Format: SYNC_Base64(email:password)
            payload = context.args[0][5:]
            
            # Standardizing base64: replace - with + and _ with /
            payload = payload.replace('-', '+').replace('_', '/')
            
            # Fix padding
            padding = len(payload) % 4
            if padding:
                payload += "=" * (4 - padding)
            
            decoded = base64.b64decode(payload).decode()
            email, password = decoded.split(":")
            
            # Verify and get token
            auth = await mailtm_service.get_token(email, password)
            token = auth["token"]
            
            # Get Account ID
            account_info = await mailtm_service.get_account(token)
            account_id = account_info["id"] or "unknown"

            # Update Session
            session = UserSession(
                telegram_id=user_id,
                email=email,
                password=password,
                token=token,
                account_id=account_id
            )
            await storage.save_user(session)
            
            # Simple sync success message
            await update.message.reply_text(
                f"✅ **Notifications Enabled**\nBot is now watching: `{email}`",
                parse_mode="Markdown"
            )
            return

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            await update.message.reply_text("❌ Sync failed.")
            # Fallthrough to normal start if sync fails? Or just return.
            return

    # Normal /start flow
    session = await storage.get_user(user_id)
    
    if not session:
        # Create new email for first-time user
        try:
            session = await create_new_email(user_id)
            await storage.save_user(session)
        except Exception as e:
            logger.error(f"Error creating email: {e}")
            await update.message.reply_text("❌ Service temporarily unavailable.")
            return
            
    # Minimalist Launcher UI
    mini_app_url = get_mini_app_url(session.email, session.password, "mail")
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🚀 Open TempMail", web_app=WebAppInfo(url=mini_app_url))]
    ])
    
    await update.message.reply_text(
        "**TempMail**\n\nTap below to open your secure temporary inbox.",
        parse_mode="Markdown",
        reply_markup=keyboard
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /help command."""
    help_text = """
**TempMail Help**

• Tap **Open TempMail** to manage your emails.
• All features (generation, inbox, reading) are inside the Mini App.
• The bot will notify you when new emails arrive.
    """
    await update.message.reply_text(help_text, parse_mode="Markdown")
