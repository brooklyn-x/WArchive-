import React, { useState, useEffect } from 'react';
import { Shield, LockKeyhole, MessageCircle } from 'lucide-react';
import JSZip from 'jszip';
import { FileUpload } from './components/FileUpload';
import { PasswordPrompt } from './components/PasswordPrompt';
import { ChatViewer } from './components/ChatViewer';
import { ChatList } from './components/ChatList';
import { parseWhatsAppChat, ParsedChat } from './utils/whatsappParser';
import { encryptData, decryptData } from './utils/crypto';
import { saveEncryptedChat, getEncryptedChat, getAllEncryptedChats, deleteEncryptedChat, EncryptedChat } from './utils/db';

type AppState = 'home' | 'encrypting' | 'decrypting' | 'viewing';

export default function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [chats, setChats] = useState<EncryptedChat[]>([]);
  
  // State for current operation
  const [pendingFile, setPendingFile] = useState<{ name: string, content: string, mediaFiles: Record<string, string> } | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<{ parsed: ParsedChat, name: string } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved chats on mount
  useEffect(() => {
    loadSavedChats();
  }, []);

  const loadSavedChats = async () => {
    try {
      const savedChats = await getAllEncryptedChats();
      setChats(savedChats);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError('');
    try {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        
        let chatText = '';
        const mediaFiles: Record<string, string> = {};
        
        // Find the text file and media files
        for (const [filename, zipEntry] of Object.entries(contents.files)) {
          if (zipEntry.dir) continue;
          
          const baseFilename = filename.split('/').pop() || filename;
          if (baseFilename.startsWith('._')) continue; // Ignore macOS resource forks
          
          if (baseFilename.endsWith('.txt')) {
            const text = await zipEntry.async('text');
            // Prefer files that look like WhatsApp chat logs (start with date or bracket)
            // or use it if we haven't found any chat text yet
            if (text.trim().match(/^\[?\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/) || !chatText) {
              chatText = text;
            }
          } else if (baseFilename.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|webm|mkv|opus|mp3|wav|pdf|doc|docx|xls|xlsx)$/i)) {
            const base64 = await zipEntry.async('base64');
            const ext = baseFilename.split('.').pop()?.toLowerCase();
            let mimeType = ext;
            if (ext === 'jpg') mimeType = 'jpeg';
            if (ext === 'mov') mimeType = 'quicktime';
            if (ext === 'pdf') mimeType = 'pdf';
            if (ext === 'doc' || ext === 'docx') mimeType = 'msword';
            if (ext === 'xls' || ext === 'xlsx') mimeType = 'vnd.ms-excel';
            if (ext === 'opus') mimeType = 'ogg';
            
            let type = 'application';
            if (baseFilename.match(/\.(mp4|mov|webm|mkv)$/i)) type = 'video';
            else if (baseFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'image';
            else if (baseFilename.match(/\.(opus|mp3|wav)$/i)) type = 'audio';
            
            mediaFiles[baseFilename] = `data:${type}/${mimeType};base64,${base64}`;
          }
        }
        
        if (!chatText) {
          throw new Error('No .txt file found in the zip archive.');
        }
        
        setPendingFile({ name: file.name.replace('.zip', ''), content: chatText, mediaFiles });
        setAppState('encrypting');
      } else {
        const text = await file.text();
        setPendingFile({ name: file.name.replace('.txt', ''), content: text, mediaFiles: {} });
        setAppState('encrypting');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to read file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEncrypt = async (password: string) => {
    if (!pendingFile) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // 1. Parse chat to ensure it's valid before encrypting
      const parsed = parseWhatsAppChat(pendingFile.content, pendingFile.mediaFiles);
      if (parsed.messages.length === 0) {
        throw new Error('No messages found in the file. Ensure it is a valid WhatsApp export.');
      }

      // 2. Encrypt the parsed JSON
      const jsonToEncrypt = JSON.stringify(parsed);
      const { ciphertext, salt, iv } = await encryptData(jsonToEncrypt, password);
      
      // 3. Save to IndexedDB
      const newChat: EncryptedChat = {
        id: crypto.randomUUID(),
        name: pendingFile.name,
        salt,
        iv,
        ciphertext,
        createdAt: Date.now()
      };
      
      await saveEncryptedChat(newChat);
      
      // 4. Update state
      await loadSavedChats();
      setPendingFile(null);
      setAppState('home');
      
    } catch (err: any) {
      setError(err.message || 'Encryption failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = (chat: EncryptedChat) => {
    setSelectedChatId(chat.id);
    setAppState('decrypting');
    setError('');
  };

  const handleDeleteChat = async (id: string) => {
    await deleteEncryptedChat(id);
    await loadSavedChats();
  };

  const handleDecrypt = async (password: string) => {
    if (!selectedChatId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const chatRecord = await getEncryptedChat(selectedChatId);
      if (!chatRecord) throw new Error('Chat not found.');
      
      const decryptedJson = await decryptData(
        chatRecord.ciphertext,
        password,
        chatRecord.salt,
        chatRecord.iv
      );
      
      const parsedChat: ParsedChat = JSON.parse(decryptedJson);
      
      setActiveChat({ parsed: parsedChat, name: chatRecord.name });
      setAppState('viewing');
      
    } catch (err: any) {
      setError('Incorrect password or corrupted data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    setAppState('home');
    setActiveChat(null);
    setSelectedChatId(null);
    setPendingFile(null);
    setError('');
  };

  // Render different states
  if (appState === 'viewing' && activeChat) {
    return (
      <ChatViewer 
        chat={activeChat.parsed} 
        chatName={activeChat.name} 
        onBack={handleBackToHome} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={handleBackToHome}
          >
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
              <Shield size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">SecureChat</h1>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-1">
              <LockKeyhole size={16} />
              <span className="hidden sm:inline">End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle size={16} />
              <span className="hidden sm:inline">Local Processing</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {appState === 'home' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Read your WhatsApp exports safely.
              </h2>
              <p className="text-lg text-gray-500">
                Upload your exported chat file (.txt or .zip). We encrypt it locally in your browser so only you can read it. No data ever leaves your device.
              </p>
            </div>
            
            <FileUpload onFileSelect={handleFileSelect} />
            
            <ChatList 
              chats={chats} 
              onSelectChat={handleSelectChat} 
              onDeleteChat={handleDeleteChat} 
            />
          </div>
        )}

        {appState === 'encrypting' && pendingFile && (
          <div className="animate-in zoom-in-95 duration-300">
            <button 
              onClick={handleBackToHome}
              className="mb-6 text-gray-500 hover:text-gray-800 font-medium flex items-center gap-2 transition-colors"
            >
              &larr; Cancel
            </button>
            <PasswordPrompt 
              mode="encrypt" 
              onSubmit={handleEncrypt} 
              isLoading={isLoading} 
              error={error} 
            />
          </div>
        )}

        {appState === 'decrypting' && selectedChatId && (
          <div className="animate-in zoom-in-95 duration-300">
            <button 
              onClick={handleBackToHome}
              className="mb-6 text-gray-500 hover:text-gray-800 font-medium flex items-center gap-2 transition-colors"
            >
              &larr; Back
            </button>
            <PasswordPrompt 
              mode="decrypt" 
              onSubmit={handleDecrypt} 
              isLoading={isLoading} 
              error={error} 
            />
          </div>
        )}
      </main>
    </div>
  );
}
