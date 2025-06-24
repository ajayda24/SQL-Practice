import localforage from 'localforage';
import { Database } from './sqlDb';

// Configure localforage
if (typeof window !== "undefined") {
  localforage.config({
    driver: localforage.INDEXEDDB,
    name: "SQLPracticeApp",
    version: 1.0,
    storeName: "databases",
    description: "SQLite databases for SQL Practice PWA",
  });
} else {
  console.warn("localForage not initialized (server-side)");
}

export class DatabaseStorage {
  private static instance: DatabaseStorage;
  private store: LocalForage;

  private constructor() {
    this.store = localforage.createInstance({
      name: 'SQLPracticeApp',
      storeName: 'databases'
    });
  }

  public static getInstance(): DatabaseStorage {
    if (!DatabaseStorage.instance) {
      DatabaseStorage.instance = new DatabaseStorage();
    }
    return DatabaseStorage.instance;
  }

  public async saveDatabase(database: Database): Promise<void> {
    try {
      await this.store.setItem(database.id, {
        id: database.id,
        name: database.name,
        data: Array.from(database.data), // Convert Uint8Array to regular array for storage
        createdAt: database.createdAt.toISOString(),
        lastModified: database.lastModified.toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to save database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async loadDatabase(id: string): Promise<Database | null> {
    try {
      const stored = await this.store.getItem<any>(id);
      if (!stored) return null;

      return {
        id: stored.id,
        name: stored.name,
        data: new Uint8Array(stored.data), // Convert back to Uint8Array
        createdAt: new Date(stored.createdAt),
        lastModified: new Date(stored.lastModified)
      };
    } catch (error) {
      console.error('Failed to load database:', error);
      return null;
    }
  }

  public async getAllDatabases(): Promise<Database[]> {
    try {
      const databases: Database[] = [];
      const keys = await this.store.keys();

      for (const key of keys) {
        const db = await this.loadDatabase(key);
        if (db) {
          databases.push(db);
        }
      }

      return databases.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error('Failed to load databases:', error);
      return [];
    }
  }

  public async deleteDatabase(id: string): Promise<void> {
    try {
      await this.store.removeItem(id);
    } catch (error) {
      throw new Error(`Failed to delete database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async exportDatabase(id: string): Promise<Blob | null> {
    try {
      const database = await this.loadDatabase(id);
      if (!database) return null;

      return new Blob([database.data], { type: 'application/x-sqlite3' });
    } catch (error) {
      console.error('Failed to export database:', error);
      return null;
    }
  }

  public async importDatabase(file: File): Promise<Database> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const data = new Uint8Array(arrayBuffer);
          const id = `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const name = file.name.replace(/\.[^/.]+$/, '') || `Imported Database ${Date.now()}`;
          
          const database: Database = {
            id,
            name,
            data,
            createdAt: new Date(),
            lastModified: new Date()
          };
          
          resolve(database);
        } catch (error) {
          reject(new Error(`Failed to import database: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  public async clearAllDatabases(): Promise<void> {
    try {
      await this.store.clear();
    } catch (error) {
      throw new Error(`Failed to clear databases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export type { Database };
