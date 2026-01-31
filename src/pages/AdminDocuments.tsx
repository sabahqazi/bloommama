import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, FileText, ExternalLink, RefreshCw } from "lucide-react";

interface HealthDocument {
  id: string;
  url: string;
  title: string | null;
  status: string;
  last_scraped_at: string | null;
  created_at: string;
}

const AdminDocuments = () => {
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setIsIngesting('new');
    
    try {
      const { data, error } = await supabase.functions.invoke('ingest-document', {
        body: { url: newUrl.trim() }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Document "${data.title}" ingested with ${data.chunksCreated} chunks`,
      });
      
      setNewUrl('');
      fetchDocuments();
    } catch (error: any) {
      console.error('Ingestion error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to ingest document",
        variant: "destructive",
      });
    } finally {
      setIsIngesting(null);
    }
  };

  const handleReIngest = async (doc: HealthDocument) => {
    setIsIngesting(doc.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('ingest-document', {
        body: { url: doc.url }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Document re-ingested with ${data.chunksCreated} chunks`,
      });
      
      fetchDocuments();
    } catch (error: any) {
      console.error('Re-ingestion error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to re-ingest document",
        variant: "destructive",
      });
    } finally {
      setIsIngesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('health_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted",
      });
      
      fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Health Knowledge Base
          </h1>
          <p className="text-gray-600">
            Add verified health resource URLs to train the AI assistant with evidence-based information.
          </p>
        </div>

        {/* Add New Document */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Health Resource
            </CardTitle>
            <CardDescription>
              Enter a URL to a certified health paper or verified maternal health resource.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDocument} className="flex gap-4">
              <Input
                type="url"
                placeholder="https://example.com/health-article"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1"
                disabled={isIngesting !== null}
              />
              <Button type="submit" disabled={isIngesting !== null}>
                {isIngesting === 'new' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add & Ingest
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ingested Documents ({documents.length})
              </span>
              <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents ingested yet.</p>
                <p className="text-sm">Add your first health resource URL above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {doc.title || 'Untitled Document'}
                      </h3>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate"
                      >
                        {doc.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      <p className="text-xs text-gray-500 mt-1">
                        {doc.last_scraped_at
                          ? `Last updated: ${new Date(doc.last_scraped_at).toLocaleDateString()}`
                          : `Added: ${new Date(doc.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {getStatusBadge(doc.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReIngest(doc)}
                        disabled={isIngesting !== null}
                      >
                        {isIngesting === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <a href="/" className="text-pink-600 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDocuments;
