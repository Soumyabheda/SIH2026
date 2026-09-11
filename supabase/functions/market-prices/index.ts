const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const crop = url.searchParams.get("crop") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const apiKey = Deno.env.get("AGMARKNET_API_KEY");

    if (apiKey) {
      const params = new URLSearchParams({
        "api-key": apiKey,
        format: "json",
        limit: "100",
        offset: "0",
      });
      if (crop) params.set("filters[commodity]", crop);
      if (state) params.set("filters[state]", state);

      const response = await fetch(`https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?${params}`);
      if (!response.ok) {
        throw new Error(`Market data provider returned ${response.status}`);
      }
      const data: unknown = await response.json();
      return new Response(JSON.stringify({ source: "Agmarknet", data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      source: "CropXChange database",
      message: "Showing the latest available market records",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch market prices";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
