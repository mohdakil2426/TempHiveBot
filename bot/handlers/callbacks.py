"""Inline keyboard callback handlers."""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from ..services.mailtm import mailtm_service, MailTMError
from ..database.storage import storage, UserSession
from ..utils.helpers import generate_username, generate_password, strip_html, format_timestamp


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle all inline keyboard callbacks."""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    callback_data = query.data
    
    # Route to appropriate handler
    if callback_data == "copy_email":
        await handle_copy_email(query, user_id)
    elif callback_data == "new_email":
        await handle_new_email(query, user_id)
    elif callback_data == "check_inbox":
        await handle_check_inbox(query, user_id)
    elif callback_data.startswith("read_"):
        msg_id = callback_data.replace("read_", "")
        await handle_read_message(query, user_id, msg_id)
    elif callback_data.startswith("delete_"):
        msg_id = callback_data.replace("delete_", "")
        await handle_delete_message(query, user_id, msg_id)
    elif callback_data.startswith("confirm_delete_"):
        msg_id = callback_data.replace("confirm_delete_", "")
        await handle_confirm_delete(query, user_id, msg_id)
    elif callback_data == "back_to_inbox":
        await handle_check_inbox(query, user_id)


async def handle_copy_email(query, user_id: int) -> None:
    """Send email as copyable message."""
    session = await storage.get_user(user_id)
    
    if not session:
        await query.edit_message_text("❌ No email found. Use /new to create one.")
        return
    
    await query.message.reply_text(
        f"`{session.email}`",
        parse_mode="MarkdownV2"
    )


async def handle_new_email(query, user_id: int) -> None:
    """Generate a new email address."""
    await query.edit_message_text("⏳ Creating new email...")
    
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
        
        await query.edit_message_text(
            f"✅ *Your new temporary email is ready\\!*\n\n"
            f"📧 `{email_address}`\n\n"
            f"💡 _Emails will be forwarded to you automatically\\._",
            parse_mode="MarkdownV2",
            reply_markup=keyboard
        )
        
    except MailTMError as e:
        await query.edit_message_text(f"❌ Error creating email: {str(e)}")


async def handle_check_inbox(query, user_id: int) -> None:
    """Check inbox for messages."""
    session = await storage.get_user(user_id)
    
    if not session:
        await query.edit_message_text("❌ No email found. Use /new to create one.")
        return
    
    await query.edit_message_text("⏳ Loading inbox...")
    
    try:
        messages = await mailtm_service.get_messages(session.token)
        
        if not messages:
            await query.edit_message_text(
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
        
        for i, msg in enumerate(messages[:10], 1):
            sender = msg.get("from", {}).get("address", "Unknown")
            subject = msg.get("subject", "No Subject")
            time_ago = format_timestamp(msg.get("createdAt", ""))
            seen = "✓" if msg.get("seen", False) else "•"
            
            # Escape special characters
            def escape_md(s):
                chars = r'_*[]()~`>#+-=|{}.!'
                return ''.join(f'\\{c}' if c in chars else c for c in s)
            
            text += f"{seen} *{i}\\)* {escape_md(subject[:40])}\n"
            text += f"   _From: {escape_md(sender)}_\n"
            text += f"   📅 {escape_md(time_ago)}\n\n"
            
            msg_id = msg["id"]
            buttons.append([
                InlineKeyboardButton(f"📖 Read #{i}", callback_data=f"read_{msg_id}"),
                InlineKeyboardButton(f"🗑️ Delete #{i}", callback_data=f"delete_{msg_id}")
            ])
        
        buttons.append([InlineKeyboardButton("🔄 Refresh", callback_data="check_inbox")])
        
        await query.edit_message_text(
            text,
            parse_mode="MarkdownV2",
            reply_markup=InlineKeyboardMarkup(buttons)
        )
        
        if messages:
            await storage.update_last_message(user_id, messages[0]["id"])
            
    except MailTMError as e:
        await query.edit_message_text(f"❌ Error: {str(e)}")


async def handle_read_message(query, user_id: int, msg_id: str) -> None:
    """Read a specific message."""
    session = await storage.get_user(user_id)
    
    if not session:
        await query.edit_message_text("❌ No email found. Use /new to create one.")
        return
    
    try:
        message = await mailtm_service.get_message(session.token, msg_id)
        
        # Extract message details
        sender = message.get("from", {}).get("address", "Unknown")
        subject = message.get("subject", "No Subject")
        date = format_timestamp(message.get("createdAt", ""))
        
        # Get text content (prefer text over HTML)
        content = message.get("text", "")
        if not content:
            html_content = message.get("html", [])
            if html_content:
                content = strip_html(html_content[0] if isinstance(html_content, list) else html_content)
        
        if not content:
            content = "(No content)"
        
        # Truncate if too long
        if len(content) > 3000:
            content = content[:3000] + "..."
        
        # Escape for MarkdownV2
        def escape_md(s):
            chars = r'_*[]()~`>#+-=|{}.!'
            return ''.join(f'\\{c}' if c in chars else c for c in str(s))
        
        text = (
            f"📧 *Email Details*\n\n"
            f"*From:* {escape_md(sender)}\n"
            f"*Subject:* {escape_md(subject)}\n"
            f"*Date:* {escape_md(date)}\n\n"
            f"━━━━━━━━━━━━━━━━\n\n"
            f"{escape_md(content)}"
        )
        
        # Check for attachments
        attachments = message.get("attachments", [])
        if attachments:
            text += f"\n\n📎 *Attachments:* {len(attachments)} file\\(s\\)"
        
        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("🗑️ Delete", callback_data=f"delete_{msg_id}"),
                InlineKeyboardButton("⬅️ Back", callback_data="back_to_inbox")
            ]
        ])
        
        await query.edit_message_text(
            text,
            parse_mode="MarkdownV2",
            reply_markup=keyboard
        )
        
        # Mark as read
        await mailtm_service.mark_as_read(session.token, msg_id)
        
    except MailTMError as e:
        await query.edit_message_text(f"❌ Error reading message: {str(e)}")


async def handle_delete_message(query, user_id: int, msg_id: str) -> None:
    """Confirm message deletion."""
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Yes, Delete", callback_data=f"confirm_delete_{msg_id}"),
            InlineKeyboardButton("❌ Cancel", callback_data="back_to_inbox")
        ]
    ])
    
    await query.edit_message_text(
        "🗑️ *Delete this message?*\n\n"
        "This action cannot be undone\\.",
        parse_mode="MarkdownV2",
        reply_markup=keyboard
    )


async def handle_confirm_delete(query, user_id: int, msg_id: str) -> None:
    """Confirm and delete a message."""
    session = await storage.get_user(user_id)
    
    if not session:
        await query.edit_message_text("❌ No email found. Use /new to create one.")
        return
    
    try:
        await mailtm_service.delete_message(session.token, msg_id)
        
        await query.edit_message_text(
            "✅ *Message deleted successfully\\!*",
            parse_mode="MarkdownV2",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("📬 Back to Inbox", callback_data="check_inbox")]
            ])
        )
        
    except MailTMError as e:
        await query.edit_message_text(f"❌ Error deleting message: {str(e)}")
