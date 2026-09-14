import { AggregatedProduct, SimulationRule, SimulationResultSummary, VariantDetail } from "./types";

/**
 * Applies active simulation rules to an aggregated product or variant.
 * Supports rule chaining in standard order:
 * 1. Gross price adjustment (shifts baseline)
 * 2. Flat percentage price increase
 * 3. Discount cap (clamps max discount against Bexio price)
 */
export function simulateItemPrice(
  bexioPrice: number,
  currentPrice: number,
  client: string,
  productName: string,
  rules: SimulationRule[],
  manualOverridePrice?: number
): {
  newPrice: number;
  newBexioPrice: number;
  deltaCHF: number;
  deltaPercent: number;
  newDiscountPercent: number;
} {
  // If user provided a manual override, that takes absolute precedence
  if (manualOverridePrice !== undefined && manualOverridePrice !== null && !isNaN(manualOverridePrice)) {
    const newPrice = Number(manualOverridePrice.toFixed(2));
    const deltaCHF = Number((newPrice - currentPrice).toFixed(2));
    const deltaPercent = currentPrice > 0 ? Number((((newPrice - currentPrice) / currentPrice) * 100).toFixed(2)) : 0;
    const newDiscountPercent = bexioPrice > 0 ? Number((((bexioPrice - newPrice) / bexioPrice) * 100).toFixed(2)) : 0;
    return {
      newPrice,
      newBexioPrice: bexioPrice,
      deltaCHF,
      deltaPercent,
      newDiscountPercent
    };
  }

  let calculatedPrice = currentPrice;
  let simulatedBexioPrice = bexioPrice;

  // Filter rules matching scope
  const applicableRules = rules.filter((r) => {
    if (!r.enabled) return false;
    if (r.clientScope && r.clientScope !== "" && r.clientScope !== client) return false;
    if (r.productScope && r.productScope !== "" && !productName.toLowerCase().includes(r.productScope.toLowerCase())) return false;
    return true;
  });

  // 1. Gross Bexio adjustment rule
  const grossRule = applicableRules.find((r) => r.type === "gross_bexio_adjustment");
  if (grossRule && grossRule.bexioPriceIncreasePercent !== undefined) {
    const grossMultiplier = 1 + grossRule.bexioPriceIncreasePercent / 100;
    simulatedBexioPrice = Number((bexioPrice * grossMultiplier).toFixed(2));
    // Maintain existing discount percentage
    const currentDiscountPercent = bexioPrice > 0 ? ((bexioPrice - currentPrice) / bexioPrice) * 100 : 0;
    calculatedPrice = Number((simulatedBexioPrice * (1 - currentDiscountPercent / 100)).toFixed(2));
  }

  // 2. Percentage increase on client price
  const percentRule = applicableRules.find((r) => r.type === "percentage_increase");
  if (percentRule && percentRule.priceIncreasePercent !== undefined) {
    const increaseMultiplier = 1 + percentRule.priceIncreasePercent / 100;
    calculatedPrice = Number((calculatedPrice * increaseMultiplier).toFixed(2));
  }

  // 3. Discount cap rule (clamp discount to max allowed percentage)
  const capRule = applicableRules.find((r) => r.type === "discount_cap");
  if (capRule && capRule.maxDiscountPercent !== undefined) {
    const maxCap = capRule.maxDiscountPercent;
    const minimumAllowedPrice = Number((simulatedBexioPrice * (1 - maxCap / 100)).toFixed(2));
    // If current price gives higher discount than cap, increase price to cap level
    if (calculatedPrice < minimumAllowedPrice) {
      calculatedPrice = minimumAllowedPrice;
    }
  }

  const finalPrice = Math.max(0, Number(calculatedPrice.toFixed(2)));
  const deltaCHF = Number((finalPrice - currentPrice).toFixed(2));
  const deltaPercent = currentPrice > 0 ? Number((((finalPrice - currentPrice) / currentPrice) * 100).toFixed(2)) : 0;
  const newDiscountPercent = simulatedBexioPrice > 0 ? Number((((simulatedBexioPrice - finalPrice) / simulatedBexioPrice) * 100).toFixed(2)) : 0;

  return {
    newPrice: finalPrice,
    newBexioPrice: simulatedBexioPrice,
    deltaCHF,
    deltaPercent,
    newDiscountPercent
  };
}

/**
 * Calculates updated simulation for all products and variants
 */
export function applySimulation(
  products: AggregatedProduct[],
  rules: SimulationRule[],
  manualOverrides: Record<string, number> = {} // keyed by item id or variant code
): {
  simulatedProducts: AggregatedProduct[];
  summary: SimulationResultSummary;
} {
  let oldRevenueVolume = 0;
  let newRevenueVolume = 0;
  let totalDeltaCHF = 0;
  let affectedCount = 0;

  const simulatedProducts = products.map((prod) => {
    // 1. Simulate variants
    const simulatedVariants: VariantDetail[] = prod.variants.map((v) => {
      const override = manualOverrides[v.productCode];
      const res = simulateItemPrice(v.bexioPrice, v.discountedPrice, prod.client, prod.productName, rules, override);
      return {
        ...v,
        bexioPrice: res.newBexioPrice,
        newPrice: res.newPrice,
        isManualOverride: override !== undefined
      };
    });

    // 2. Base product simulation
    const productOverride = manualOverrides[prod.id];
    const baseSim = simulateItemPrice(
      prod.baseBexioPrice,
      prod.baseDiscountedPrice,
      prod.client,
      prod.productName,
      rules,
      productOverride
    );

    const isChanged = Math.abs(baseSim.deltaCHF) > 0.001 || simulatedVariants.some((v) => v.newPrice !== v.discountedPrice);
    if (isChanged) {
      affectedCount++;
    }

    oldRevenueVolume += prod.baseDiscountedPrice;
    newRevenueVolume += baseSim.newPrice;
    totalDeltaCHF += baseSim.deltaCHF;

    return {
      ...prod,
      variants: simulatedVariants,
      simulatedPrice: baseSim.newPrice,
      simulatedDeltaCHF: baseSim.deltaCHF,
      simulatedDeltaPercent: baseSim.deltaPercent,
      isManualOverride: productOverride !== undefined
    };
  });

  const averageDeltaPercent =
    oldRevenueVolume > 0 ? Number((((newRevenueVolume - oldRevenueVolume) / oldRevenueVolume) * 100).toFixed(2)) : 0;

  return {
    simulatedProducts,
    summary: {
      totalProductsAffected: affectedCount,
      oldRevenueVolume: Number(oldRevenueVolume.toFixed(2)),
      newRevenueVolume: Number(newRevenueVolume.toFixed(2)),
      totalDeltaCHF: Number(totalDeltaCHF.toFixed(2)),
      averageDeltaPercent
    }
  };
}
