import { RawPricingRow } from "./types";

const MOCK_CLIENTS = [
  "Bauunternehmung Meier AG",
  "Hospitality Group Zurich AG",
  "Klinik St. Anna Luzern",
  "Swiss Logistics Express AG",
  "Elektro Imboden & Partner AG",
  "Gastro Bern Genossenschaft",
  "Alpen Bau & Montage GmbH",
  "Schreinerei Vontobel & Co.",
  "Facility Services Mittelland AG",
  "Transports Publics Romands SA"
];

const MOCK_PRODUCTS = [
  { name: "Antonio Poloshirt", basePrice: 48.0, code: "ANT" },
  { name: "Roberto Strickpullover", basePrice: 89.0, code: "ROB" },
  { name: "Softshell 848 Ontario", basePrice: 125.0, code: "ONT-848" },
  { name: "Performance Parka Valais", basePrice: 189.0, code: "VAL-PRK" },
  { name: "Workwear Bundhose Cargo Pro", basePrice: 94.0, code: "CRG-PRO" },
  { name: "T-Shirt Premium Organic", basePrice: 28.0, code: "TSH-ORG" },
  { name: "Sweatshirt Basel Crewneck", basePrice: 62.0, code: "BSL-SWT" },
  { name: "Fleecejacke Matterhorn 300", basePrice: 78.0, code: "MTH-FLC" },
  { name: "Warnschutzjacke Luzern EN 20471", basePrice: 145.0, code: "WRN-LUZ" },
  { name: "Hybrid Weste Grimsel", basePrice: 69.0, code: "GRM-WST" }
];

const MOCK_COLOURS = [
  "Anthrazit",
  "Vargas Orange",
  "Navy Blue",
  "Tiefschwarz",
  "Olive Green",
  "Silbergrau"
];

const MOCK_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

/**
 * Generates realistic Ernesto Vargas sample data
 * @param count Number of rows (e.g. 1000 for quick test, or 55000 for stress test)
 */
export function generateSampleData(count: number = 1200): RawPricingRow[] {
  const rows: RawPricingRow[] = [];
  let rowIdx = 0;

  // Ensure every client has a representative portfolio
  for (const client of MOCK_CLIENTS) {
    // Determine client discount profile
    let clientDiscountRate = 0.15; // default 15%
    if (client.includes("Hospitality")) clientDiscountRate = 0.22;
    if (client.includes("Logistics")) clientDiscountRate = 0.28;
    if (client.includes("Meier")) clientDiscountRate = 0.12;
    if (client.includes("Elektro")) clientDiscountRate = 0.05;

    for (const prod of MOCK_PRODUCTS) {
      // Pick 2-3 colours for this product
      const colours = MOCK_COLOURS.slice(0, 2 + (rowIdx % 3));

      // Decide if this product has size surcharges (3XL+)
      const hasSizeSurcharge = prod.basePrice > 50;
      const surcharge3XL = hasSizeSurcharge ? 4.5 : 0;
      const surcharge4XL = hasSizeSurcharge ? 7.0 : 0;

      // Special anomaly triggers for testing:
      // Negative discount for specific combination
      const isNegativeAnomaly = client.includes("Gastro") && prod.name.includes("Antonio");
      // Zero discount for specific client/product
      const isZeroDiscount = client.includes("Elektro") && prod.name.includes("Organic");
      // Extreme discount for sample promo
      const isExtremeDiscount = client.includes("Schreinerei") && prod.name.includes("Matterhorn");

      for (const col of colours) {
        for (const size of MOCK_SIZES) {
          rowIdx++;
          const bexioPrice = prod.basePrice;

          let discountedPrice: number;

          if (isNegativeAnomaly) {
            // Price higher than list price (e.g. including unbundled embroidery)
            discountedPrice = Number((bexioPrice * 1.08).toFixed(2));
          } else if (isZeroDiscount) {
            discountedPrice = bexioPrice;
          } else if (isExtremeDiscount) {
            discountedPrice = Number((bexioPrice * 0.4).toFixed(2)); // 60% discount
          } else {
            // Standard customer discount
            let sizeExtra = 0;
            if (size === "3XL") sizeExtra = surcharge3XL;
            if (size === "4XL" || size === "5XL") sizeExtra = surcharge4XL;

            const discountedBase = bexioPrice * (1 - clientDiscountRate);
            discountedPrice = Number((discountedBase + sizeExtra).toFixed(2));
          }

          const productCode = `${prod.code}-${col.substring(0, 3).toUpperCase()}-${size}`;
          const platformPriceInclVat = Number((discountedPrice * 1.081).toFixed(2));

          rows.push({
            client,
            productCode,
            productName: prod.name,
            colour: col,
            size,
            bexioPrice,
            discountType: isZeroDiscount ? "None" : "Percentage",
            discountedPrice,
            platformPriceInclVat
          });

          if (rows.length >= count) return rows;
        }
      }
    }
  }

  // If count is larger than initial portfolio (e.g. 55000), duplicate with realistic variations
  while (rows.length < count) {
    const template = rows[rows.length % 500];
    const newIdx = rows.length + 1;
    const clientVariant = `Kunde Filiale ${(newIdx % 85) + 1} AG`;
    rows.push({
      ...template,
      client: clientVariant,
      productCode: `${template.productCode}-V${newIdx}`
    });
  }

  return rows;
}
