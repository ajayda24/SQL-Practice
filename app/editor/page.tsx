"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Play, 
  Save, 
  ArrowLeft, 
  Database, 
  Table, 
  FileText, 
  Copy, 
  Download,
  RefreshCw,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { SQLDatabase, QueryResult } from '@/lib/sqlDb';
import { DatabaseStorage, Database as DatabaseType } from '@/lib/storage';
import { cn } from '@/lib/utils';

const SAMPLE_QUERIES = {
  beginner: [
    'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);',
    'INSERT INTO students (name, age) VALUES ("Alice", 20), ("Bob", 22), ("Charlie", 19);',
    'SELECT * FROM students;',
    'SELECT name FROM students WHERE age > 20;'
  ],
  intermediate: [
    'CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, credits INTEGER);',
    'CREATE TABLE enrollments (student_id INTEGER, course_id INTEGER, grade TEXT);',
    'INSERT INTO courses VALUES (1, "Database Systems", 3), (2, "Web Development", 4);',
    'SELECT s.name, c.name, e.grade FROM students s JOIN enrollments e ON s.id = e.student_id JOIN courses c ON c.id = e.course_id;'
  ],
  advanced: [
    'CREATE VIEW student_stats AS SELECT COUNT(*) as total_students, AVG(age) as avg_age FROM students;',
    'SELECT name, age, (age - (SELECT AVG(age) FROM students)) as age_diff FROM students;',
    'CREATE INDEX idx_student_age ON students(age);'
  ]
};

