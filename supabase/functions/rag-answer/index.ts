import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate embeddings using Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
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
    const { question } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Processing question:', question);

    // Step 1: Generate embedding for the question
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(question, LOVABLE_API_KEY);
    } catch (embeddingError) {
      console.error('Embedding generation failed, falling back to general response');
      // If embedding fails, continue without RAG context
      queryEmbedding = [];
    }

    // Step 2: Search for relevant document chunks
    let relevantContext = '';
    let sources: string[] = [];
    
    if (queryEmbedding.length > 0) {
      const { data: matches, error: matchError } = await supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: 5,
        });

      if (matchError) {
        console.error('Match error:', matchError);
      } else if (matches && matches.length > 0) {
        console.log('Found', matches.length, 'relevant chunks');
        
        // Get document titles for sources
        const documentIds = [...new Set(matches.map((m: any) => m.document_id))];
        const { data: documents } = await supabase
          .from('health_documents')
          .select('id, title, url')
          .in('id', documentIds);

        const docMap = new Map(documents?.map((d: any) => [d.id, d]) || []);
        
        relevantContext = matches
          .map((m: any) => m.content)
          .join('\n\n---\n\n');
          
        sources = matches
          .map((m: any) => docMap.get(m.document_id)?.title || 'Unknown source')
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
      }
    }

    // Step 3: Generate answer using AI with RAG context
    const systemPrompt = relevantContext 
      ? `You are a compassionate and knowledgeable postpartum support assistant for Bloom Mama. 
Your role is to provide empathetic, evidence-based answers to questions about postpartum recovery, baby care, and motherhood.

IMPORTANT: Base your answers primarily on the following verified health information from certified sources:

---
${relevantContext}
---

Guidelines:
- Always start your responses with understanding and validation of the mother's feelings
- Provide clear, practical advice based on the verified information above
- If the question is not covered by the provided context, acknowledge that and still provide helpful general guidance
- Encourage mothers to consult healthcare providers for medical concerns
- Keep responses warm, supportive, and around 100-150 words
- When possible, reference the source material in your response`
      : `You are a compassionate and knowledgeable postpartum support assistant for Bloom Mama. 
Your role is to provide empathetic, evidence-based answers to questions about postpartum recovery, baby care, and motherhood.
Always start your responses with understanding and validation of the mother's feelings.
Provide clear, practical advice while encouraging mothers to consult healthcare providers for medical concerns.
Keep responses warm, supportive, and around 100-150 words.`;

    console.log('Calling AI with context length:', relevantContext.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to get response from AI');
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer received from AI');
    }

    console.log('AI response received, sources:', sources.length);

    return new Response(
      JSON.stringify({ 
        answer,
        sources: sources.length > 0 ? sources : undefined,
        hasRagContext: relevantContext.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RAG answer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
