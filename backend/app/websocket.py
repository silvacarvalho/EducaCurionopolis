"""
WebSocket Manager for Real-time Notifications
Handles message notifications and connection management
"""
from fastapi import WebSocket
from typing import Dict, List, Optional
import asyncio
from datetime import datetime


class ConnectionManager:
    """
    Manages WebSocket connections for real-time notifications
    Maintains a mapping of user_id to their WebSocket connections
    """
    
    def __init__(self):
        # user_id -> list of WebSocket connections (user can have multiple tabs/devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a WebSocket connection and register it for the user"""
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        print(f"[WebSocket] User {user_id} connected. Total connections: {len(self.active_connections.get(user_id, []))}")

    def disconnect(self, user_id: int, websocket: Optional[WebSocket] = None):
        """Remove a WebSocket connection for a user"""
        if user_id in self.active_connections:
            if websocket:
                try:
                    self.active_connections[user_id].remove(websocket)
                except ValueError:
                    pass
            if not self.active_connections[user_id] or websocket is None:
                del self.active_connections[user_id]
        print(f"[WebSocket] User {user_id} disconnected")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WebSocket] Error sending to user {user_id}: {e}")
                    dead_connections.append(connection)
            
            # Clean up dead connections
            async with self._lock:
                for conn in dead_connections:
                    try:
                        self.active_connections[user_id].remove(conn)
                    except ValueError:
                        pass

    async def broadcast(self, message: dict, exclude_user: Optional[int] = None):
        """Broadcast message to all connected users"""
        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WebSocket] Broadcast error for user {user_id}: {e}")

    async def notify_new_message(
        self,
        destinatario_id: int,
        mensagem_id: int,
        remetente_nome: str,
        assunto: str,
        prioridade: str
    ):
        """Notify a user about a new message"""
        notification = {
            "type": "new_message",
            "data": {
                "mensagem_id": mensagem_id,
                "remetente_nome": remetente_nome,
                "assunto": assunto,
                "prioridade": prioridade,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await self.send_personal_message(notification, destinatario_id)

    async def notify_message_read(self, remetente_id: int, mensagem_id: int):
        """Notify the sender that their message was read"""
        notification = {
            "type": "message_read",
            "data": {
                "mensagem_id": mensagem_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await self.send_personal_message(notification, remetente_id)

    async def notify_unread_count(self, user_id: int, count: int):
        """Notify user of updated unread count"""
        notification = {
            "type": "unread_count",
            "data": {
                "count": count,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await self.send_personal_message(notification, user_id)

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[int]:
        """Get list of all online user IDs"""
        return list(self.active_connections.keys())


# Global connection manager instance
manager = ConnectionManager()
