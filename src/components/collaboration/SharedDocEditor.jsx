import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export default function SharedDocEditor({ roomId, userId, userName }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (selectedDoc) {
      setTitle(selectedDoc.title);
      setContent(selectedDoc.content || '');
    }
  }, [selectedDoc]);

  const loadDocuments = async () => {
    const docs = await base44.entities.SharedDocument.filter({ room_id: roomId });
    setDocuments(docs.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)));
  };

  const createDocument = async () => {
    if (!title.trim()) return;
    
    const newDoc = await base44.entities.SharedDocument.create({
      room_id: roomId,
      title: title.trim(),
      content: '',
      last_edited_by: userId,
      last_edited_at: new Date().toISOString()
    });
    
    await loadDocuments();
    setSelectedDoc(newDoc);
    setIsCreating(false);
    setTitle('');
  };

  const saveDocument = async () => {
    if (!selectedDoc) return;
    
    setIsSaving(true);
    await base44.entities.SharedDocument.update(selectedDoc.id, {
      content,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString()
    });
    
    await loadDocuments();
    setIsSaving(false);
  };

  const deleteDocument = async (docId) => {
    await base44.entities.SharedDocument.delete(docId);
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
      setContent('');
    }
    await loadDocuments();
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="grid md:grid-cols-3 divide-x divide-zinc-800">
        {/* Document List */}
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="h-7"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {isCreating && (
            <div className="space-y-2 p-2 bg-zinc-800/50 rounded">
              <Input
                placeholder="Document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && createDocument()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createDocument} className="h-7 flex-1">
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCreating(false)} className="h-7">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              whileHover={{ scale: 1.02 }}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedDoc?.id === doc.id
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-zinc-800/30 hover:bg-zinc-800/50'
              }`}
              onClick={() => setSelectedDoc(doc)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-zinc-100 truncate">{doc.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                  }}
                  className="h-5 w-5 p-0 text-zinc-500 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {doc.last_edited_at && (
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDistanceToNow(new Date(doc.last_edited_at), { addSuffix: true })}
                </p>
              )}
            </motion.div>
          ))}

          {documents.length === 0 && !isCreating && (
            <div className="text-center py-8 text-zinc-600">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No documents yet</p>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="md:col-span-2 p-4">
          {selectedDoc ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-100">{selectedDoc.title}</h3>
                <Button
                  size="sm"
                  onClick={saveDocument}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your document..."
                className="min-h-[400px] bg-zinc-800/50 border-zinc-700 text-zinc-100 font-mono text-sm"
              />
              
              {selectedDoc.last_edited_at && (
                <p className="text-xs text-zinc-500">
                  Last edited {formatDistanceToNow(new Date(selectedDoc.last_edited_at), { addSuffix: true })}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a document to edit</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}