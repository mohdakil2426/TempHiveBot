"""Mail.tm API async wrapper service."""

import asyncio
import httpx
from typing import Optional
from ..config import MAILTM_API_BASE


class MailTMError(Exception):
    """Base exception for Mail.tm API errors."""
    pass


class RateLimitError(MailTMError):
    """Rate limit exceeded (429)."""
    pass


class AuthenticationError(MailTMError):
    """Authentication failed (401)."""
    pass


class NotFoundError(MailTMError):
    """Resource not found (404)."""
    pass


class MailTMService:
    """Async service for interacting with Mail.tm API."""
    
    def __init__(self):
        self.base_url = MAILTM_API_BASE
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create httpx client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
        return self._client
    
    async def close(self):
        """Close the httpx client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        token: Optional[str] = None,
        json_data: Optional[dict] = None,
        retries: int = 3
    ) -> dict | None:
        """Make an HTTP request to the API with retry logic."""
        client = await self._get_client()
        url = f"{self.base_url}{endpoint}"
        
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        for attempt in range(retries):
            try:
                response = await client.request(
                    method, url, json=json_data, headers=headers
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    if attempt < retries - 1:
                        await asyncio.sleep(1)
                        continue
                    raise RateLimitError("Rate limit exceeded. Try again later.")
                
                # Handle authentication errors
                if response.status_code == 401:
                    raise AuthenticationError("Invalid or expired token.")
                
                # Handle not found
                if response.status_code == 404:
                    raise NotFoundError("Resource not found.")
                
                # Handle no content (successful delete)
                if response.status_code == 204:
                    return None
                
                # Handle other errors
                if response.status_code >= 400:
                    raise MailTMError(f"API error {response.status_code}: {response.text}")
                
                return response.json()
                    
            except httpx.RequestError as e:
                if attempt < retries - 1:
                    await asyncio.sleep(0.5)
                    continue
                raise MailTMError(f"Connection error: {str(e)}")
        
        raise MailTMError("Max retries exceeded")
    
    # ==================== Domain Operations ====================
    
    async def get_domains(self) -> list[dict]:
        """
        Fetch available email domains.
        
        Returns:
            List of domain objects with 'domain' and 'isActive' fields.
        """
        response = await self._request("GET", "/domains")
        return response.get("hydra:member", [])
    
    async def get_active_domain(self) -> str:
        """Get the first active domain available."""
        domains = await self.get_domains()
        for domain in domains:
            if domain.get("isActive", False):
                return domain["domain"]
        raise MailTMError("No active domains available")
    
    # ==================== Account Operations ====================
    
    async def create_account(self, address: str, password: str) -> dict:
        """
        Create a new email account.
        
        Args:
            address: Full email address (e.g., user@domain.com)
            password: Account password
            
        Returns:
            Account object with 'id', 'address', etc.
        """
        data = {"address": address, "password": password}
        return await self._request("POST", "/accounts", json_data=data)
    
    async def get_token(self, address: str, password: str) -> dict:
        """
        Authenticate and get JWT token.
        
        Args:
            address: Email address
            password: Account password
            
        Returns:
            Dict with 'id' and 'token' fields.
        """
        data = {"address": address, "password": password}
        return await self._request("POST", "/token", json_data=data)
    
    async def get_account(self, token: str) -> dict:
        """
        Get current account info.
        
        Args:
            token: JWT authentication token
            
        Returns:
            Account object.
        """
        return await self._request("GET", "/me", token=token)
    
    async def delete_account(self, token: str, account_id: str) -> None:
        """
        Delete an account.
        
        Args:
            token: JWT authentication token
            account_id: Account ID to delete
        """
        await self._request("DELETE", f"/accounts/{account_id}", token=token)
    
    # ==================== Message Operations ====================
    
    async def get_messages(self, token: str, page: int = 1) -> list[dict]:
        """
        Get list of messages in inbox.
        
        Args:
            token: JWT authentication token
            page: Page number (30 messages per page)
            
        Returns:
            List of message objects.
        """
        response = await self._request("GET", f"/messages?page={page}", token=token)
        return response.get("hydra:member", [])
    
    async def get_message(self, token: str, message_id: str) -> dict:
        """
        Get full message content.
        
        Args:
            token: JWT authentication token
            message_id: Message ID
            
        Returns:
            Full message object with content.
        """
        return await self._request("GET", f"/messages/{message_id}", token=token)
    
    async def delete_message(self, token: str, message_id: str) -> None:
        """
        Delete a message.
        
        Args:
            token: JWT authentication token
            message_id: Message ID to delete
        """
        await self._request("DELETE", f"/messages/{message_id}", token=token)
    
    async def mark_as_read(self, token: str, message_id: str) -> dict:
        """
        Mark a message as read.
        
        Args:
            token: JWT authentication token
            message_id: Message ID
            
        Returns:
            Updated message object.
        """
        return await self._request("PATCH", f"/messages/{message_id}", token=token)


# Global service instance
mailtm_service = MailTMService()