export default function Editor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dbId = searchParams.get('db');
  
  const [database, setDatabase] = useState<SQLDatabase | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseType | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<QueryResult | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  
  const storage = DatabaseStorage.getInstance();

  useEffect(() => {
    if (dbId) {
      initializeDatabase();
    } else {
      router.push('/');
    }
  }, [dbId, router]);

  const initializeDatabase = async () => {
    if (!dbId) return;

    try {
      setLoading(true);
      const dbData = await storage.loadDatabase(dbId);
      if (!dbData) {
        toast.error('Database not found');
        router.push('/');
        return;
      }

      setDbInfo(dbData);
      const db = new SQLDatabase(dbData.id, dbData.name);
      await db.createDatabase(dbData.data);
      setDatabase(db);
      
      await loadTables(db);
      toast.success(`Database "${dbData.name}" loaded`);
    } catch (error) {
      toast.error('Failed to load database');
      console.error('Database load error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (db: SQLDatabase) => {
    try {
      const tableResult = await db.getTableInfo();
      const tableNames = tableResult.values.map(row => row[0] as string);
      setTables(tableNames);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const executeQuery = async () => {
    if (!database || !query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      const queries = query.split(';').filter(q => q.trim());
      const queryResults = await database.executeMultipleQueries(queries);
      const endTime = performance.now();
      
      setResults(queryResults);
      setExecutionTime(endTime - startTime);
      
      // Refresh tables list in case structure changed
      await loadTables(database);
      await saveDatabase();
      
      toast.success(`Query executed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      
      const errorResult: QueryResult = {
        columns: ['Error'],
        values: [[error instanceof Error ? error.message : 'Unknown error']]
      };
      setResults([errorResult]);
      toast.error('Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const saveDatabase = async () => {
    if (!database || !dbInfo) return;

    try {
      const exportedData = database.exportDatabase();
      const updatedDb: DatabaseType = {
        ...dbInfo,
        data: exportedData,
        lastModified: new Date()
      };
      
      await storage.saveDatabase(updatedDb);
      setDbInfo(updatedDb);
    } catch (error) {
      console.error('Failed to save database:', error);
      toast.error('Failed to save database');
    }
  };

  const loadTableSchema = async (tableName: string) => {
    if (!database) return;

    try {
      const schema = await database.getTableSchema(tableName);
      setTableSchema(schema);
      setSelectedTable(tableName);
    } catch (error) {
      toast.error(`Failed to load schema for ${tableName}`);
    }
  };

  const insertSampleQuery = (queryText: string) => {
    if (query.trim()) {
      setQuery(query + '\n\n' + queryText);
    } else {
      setQuery(queryText);
    }
  };

  const clearResults = () => {
    setResults([]);
    setExecutionTime(0);
  };

  const copyResults = (result: QueryResult) => {
    const text = [
      result.columns.join('\t'),
      ...result.values.map(row => row.join('\t'))
    ].join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Results copied to clipboard');
  };

  if (!database && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Loading database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SQL Editor</h1>
              <p className="text-sm text-gray-600">{dbInfo?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {tables.length} table{tables.length !== 1 ? "s" : ""}
            </Badge>
            {/* <Button onClick={saveDatabase} variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button> */}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query Editor */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Query Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative">
                <Textarea
                  placeholder="Enter your SQL query here..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => setQuery("")}
                  className="absolute right-8 bottom-24"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex w-full">
                  <Button
                    onClick={executeQuery}
                    disabled={loading || !query.trim()}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {loading ? "Executing..." : "Run Query"}
                  </Button>

                  {/* {executionTime > 0 && (
                    <Badge variant="secondary">
                      {executionTime.toFixed(2)}ms
                    </Badge>
                  )} */}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Query Results</CardTitle>
                    <Button variant="outline" onClick={clearResults}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Results
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg">
                        <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                          <span className="font-medium">
                            Result {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyResults(result)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="h-[300px]">
                          {result.values.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-white border-b">
                                <tr>
                                  {result.columns.map((col, i) => (
                                    <th
                                      key={i}
                                      className="px-4 py-2 text-left font-medium"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {result.values.map((row, i) => (
                                  <tr
                                    key={i}
                                    className={cn(
                                      "border-b hover:bg-gray-50",
                                      i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                    )}
                                  >
                                    {row.map((cell, j) => (
                                      <td key={j} className="px-4 py-2">
                                        {cell === null ? (
                                          <span className="text-gray-400 italic">
                                            NULL
                                          </span>
                                        ) : (
                                          String(cell)
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-4 text-center text-gray-500">
                              No results to display
                            </div>
                          )}
                        </ScrollArea>
                        {result.rowsAffected !== undefined && (
                          <div className="bg-gray-50 px-4 py-2 border-t text-sm text-gray-600">
                            Rows affected: {result.rowsAffected}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          {/* Database Schema */}
          {/* <div className="space-y-6"> */}
          {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tables.length > 0 ? (
                  <div className="space-y-2">
                    {tables.map((table) => (
                      <Button
                        key={table}
                        variant={selectedTable === table ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => loadTableSchema(table)}
                      >
                        <Table className="h-4 w-4 mr-2" />
                        {table}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tables found</p>
                )}
              </CardContent>
            </Card> */}

          {/* Table Schema */}
          {/* {tableSchema && selectedTable && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedTable} Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {tableSchema.values.map((row, i) => (
                        <div key={i} className="text-xs">
                          <div className="font-medium">{row[1]}</div>
                          <div className="text-gray-500">
                            {row[2]} {row[3] === 1 && '(NOT NULL)'} {row[5] === 1 && '(PK)'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )} */}

          {/* Sample Queries */}
          {/* <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="beginner" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="beginner" className="text-xs">Basic</TabsTrigger>
                    <TabsTrigger value="intermediate" className="text-xs">Inter</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">Adv</TabsTrigger>
                  </TabsList>
                  {Object.entries(SAMPLE_QUERIES).map(([level, queries]) => (
                    <TabsContent key={level} value={level} className="space-y-2 mt-4">
                      {queries.map((queryText, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          className="w-full text-left text-xs p-2 h-auto font-mono"
                          onClick={() => insertSampleQuery(queryText)}
                        >
                          <Plus className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="truncate">{queryText}</span>
                        </Button>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card> */}
          {/* </div> */}
        </div>
      </div>
    </div>
  );
}