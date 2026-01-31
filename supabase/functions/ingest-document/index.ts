import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Split text into chunks with overlap
function splitIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = end - overlap;
    if (start < 0) start = 0;
    if (end >= text.length) break;
  }
  
  return chunks;
}

// Generate embeddings using Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  // Use a simple approach - we'll use the AI to create a vector representation
  // For production, you'd want a dedicated embedding model
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Limit input length
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Embedding error:', response.status, errorText);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Scraping URL:', url);

    // Step 1: Scrape the URL using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      throw new Error(`Failed to scrape URL: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    const content = scrapeData.data?.markdown || scrapeData.markdown;
    const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || url;

    if (!content) {
      throw new Error('No content extracted from URL');
    }

    console.log('Scraped content length:', content.length);

    // Step 2: Create or update the document record
    const { data: document, error: docError } = await supabase
      .from('health_documents')
      .upsert({
        url,
        title,
        status: 'processing',
        last_scraped_at: new Date().toISOString(),
      }, { onConflict: 'url' })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    console.log('Document created:', document.id);

    // Step 3: Delete existing chunks for this document
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', document.id);

    // Step 4: Split content into chunks
    const chunks = splitIntoChunks(content);
    console.log('Created', chunks.length, 'chunks');

    // Step 5: Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        const embedding = await generateEmbedding(chunks[i], LOVABLE_API_KEY);
        
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: document.id,
            content: chunks[i],
            embedding: embedding,
            chunk_index: i,
          });

        if (chunkError) {
          console.error('Chunk insert error:', chunkError);
        }
      } catch (embeddingError) {
        console.error(`Failed to process chunk ${i}:`, embeddingError);
        // Continue with other chunks
      }
    }

    // Step 6: Update document status
    await supabase
      .from('health_documents')
      .update({ status: 'completed' })
      .eq('id', document.id);

    console.log('Document ingestion complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId: document.id,
        title,
        chunksCreated: chunks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to ingest document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
