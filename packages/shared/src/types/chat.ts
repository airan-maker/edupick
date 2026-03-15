export enum ChatRoomType {
  CLASS_GROUP = 'CLASS_GROUP',
  DIRECT = 'DIRECT',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  FILE = 'FILE',
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  classId: string | null;
  name: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  isPinned: boolean;
  createdAt: string;
}
