import initSqlJs from 'sql.js';

let SQL: any = null;

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowsAffected?: number;
}

export interface Database {
  id: string;
  name: string;
  data: Uint8Array;
  createdAt: Date;
  lastModified: Date;
}

export class SQLDatabase {
  private db: any = null;
  private dbId: string;
  private dbName: string;

  constructor(id: string, name: string) {
    this.dbId = id;
    this.dbName = name;
  }

  static async initialize(): Promise<void> {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });
    }
  }

  public async createDatabase(data?: Uint8Array): Promise<void> {
    await SQLDatabase.initialize();
    this.db = new SQL.Database(data);
  }

  public async executeQuery(query: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(query);
      const result: QueryResult = {
        columns: stmt.getColumnNames(),
        values: []
      };

      while (stmt.step()) {
        const row = stmt.get();
        result.values.push(row);
      }

      stmt.free();
      return result;
    } catch (error) {
      // Try executing as a non-select query
      try {
        this.db.run(query);
        return {
          columns: ['Result'],
          values: [['Query executed successfully']],
          rowsAffected: this.db.getRowsModified()
        };
      } catch (runError) {
        throw new Error(`SQL Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  public exportDatabase(): Uint8Array {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.export();
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public getId(): string {
    return this.dbId;
  }

  public getName(): string {
    return this.dbName;
  }

  public async executeMultipleQueries(queries: string[]): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    
    for (const query of queries) {
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        try {
          const result = await this.executeQuery(trimmedQuery);
          results.push(result);
        } catch (error) {
          results.push({
            columns: ['Error'],
            values: [[error instanceof Error ? error.message : 'Unknown error']]
          });
        }
      }
    }
    
    return results;
  }

  public getTableInfo(): Promise<QueryResult> {
    return this.executeQuery("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  }

  public async getTableSchema(tableName: string): Promise<QueryResult> {
    return this.executeQuery(`PRAGMA table_info(${tableName});`);
  }
}