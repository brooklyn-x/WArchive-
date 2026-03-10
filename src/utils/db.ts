import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface EncryptedChat {
  id: string;
  name: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: ArrayBuffer;
  createdAt: number;
}

interface ChatDB extends DBSchema {
  chats: {
    key: string;
    value: EncryptedChat;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>('whatsapp-secure-viewer', 1, {
      upgrade(db) {
        const store = db.createObjectStore('chats', { keyPath: 'id' });
        store.createIndex('by-date', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function saveEncryptedChat(chat: EncryptedChat) {
  const db = await getDB();
  await db.put('chats', chat);
}

export async function getEncryptedChat(id: string): Promise<EncryptedChat | undefined> {
  const db = await getDB();
  return db.get('chats', id);
}

export async function getAllEncryptedChats(): Promise<EncryptedChat[]> {
  const db = await getDB();
  return db.getAllFromIndex('chats', 'by-date');
}

export async function deleteEncryptedChat(id: string) {
  const db = await getDB();
  await db.delete('chats', id);
}
