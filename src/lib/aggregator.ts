import { RawPricingRow, AggregatedProduct, VariantDetail, AnomalyType, ClientKpi } from "./types";

/**
 * Standard size ordering for sorting and finding base size
 */
const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL"];

function getSizeRank(size: string): number {
  const clean = size.toUpperCase().trim();
  const idx = SIZE_ORDER.indexOf(clean);
  return idx !== -1 ? idx : 99;
}

export function calculateDiscount(bexioPrice: number, discountedPrice: number): { discountCHF: number; discountPercent: number } {
  const discountCHF = Number((bexioPrice - discountedPrice).toFixed(2));
  let discountPercent = 0;
  if (bexioPrice > 0) {
    discountPercent = Number((((bexioPrice - discountedPrice) / bexioPrice) * 100).toFixed(2));
  }
  return { discountCHF, discountPercent };
}

export function detectAnomaly(bexioPrice: number, discountedPrice: number, discountPercent: number): { anomalyType: AnomalyType; description?: string } {
  if (discountedPrice > bexioPrice + 0.01) {
    return {
      anomalyType: "negative_discount",
      description: "Negativer Rabatt: Kundenpreis liegt über dem Bexio-Listenpreis."
    };
  }
  if (Math.abs(discountedPrice - bexioPrice) <= 0.01) {
    return {
      anomalyType: "zero_discount",
      description: "Nullrabatt: Kunde bezahlt den regulären Bexio-Katalogpreis ohne Nachlass."
    };
  }
  if (discountPercent >= 99.9) {
    return {
      anomalyType: "extreme_discount",
      description: "100% Rabatt (Gratisartikel / Nullpreis)."
    };
  }
  if (discountPercent > 50.0) {
    return {
      anomalyType: "extreme_discount",
      description: `Extremer Rabatt: ${discountPercent.toFixed(1)}% Preisnachlass (> 50%).`
    };
  }
  return { anomalyType: "none" };
}

/**
 * Aggregates raw 55k+ pricing rows by Client + Product Name
 */
export function aggregateRawPricing(rows: RawPricingRow[]): AggregatedProduct[] {
  const groupMap = new Map<string, RawPricingRow[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = `${row.client.trim()}:::${row.productName.trim()}`;
    let list = groupMap.get(key);
    if (!list) {
      list = [];
      groupMap.set(key, list);
    }
    list.push(row);
  }

  const result: AggregatedProduct[] = [];

  groupMap.forEach((groupRows, key) => {
    const [client, productName] = key.split(":::");
    const variantCount = groupRows.length;

    // Collect distinct sizes and colours
    const sizeSet = new Set<string>();
    const colourSet = new Set<string>();

    const variants: VariantDetail[] = groupRows.map((r) => {
      const { discountCHF, discountPercent } = calculateDiscount(r.bexioPrice, r.discountedPrice);
      sizeSet.add(r.size.trim());
      colourSet.add(r.colour.trim());
      return {
        articleId: r.articleId,
        productCode: r.productCode,
        colour: r.colour.trim(),
        size: r.size.trim(),
        bexioPrice: r.bexioPrice,
        discountedPrice: r.discountedPrice,
        discountCHF,
        discountPercent,
        platformPriceInclVat: r.platformPriceInclVat,
        discountType: r.discountType
      };
    });

    // Sort variants by size rank, then color
    variants.sort((a, b) => {
      const rankDiff = getSizeRank(a.size) - getSizeRank(b.size);
      if (rankDiff !== 0) return rankDiff;
      return a.colour.localeCompare(b.colour);
    });

    // Check for varying prices (Grössenaufschläge)
    const distinctPrices = Array.from(new Set(variants.map((v) => Number(v.discountedPrice.toFixed(2)))));
    const hasVaryingPrices = distinctPrices.length > 1;
    const minDiscountedPrice = Math.min(...distinctPrices);
    const maxDiscountedPrice = Math.max(...distinctPrices);

    // Identify base variant (prefer size M or L, or minimum price)
    let baseVariant = variants.find((v) => ["M", "L"].includes(v.size.toUpperCase().trim()));
    if (!baseVariant) {
      baseVariant = variants.reduce((prev, curr) => (curr.discountedPrice < prev.discountedPrice ? curr : prev), variants[0]);
    }

    const baseBexioPrice = baseVariant.bexioPrice;
    const baseDiscountedPrice = baseVariant.discountedPrice;
    const { discountCHF: baseDiscountCHF, discountPercent: baseDiscountPercent } = calculateDiscount(baseBexioPrice, baseDiscountedPrice);

    // Check anomaly on base or overall
    const { anomalyType, description: anomalyDescription } = detectAnomaly(baseBexioPrice, baseDiscountedPrice, baseDiscountPercent);

    // Format varying price description if applicable
    let priceVariationsDescription = undefined;
    if (hasVaryingPrices) {
      // Group sizes by price
      const priceToSizes = new Map<number, string[]>();
      variants.forEach((v) => {
        const p = Number(v.discountedPrice.toFixed(2));
        if (!priceToSizes.has(p)) priceToSizes.set(p, []);
        if (!priceToSizes.get(p)!.includes(v.size)) {
          priceToSizes.get(p)!.push(v.size);
        }
      });
      const parts: string[] = [];
      priceToSizes.forEach((sizes, price) => {
        parts.push(`${sizes.join(", ")}: CHF ${price.toFixed(2)}`);
      });
      priceVariationsDescription = parts.join(" | ");
    }

    const sortedSizes = Array.from(sizeSet).sort((a, b) => getSizeRank(a) - getSizeRank(b));
    const sortedColours = Array.from(colourSet).sort();

    result.push({
      id: key,
      clientId: groupRows[0]?.clientId,
      client,
      productName,
      variantCount,
      sizes: sortedSizes,
      colours: sortedColours,
      baseBexioPrice,
      baseDiscountedPrice,
      baseDiscountCHF,
      baseDiscountPercent,
      hasVaryingPrices,
      minDiscountedPrice,
      maxDiscountedPrice,
      priceVariationsDescription,
      anomalyType,
      anomalyDescription,
      variants
    });
  });

  // Sort aggregated products by client, then productName
  return result.sort((a, b) => {
    const c = a.client.localeCompare(b.client);
    if (c !== 0) return c;
    return a.productName.localeCompare(b.productName);
  });
}

