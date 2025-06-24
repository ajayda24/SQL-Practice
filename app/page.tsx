"use client";

import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Settings, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { DatabaseStorage } from '@/lib/storage';
import { Database as DatabaseType } from '@/lib/sqlDb';
import Link from 'next/link';

export default function Home() {
  const [databases, setDatabases] = useState<DatabaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDbName, setNewDbName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const storage = DatabaseStorage.getInstance();

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const dbs = await storage.getAllDatabases();
      setDatabases(dbs);
    } catch (error) {
      toast.error('Failed to load databases');
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewDatabase = async () => {
    if (!newDbName.trim()) {
      toast.error('Please enter a database name');
      return;
    }

    try {
      setIsCreating(true);
      const id = `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newDb: DatabaseType = {
        id,
        name: newDbName.trim(),
        data: new Uint8Array(0), // Empty database
        createdAt: new Date(),
        lastModified: new Date()
      };

      await storage.saveDatabase(newDb);
      await loadDatabases();
      setNewDbName('');
      setCreateDialogOpen(false);
      toast.success(`Database "${newDb.name}" created successfully`);
    } catch (error) {
      toast.error('Failed to create database');
      console.error('Create error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteDatabase = async (id: string, name: string) => {
    try {
      await storage.deleteDatabase(id);
      await loadDatabases();
      toast.success(`Database "${name}" deleted`);
    } catch (error) {
      toast.error('Failed to delete database');
      console.error('Delete error:', error);
    }
  };

  const exportDatabase = async (db: DatabaseType) => {
    try {
      const blob = await storage.exportDatabase(db.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${db.name}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Database "${db.name}" exported`);
      }
    } catch (error) {
      toast.error('Failed to export database');
      console.error('Export error:', error);
    }
  };

  const importDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedDb = await storage.importDatabase(file);
      await storage.saveDatabase(importedDb);
      await loadDatabases();
      toast.success(`Database "${importedDb.name}" imported successfully`);
    } catch (error) {
      toast.error('Failed to import database');
      console.error('Import error:', error);
    }
    
    // Reset the input
    event.target.value = '';
  };

  const filteredDatabases = databases.filter(db =>
    db.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      // year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg">
              <Database className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SQL Practice
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Practice SQL queries offline. Create databases, run queries, and
            learn SQL on your mobile device.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search databases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  New DB
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90%] rounded-md">
                <DialogHeader>
                  <DialogTitle>Create New Database</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new SQL database.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Database name"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && createNewDatabase()}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={createNewDatabase}
                      disabled={isCreating || !newDbName.trim()}
                      className="flex-1"
                    >
                      {isCreating ? "Creating..." : "Create Database"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* upload db file */}
            {/* <label className="cursor-pointer">
              <Button variant="outline" size="icon" asChild>
                <div>
                  <Upload className="h-4 w-4" />
                </div>
              </Button>
              <input
                type="file"
                accept=".sqlite,.db,.sqlite3"
                onChange={importDatabase}
                className="hidden"
              />
            </label> */}
          </div>
        </div>

        {/* Database List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDatabases.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No databases found" : "No databases yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? `No databases match "${searchTerm}"`
                  : "Create your first database to start practicing SQL queries"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Database
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatabases.map((db) => (
              <Card
                key={db.id}
                className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg truncate">{db.name}</CardTitle>
                  <CardDescription>
                    {/* Created: {formatDate(db.createdAt)} */}
                    {/* <br /> */}
                    Modified: {formatDate(db.lastModified)}
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-6'>
                  <div className="flex gap-4 justify-between">
                    <Button asChild className="flex-1">
                      <Link href={`/editor?db=${db.id}`}>Open Editor</Link>
                    </Button>

                    {/* Download / Export database */}
                    {/* <Button
                      variant="outline"
                      size="icon"
                      onClick={() => exportDatabase(db)}
                      title="Export database"
                    >
                      <Download className="h-4 w-4" />
                    </Button> */}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[90%] rounded-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Database</AlertDialogTitle>
                          <AlertDialogDescription>
                            {`Are you sure you want to delete "${db.name}"? This action cannot be undone.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDatabase(db.id, db.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            SQL Practice - Learn SQL offline on any device
          </p>
        </div>
      </div>
    </div>
  );
}