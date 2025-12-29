"""SQLite storage for user sessions."""

import aiosqlite
from typing import Optional
from dataclasses import dataclass
from datetime import datetime
from ..config import DB_PATH


@dataclass
class UserSession:
    """User session data."""
    telegram_id: int
    email: str
    password: str
    token: str
    account_id: str
    last_message_id: Optional[str] = None
    created_at: Optional[str] = None


class Storage:
    """SQLite database storage for user sessions."""
    
    def __init__(self):
        self.db_path = DB_PATH
    
    async def init_db(self):
        """Initialize the database and create tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    telegram_id INTEGER PRIMARY KEY,
                    email TEXT NOT NULL,
                    password TEXT NOT NULL,
                    token TEXT NOT NULL,
                    account_id TEXT NOT NULL,
                    last_message_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.commit()
    
    async def save_user(self, session: UserSession) -> None:
        """
        Save or update a user session.
        
        Args:
            session: UserSession object to save
        """
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO users 
                (telegram_id, email, password, token, account_id, last_message_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session.telegram_id,
                session.email,
                session.password,
                session.token,
                session.account_id,
                session.last_message_id,
                session.created_at or datetime.now().isoformat()
            ))
            await db.commit()
    
    async def get_user(self, telegram_id: int) -> Optional[UserSession]:
        """
        Get user session by Telegram ID.
        
        Args:
            telegram_id: Telegram user ID
            
        Returns:
            UserSession object or None if not found
        """
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM users WHERE telegram_id = ?",
                (telegram_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return UserSession(
                        telegram_id=row["telegram_id"],
                        email=row["email"],
                        password=row["password"],
                        token=row["token"],
                        account_id=row["account_id"],
                        last_message_id=row["last_message_id"],
                        created_at=row["created_at"]
                    )
                return None
    
    async def update_token(self, telegram_id: int, token: str) -> None:
        """
        Update the JWT token for a user.
        
        Args:
            telegram_id: Telegram user ID
            token: New JWT token
        """
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE users SET token = ? WHERE telegram_id = ?",
                (token, telegram_id)
            )
            await db.commit()
    
    async def update_last_message(self, telegram_id: int, message_id: str) -> None:
        """
        Update the last seen message ID for a user.
        
        Args:
            telegram_id: Telegram user ID
            message_id: Last message ID
        """
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE users SET last_message_id = ? WHERE telegram_id = ?",
                (message_id, telegram_id)
            )
            await db.commit()
    
    async def delete_user(self, telegram_id: int) -> None:
        """
        Delete a user session.
        
        Args:
            telegram_id: Telegram user ID
        """
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM users WHERE telegram_id = ?",
                (telegram_id,)
            )
            await db.commit()
    
    async def get_all_users(self) -> list[UserSession]:
        """
        Get all user sessions (for background notifications).
        
        Returns:
            List of all UserSession objects
        """
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM users") as cursor:
                rows = await cursor.fetchall()
                return [
                    UserSession(
                        telegram_id=row["telegram_id"],
                        email=row["email"],
                        password=row["password"],
                        token=row["token"],
                        account_id=row["account_id"],
                        last_message_id=row["last_message_id"],
                        created_at=row["created_at"]
                    )
                    for row in rows
                ]


# Global storage instance
storage = Storage()
