"""Email management command handlers."""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage, UserSession
from ..utils.helpers import generate_username, generate_password


async def new_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /new command - create a new temporary email."""
    user_id = update.effective_user.id
    
    # Send loading message
    loading_msg = await update.message.reply_text("⏳ Creating your temporary email...")
    
    try:
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
        
        # Save session to database
        session = UserSession(
            telegram_id=user_id,
            email=email_address,
            password=password,
            token=auth["token"],
            account_id=account["id"]
        )
        await storage.save_user(session)
        
        # Create response with buttons
        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("📋 Copy Email", callback_data="copy_email"),
                InlineKeyboardButton("🔄 New Email", callback_data="new_email")
            ],
            [
                InlineKeyboardButton("📬 Check Inbox", callback_data="check_inbox")
            ]
        ])
        
        await loading_msg.edit_text(
            f"✅ *Your temporary email is ready\\!*\n\n"
            f"📧 `{email_address}`\n\n"
            f"💡 _Emails will be forwarded to you automatically\\._",
            parse_mode="MarkdownV2",
            reply_markup=keyboard
        )
        
    except MailTMError as e:
        await loading_msg.edit_text(f"❌ Error creating email: {str(e)}")
    except Exception as e:
        await loading_msg.edit_text(f"❌ Unexpected error: {str(e)}")


async def mymail_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle the /mymail command - show current email address."""
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
    
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📋 Copy Email", callback_data="copy_email"),
            InlineKeyboardButton("🔄 New Email", callback_data="new_email")
        ],
        [
            InlineKeyboardButton("📬 Check Inbox", callback_data="check_inbox")
        ]
    ])
    
    await update.message.reply_text(
        f"📧 *Your current email:*\n\n"
        f"`{session.email}`",
        parse_mode="MarkdownV2",
        reply_markup=keyboard
    )
