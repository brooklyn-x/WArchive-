export interface ChatMessage {
  id: string;
  timestamp: string;
  sender: string;
  message: string;
  type: 'text' | 'system';
  attachment?: {
    fileName: string;
    dataUrl?: string; // Base64 data URL for images
  };
}

export interface ParsedChat {
  messages: ChatMessage[];
  senders: string[];
}

function parseDateString(dateStr: string): Date {
  // Clean up the string
  let cleanStr = dateStr.replace(/[\u200E\u200F]/g, '').trim();
  
  // Try native Date parsing first
  let d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;

  // If native fails, try to handle DD/MM/YYYY or MM/DD/YYYY
  const parts = cleanStr.split(/[, ]+/);
  if (parts.length >= 2) {
    const datePart = parts[0];
    const timePart = parts.slice(1).join(' ').replace(/[\u202F\u00A0]/g, ' ').trim();
    
    const dateComponents = datePart.split(/[-/.]/);
    if (dateComponents.length === 3) {
      let month = parseInt(dateComponents[0], 10);
      let day = parseInt(dateComponents[1], 10);
      let year = parseInt(dateComponents[2], 10);
      
      if (year < 100) year += 2000;
      
      if (month > 12) {
        // Swap month and day
        const temp = month;
        month = day;
        day = temp;
      }
      
      // Ensure valid month and day
      month = Math.max(1, Math.min(12, month || 1));
      day = Math.max(1, Math.min(31, day || 1));
      
      // Parse time
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      
      const timeMatch = timePart.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        if (timeMatch[3]) seconds = parseInt(timeMatch[3], 10);
        
        const ampm = timeMatch[4] ? timeMatch[4].toLowerCase().replace(/\./g, '') : '';
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
      }
      
      d = new Date(year, month - 1, day, hours, minutes, seconds);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback to current date if completely unparseable
  return new Date();
}

export function parseWhatsAppChat(text: string, mediaFiles: Record<string, string> = {}): ParsedChat {
  const lines = text.split('\n');
  const messages: ChatMessage[] = [];
  const sendersSet = new Set<string>();
  
  // Regex to match the start of a message
  // Android: Date, Time - Sender: Message
  // iOS: [Date, Time] Sender: Message
  const messageStartRegex = /^(?:\[([^\]]+)\]\s+(.*)|(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[, ].*?)\s+-\s+(.*))$/;

  let currentMessage: ChatMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    if (!line.trim()) continue;

    // Remove left-to-right and right-to-left marks that WhatsApp sometimes adds
    const cleanLine = line.replace(/[\u200E\u200F]/g, '');
    const match = cleanLine.match(messageStartRegex);

    if (match) {
      // It's a new message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const dateStr = match[1] || match[3];
      const restOfLine = match[2] || match[4];
      
      const timestamp = parseDateString(dateStr).toISOString();

      // Check if it's a system message or a user message
      const colonIndex = restOfLine.indexOf(': ');
      if (colonIndex !== -1) {
        const sender = restOfLine.substring(0, colonIndex).trim();
        let messageText = restOfLine.substring(colonIndex + 2);
        
        sendersSet.add(sender);
        
        let attachment;
        
        // Check for media attachments
        // Android: <Media omitted> or IMG-20240312-WA0001.jpg (file attached)
        // iOS: image omitted or ‎IMG_1234.jpg (file attached)
        const attachmentMatch = messageText.match(/^(?:‎)?(.+?\.(?:jpg|jpeg|png|gif|mp4|mov|webm|mkv|webp|opus|mp3|wav|pdf|docx?|xlsx?))\s+\(file attached\)$/i) ||
                                messageText.match(/^(?:‎)?(.+?\.(?:jpg|jpeg|png|gif|mp4|mov|webm|mkv|webp|opus|mp3|wav|pdf|docx?|xlsx?))$/i) ||
                                messageText.match(/<attached:\s*(.+?\.(?:jpg|jpeg|png|gif|mp4|mov|webm|mkv|webp|opus|mp3|wav|pdf|docx?|xlsx?))>/i);
                                
        if (attachmentMatch) {
          const fileName = attachmentMatch[1];
          // Find the actual filename in mediaFiles (case-insensitive and ignoring spaces/dashes/underscores)
          const normalize = (s: string) => s.toLowerCase().replace(/[-_ ]/g, '');
          const actualFileName = Object.keys(mediaFiles).find(k => normalize(k) === normalize(fileName)) || fileName;
          
          attachment = {
            fileName: actualFileName,
            dataUrl: mediaFiles[actualFileName]
          };
          // Keep the text as the filename or clear it if we have the image
          messageText = attachment.dataUrl ? '' : messageText;
        } else if (messageText.includes('<Media omitted>') || messageText.includes('image omitted') || messageText.includes('video omitted') || messageText.includes('sticker omitted')) {
           // It's a media omitted message, keep the text
        }

        currentMessage = {
          id: `msg-${i}`,
          timestamp,
          sender,
          message: messageText,
          type: 'text',
          attachment
        };
      } else {
        // System message
        currentMessage = {
          id: `msg-${i}`,
          timestamp,
          sender: 'System',
          message: restOfLine,
          type: 'system'
        };
      }
    } else {
      // It's a continuation of the previous message
      if (currentMessage) {
        currentMessage.message += (currentMessage.message ? '\n' : '') + line;
      }
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return {
    messages,
    senders: Array.from(sendersSet)
  };
}
