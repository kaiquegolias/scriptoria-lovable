import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documents, source = "wiki_pen" } = await req.json();
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "documents array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare documents for insertion
    const docsToInsert = documents.map((doc: any) => ({
      title: doc.title || "Sem título",
      content: doc.content || "",
      source: source,
      category: doc.category || null,
      keywords: doc.keywords || [],
    }));

    // Insert documents in batches of 50
    const batchSize = 50;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < docsToInsert.length; i += batchSize) {
      const batch = docsToInsert.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("kb_documents")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        insertedCount += (data?.length || 0);
      }
    }

    console.log(`Imported ${insertedCount} documents to kb_documents`);

    return new Response(
      JSON.stringify({
        success: true,
        insertedCount,
        totalSubmitted: documents.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in import-kb-content function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
