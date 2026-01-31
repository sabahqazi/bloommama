-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table to store health document sources (URLs to scrape)
CREATE TABLE public.health_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  source_type TEXT DEFAULT 'url',
  status TEXT DEFAULT 'pending',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store document chunks with embeddings
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.health_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index on document_id for faster lookups
CREATE INDEX idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Enable RLS on both tables
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Public read access for documents (so AI can query)
CREATE POLICY "Anyone can read health documents"
ON public.health_documents
FOR SELECT
USING (true);

-- Public read access for chunks (so AI can search)
CREATE POLICY "Anyone can read document chunks"
ON public.document_chunks
FOR SELECT
USING (true);

-- Allow all operations from edge functions (service role bypasses RLS anyway)
CREATE POLICY "Service role can manage health documents"
ON public.health_documents
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage document chunks"
ON public.document_chunks
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to search similar document chunks
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_health_documents_updated_at
BEFORE UPDATE ON public.health_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();