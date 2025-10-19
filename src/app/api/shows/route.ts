import { NextRequest } from "next/server";
import { listShows, listTheatres, getTheatrePricing, getSeatTemplate, listPricingTiers } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const dateKey = searchParams.get("date");
  const theatreId = searchParams.get("theatreId");
  const includeSeatMaps = searchParams.get("includeSeatMaps") === 'true';
  const includePricing = searchParams.get("includePricing") === 'true';
  
  const shows = await (listShows as any)({ movieId: movieId || undefined, dateKey: dateKey || undefined, publishedOnly: true });
  const theatres = await (listTheatres as any)();
  const theatreMap = Object.fromEntries(theatres.map((t: any) => [t.id, t.name]));
  
  // Get pricing tiers for enhanced pricing
  const pricingTiers = includePricing ? await (listPricingTiers as any)() : [];
  
  const enhancedShows = [];
  
  for (const s of shows) {
    // Filter by theatre if specified
    if (theatreId && s.theatreId !== theatreId) continue;
    
    let enhancedShow: any = {
      id: s.id,
      movieId: s.movieId,
      theatreId: s.theatreId,
      theatreName: theatreMap[s.theatreId] || s.theatreId,
      dateKey: s.dateKey,
      time: s.time,
      format: s.format || undefined,
      language: s.language || undefined,
      prices: safeParseJSON<Record<string, number>>(s.prices, {}),
      tag: s.language || s.format || undefined,
    };
    
    // Add seat template if requested
    if (includeSeatMaps) {
      const seatTemplate = await (getSeatTemplate as any)(s.theatreId);
      if (seatTemplate) {
        enhancedShow.seatTemplate = {
          id: seatTemplate.id,
          name: seatTemplate.name,
          layout: safeParseJSON(seatTemplate.layout, null),
          totalSeats: seatTemplate.totalSeats,
          tierCounts: {
            NORMAL: seatTemplate.normalSeats,
            EXECUTIVE: seatTemplate.executiveSeats,
            PREMIUM: seatTemplate.premiumSeats,
            VIP: seatTemplate.vipSeats
          }
        };
      }
    }
    
    // Add enhanced pricing if requested
    if (includePricing) {
      const theatrePricing = await (getTheatrePricing as any)(s.theatreId);
      if (theatrePricing.length > 0) {
        enhancedShow.pricingTiers = theatrePricing.map(tp => {
          const tier = pricingTiers.find(pt => pt.id === tp.pricingTierId);
          return {
            tierId: tp.pricingTierId,
            tierName: tier?.name || 'Standard',
            basePrices: {
              NORMAL: tp.normalPrice,
              EXECUTIVE: tp.executivePrice,
              PREMIUM: tp.premiumPrice,
              VIP: tp.vipPrice
            },
            multipliers: tier ? {
              base: tier.baseMultiplier,
              weekend: tier.weekendMultiplier,
              holiday: tier.holidayMultiplier
            } : { base: 1.0, weekend: 1.2, holiday: 1.5 }
          };
        });
      }
    }
    
    enhancedShows.push(enhancedShow);
  }
  
  return Response.json({ 
    shows: enhancedShows,
    metadata: {
      total: enhancedShows.length,
      filters: { movieId, dateKey, theatreId },
      features: { seatMaps: includeSeatMaps, pricing: includePricing }
    }
  });
}

function safeParseJSON<T>(s: string, d: T): T { try { return JSON.parse(s) as T; } catch { return d; } }
