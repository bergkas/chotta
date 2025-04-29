// supabase/functions/updateRates/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Eure gewünschten Währungen
    const currencies = [
      "EUR","USD","PLN","GBP","CHF",
      "CZK","HUF","SEK","NOK","DKK"
    ];

    for (const base of currencies) {
      // gleich nur die relevanten Ziele abrufen
      const toList = currencies.filter(c => c !== base).join(",");
      const resp = await fetch(
        `https://api.frankfurter.app/latest?from=${base}&to=${toList}`
      );
      if (!resp.ok) {
        console.error(`Frankfurter API Error ${resp.status} for base ${base}`);
        continue;
      }
      const { rates } = await resp.json() as { rates: Record<string, number> };

      // nur die gewünschten Paare upserten
      for (const [target, rate] of Object.entries(rates)) {
        const { error } = await supa
          .from("currency_rates")
          .upsert({
            base_currency:   base,
            target_currency: target,
            rate,
            updated_at:      new Date().toISOString()
          });
        if (error) console.error(`Upsert failed for ${base}→${target}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ status: "ok", updated: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
