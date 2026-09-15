export interface RawPricingRow {
  clientId?: string;
  client: string;
  articleId?: string;
  productCode: string;
  productName: string;
  colour: string;
  size: string;
  bexioPrice: number;
  discountType: string;
  discountedPrice: number;
  platformPriceInclVat: number;
}

export type AnomalyType = "none" | "negative_discount" | "zero_discount" | "extreme_discount";

export interface VariantDetail {
  articleId?: string;
  productCode: string;
  colour: string;
  size: string;
  bexioPrice: number;
  discountedPrice: number;
  discountCHF: number;
  discountPercent: number;
  platformPriceInclVat: number;
  discountType: string;
  newPrice?: number;
  isManualOverride?: boolean;
}

export interface AggregatedProduct {
  id: string; // client + ':::' + productName
  clientId?: string;
  client: string;
  productName: string;
  category?: string; // e.g. "Poloshirts", "Jacken", "Hosen"
  variantCount: number;
  sizes: string[];
  colours: string[];
  
  // Base reference pricing (typically Size M/L or minimum base price)
  baseBexioPrice: number;
  baseDiscountedPrice: number;
  baseDiscountCHF: number;
  baseDiscountPercent: number;

  // Surcharges detection
  hasVaryingPrices: boolean;
  minDiscountedPrice: number;
  maxDiscountedPrice: number;
  priceVariationsDescription?: string;

  // Anomalies
  anomalyType: AnomalyType;
  anomalyDescription?: string;

  // Full variants list for drill-down and printing
  variants: VariantDetail[];

  // Simulation values (on aggregated level or calculated from variants)
  simulatedPrice?: number;
  simulatedDeltaCHF?: number;
  simulatedDeltaPercent?: number;
  isManualOverride?: boolean;
}

export interface ClientKpi {
  client: string;
  productCount: number;
  totalVariants: number;
  avgDiscountPercent: number;
  maxDiscountPercent: number;
  minDiscountPercent: number;
  anomalyCount: number;
  negativeDiscountCount: number;
  zeroDiscountCount: number;
  extremeDiscountCount: number;
  varyingPricesProductCount: number;
}

export interface SimulationRule {
  id: string;
  type: "discount_cap" | "percentage_increase" | "gross_bexio_adjustment";
  name: string;
  enabled: boolean;
  
  // Scopes: all or specific clients/products
  clientScope?: string; // empty means all clients
  productScope?: string; // empty means all products
  
  // Parameters
  maxDiscountPercent?: number; // e.g. 20 (%)
  priceIncreasePercent?: number; // e.g. 4.5 (%)
  bexioPriceIncreasePercent?: number; // e.g. 5.0 (%)
}

export interface SimulationResultSummary {
  totalProductsAffected: number;
  oldRevenueVolume: number;
  newRevenueVolume: number;
  totalDeltaCHF: number;
  averageDeltaPercent: number;
}