/**
 * Calculates client-level KPIs from aggregated products
 */
export function calculateClientKpis(products: AggregatedProduct[]): Map<string, ClientKpi> {
  const kpiMap = new Map<string, ClientKpi>();

  products.forEach((prod) => {
    let kpi = kpiMap.get(prod.client);
    if (!kpi) {
      kpi = {
        client: prod.client,
        productCount: 0,
        totalVariants: 0,
        avgDiscountPercent: 0,
        maxDiscountPercent: -Infinity,
        minDiscountPercent: Infinity,
        anomalyCount: 0,
        negativeDiscountCount: 0,
        zeroDiscountCount: 0,
        extremeDiscountCount: 0,
        varyingPricesProductCount: 0
      };
      kpiMap.set(prod.client, kpi);
    }

    kpi.productCount += 1;
    kpi.totalVariants += prod.variantCount;

    if (prod.baseDiscountPercent > kpi.maxDiscountPercent) {
      kpi.maxDiscountPercent = prod.baseDiscountPercent;
    }
    if (prod.baseDiscountPercent < kpi.minDiscountPercent) {
      kpi.minDiscountPercent = prod.baseDiscountPercent;
    }

    if (prod.anomalyType !== "none") {
      kpi.anomalyCount += 1;
      if (prod.anomalyType === "negative_discount") kpi.negativeDiscountCount += 1;
      if (prod.anomalyType === "zero_discount") kpi.zeroDiscountCount += 1;
      if (prod.anomalyType === "extreme_discount") kpi.extremeDiscountCount += 1;
    }

    if (prod.hasVaryingPrices) {
      kpi.varyingPricesProductCount += 1;
    }
  });

  // Compute averages
  kpiMap.forEach((kpi, clientName) => {
    const clientProducts = products.filter((p) => p.client === clientName);
    if (clientProducts.length > 0) {
      const sumDiscount = clientProducts.reduce((acc, p) => acc + p.baseDiscountPercent, 0);
      kpi.avgDiscountPercent = Number((sumDiscount / clientProducts.length).toFixed(1));
    }
    if (kpi.maxDiscountPercent === -Infinity) kpi.maxDiscountPercent = 0;
    if (kpi.minDiscountPercent === Infinity) kpi.minDiscountPercent = 0;
  });

  return kpiMap;
}
