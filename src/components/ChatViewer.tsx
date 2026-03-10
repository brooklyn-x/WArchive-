import React, { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { format, isSameDay, parseISO } from 'date-fns';
import { Search, Filter, X, BarChart2, ArrowLeft, Image as ImageIcon, Video as VideoIcon, FileText, Headphones } from 'lucide-react';
import { ParsedChat, ChatMessage } from '../utils/whatsappParser';

interface ChatViewerProps {
  chat: ParsedChat;
  chatName: string;
  onBack: () => void;
}

export function ChatViewer({ chat, chatName, onBack }: ChatViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [meUser, setMeUser] = useState<string>(chat.senders.length > 1 ? chat.senders[1] : chat.senders[0]);

  const filteredMessages = useMemo(() => {
    return chat.messages.filter(msg => {
      const matchesSearch = msg.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSender = selectedSender ? msg.sender === selectedSender : true;
      return matchesSearch && matchesSender;
    });
  }, [chat.messages, searchQuery, selectedSender]);

  const senderColors = useMemo(() => {
    const colors = [
      'text-blue-600', 'text-emerald-600', 'text-purple-600', 
      'text-orange-600', 'text-pink-600', 'text-indigo-600'
    ];
    const map: Record<string, string> = {};
    chat.senders.forEach((sender, i) => {
      map[sender] = colors[i % colors.length];
    });
    return map;
  }, [chat.senders]);

  const groupedDates = useMemo(() => {
    const dates: { index: number, date: string }[] = [];
    let lastDate = '';
    
    filteredMessages.forEach((msg, index) => {
      try {
        const dateStr = format(parseISO(msg.timestamp), 'MMMM d, yyyy');
        if (dateStr !== lastDate) {
          dates.push({ index, date: dateStr });
          lastDate = dateStr;
        }
      } catch (e) {
        // Ignore invalid dates
      }
    });
    return dates;
  }, [filteredMessages]);

  const renderMessage = (index: number, msg: ChatMessage) => {
    const dateHeader = groupedDates.find(d => d.index === index);
    const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
    const isConsecutive = prevMsg && prevMsg.sender === msg.sender && prevMsg.type !== 'system' && !dateHeader;

    if (msg.type === 'system') {
      return (
        <div className="flex flex-col items-center my-4">
          {dateHeader && (
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-lg mb-4 shadow-sm">
              {dateHeader.date}
            </div>
          )}
          <div className="bg-yellow-100/80 text-yellow-800 text-xs px-4 py-1.5 rounded-lg text-center max-w-md shadow-sm">
            {msg.message}
          </div>
        </div>
      );
    }

    const isMe = msg.sender === meUser;

    return (
      <div className="flex flex-col px-4">
        {dateHeader && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm">
              {dateHeader.date}
            </div>
          </div>
        )}
        
        <div className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'} ${!isConsecutive ? 'mt-2' : ''}`}>
          <div 
            className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-3 py-2 shadow-sm relative
              ${isMe 
                ? 'bg-emerald-100 text-gray-800 rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}
          >
            {!isMe && !isConsecutive && (
              <div className={`text-xs font-bold mb-1 ${senderColors[msg.sender] || 'text-gray-600'}`}>
                {msg.sender}
              </div>
            )}
            
            {msg.attachment && (
              <div className="mb-2 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                {msg.attachment.dataUrl ? (
                  msg.attachment.dataUrl.startsWith('data:video/') ? (
                    <video 
                      src={msg.attachment.dataUrl} 
                      controls
                      className="max-w-full max-h-64 object-contain"
                    />
                  ) : msg.attachment.dataUrl.startsWith('data:audio/') ? (
                    <audio 
                      src={msg.attachment.dataUrl} 
                      controls
                      className="max-w-full"
                    />
                  ) : msg.attachment.dataUrl.startsWith('data:image/') ? (
                    <img 
                      src={msg.attachment.dataUrl} 
                      alt="Attached media" 
                      className="max-w-full max-h-64 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <a href={msg.attachment.dataUrl} download={msg.attachment.fileName} className="p-4 flex flex-col items-center justify-center text-emerald-600 hover:text-emerald-700 gap-2 w-full">
                      <FileText size={24} />
                      <span className="text-xs underline">{msg.attachment.fileName}</span>
                    </a>
                  )
                ) : (
                  <div className="p-4 flex flex-col items-center justify-center text-gray-500 gap-2 w-full">
                    {msg.attachment.fileName.match(/\.(mp4|mov|webm|mkv)$/i) ? <VideoIcon size={24} /> : 
                     msg.attachment.fileName.match(/\.(opus|mp3|wav)$/i) ? <Headphones size={24} /> :
                     msg.attachment.fileName.match(/\.(pdf|doc|docx|xls|xlsx)$/i) ? <FileText size={24} /> :
                     <ImageIcon size={24} />}
                    <span className="text-xs">{msg.attachment.fileName}</span>
                  </div>
                )}
              </div>
            )}
            
            {msg.message && (
              <div className="text-sm whitespace-pre-wrap break-words">
                {msg.message}
              </div>
            )}
            
            <div className="text-[10px] text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
              {format(parseISO(msg.timestamp), 'h:mm a')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#efeae2]">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-semibold text-lg leading-tight">{chatName}</h1>
            <p className="text-xs text-gray-400">{chat.messages.length} messages</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-full transition-colors ${showStats ? 'bg-emerald-600' : 'hover:bg-gray-800'}`}
            title="Chat Statistics"
          >
            <BarChart2 size={20} />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap gap-3 items-center shadow-sm z-10">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-full text-sm transition-all outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedSender(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${selectedSender === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {chat.senders.map(sender => (
            <button
              key={sender}
              onClick={() => setSelectedSender(sender)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${selectedSender === sender ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {sender}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 ml-auto border-l border-gray-200 pl-3">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">My Side:</span>
          <select
            value={meUser}
            onChange={(e) => setMeUser(e.target.value)}
            className="text-xs bg-gray-100 border-transparent rounded-full px-3 py-1 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none cursor-pointer max-w-[120px] truncate"
          >
            {chat.senders.map(sender => (
              <option key={sender} value={sender}>{sender}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 h-full bg-[#efeae2] relative" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(239, 234, 226, 0.9)' }}>
          {filteredMessages.length > 0 ? (
            <Virtuoso
              data={filteredMessages}
              itemContent={renderMessage}
              className="h-full w-full scroll-smooth"
              initialTopMostItemIndex={filteredMessages.length - 1}
              followOutput="smooth"
              increaseViewportBy={800}
              defaultItemHeight={80}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No messages found.
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        {showStats && (
          <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col h-full overflow-y-auto z-20 absolute right-0 md:relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">Chat Statistics</h3>
              <button onClick={() => setShowStats(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 md:hidden">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-2xl font-bold text-gray-800">{chat.messages.length}</div>
                    <div className="text-xs text-gray-500">Total Messages</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-2xl font-bold text-gray-800">{chat.senders.length}</div>
                    <div className="text-xs text-gray-500">Participants</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Messages by Sender</h4>
                <div className="space-y-3">
                  {chat.senders.map(sender => {
                    const count = chat.messages.filter(m => m.sender === sender).length;
                    const percentage = Math.round((count / chat.messages.length) * 100);
                    return (
                      <div key={sender}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate max-w-[150px]">{sender}</span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
