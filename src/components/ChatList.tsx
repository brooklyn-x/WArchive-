import React from 'react';
import { MessageSquare, Calendar, Trash2, Lock } from 'lucide-react';
import { EncryptedChat } from '../utils/db';

interface ChatListProps {
  chats: EncryptedChat[];
  onSelectChat: (chat: EncryptedChat) => void;
  onDeleteChat: (id: string) => void;
}

export function ChatList({ chats, onSelectChat, onDeleteChat }: ChatListProps) {
  if (chats.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Lock size={18} className="text-emerald-600" />
        Your Encrypted Chats
      </h3>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {chats.map((chat) => (
            <li key={chat.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
              <button 
                onClick={() => onSelectChat(chat)}
                className="flex-1 flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{chat.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Calendar size={12} />
                    <span>Imported on {new Date(chat.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this encrypted chat?')) {
                    onDeleteChat(chat.id);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Delete Chat"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
