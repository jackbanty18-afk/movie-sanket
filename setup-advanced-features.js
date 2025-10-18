const { execFileSync } = require("child_process");
const { join } = require("path");

const DB_PATH = join(__dirname, "data", "app.db");
const SQLITE = join(__dirname, "tools", "sqlite3.exe");

function runSQL(sql) {
  return execFileSync(SQLITE, ["-batch", DB_PATH], { input: sql, encoding: "utf8" });
}

// Add default pricing tiers
const pricingTiers = [
  {
    name: 'Standard',
    description: 'Regular pricing for most theatres',
    baseMultiplier: 1.0,
    weekendMultiplier: 1.2,
    holidayMultiplier: 1.5
  },
  {
    name: 'Premium',
    description: 'Higher-end theatres with premium facilities',
    baseMultiplier: 1.3,
    weekendMultiplier: 1.5,
    holidayMultiplier: 1.8
  },
  {
    name: 'VIP',
    description: 'Luxury theatres with VIP experiences',
    baseMultiplier: 1.6,
    weekendMultiplier: 2.0,
    holidayMultiplier: 2.5
  }
];

console.log('Setting up advanced movie booking features...');

// Insert default pricing tiers
for (const tier of pricingTiers) {
  const sql = `INSERT OR IGNORE INTO pricing_tiers (name, description, baseMultiplier, weekendMultiplier, holidayMultiplier, createdAt)
    VALUES ('${tier.name}', '${tier.description}', ${tier.baseMultiplier}, ${tier.weekendMultiplier}, ${tier.holidayMultiplier}, '${new Date().toISOString()}');`;
  
  try {
    runSQL(sql);
    console.log(`✓ Added pricing tier: ${tier.name}`);
  } catch (error) {
    console.log(`✗ Failed to add pricing tier: ${tier.name}`, error.message);
  }
}

// Add sample theatre pricing for existing theatres
const theatres = ['th1', 'th2', 'th3', 'th4', 'th5']; // From your existing data
const samplePricing = [
  { theatreId: 'th1', pricingTierId: 1, normalPrice: 150, executivePrice: 180, premiumPrice: 220, vipPrice: 350 },
  { theatreId: 'th2', pricingTierId: 2, normalPrice: 180, executivePrice: 220, premiumPrice: 280, vipPrice: 450 },
  { theatreId: 'th3', pricingTierId: 1, normalPrice: 160, executivePrice: 190, premiumPrice: 240, vipPrice: 380 },
  { theatreId: 'th4', pricingTierId: 3, normalPrice: 200, executivePrice: 250, premiumPrice: 320, vipPrice: 550 },
  { theatreId: 'th5', pricingTierId: 2, normalPrice: 190, executivePrice: 230, premiumPrice: 290, vipPrice: 480 },
];

for (const pricing of samplePricing) {
  const sql = `INSERT OR REPLACE INTO theatre_pricing (theatreId, pricingTierId, normalPrice, executivePrice, premiumPrice, vipPrice)
    VALUES ('${pricing.theatreId}', ${pricing.pricingTierId}, ${pricing.normalPrice}, ${pricing.executivePrice}, ${pricing.premiumPrice}, ${pricing.vipPrice});`;
  
  try {
    runSQL(sql);
    console.log(`✓ Added pricing for theatre: ${pricing.theatreId}`);
  } catch (error) {
    console.log(`✗ Failed to add pricing for theatre: ${pricing.theatreId}`, error.message);
  }
}

// Add sample seat templates for some theatres
const sampleLayouts = [
  {
    theatreId: 'th1',
    name: 'Cinepolis Standard Layout',
    layout: JSON.stringify({
      rows: [
        { id: 'J', tier: 'VIP', seatCount: 12 },
        { id: 'H', tier: 'PREMIUM', seatCount: 18, gap: 2 },
        { id: 'G', tier: 'PREMIUM', seatCount: 18 },
        { id: 'F', tier: 'PREMIUM', seatCount: 18 },
        { id: 'E', tier: 'EXECUTIVE', seatCount: 20, gap: 2 },
        { id: 'D', tier: 'EXECUTIVE', seatCount: 20 },
        { id: 'C', tier: 'NORMAL', seatCount: 22, gap: 1 },
        { id: 'B', tier: 'NORMAL', seatCount: 22 },
        { id: 'A', tier: 'NORMAL', seatCount: 22 },
      ],
      metadata: { totalSeats: 192, tierCounts: { NORMAL: 66, EXECUTIVE: 40, PREMIUM: 54, VIP: 12 } }
    }),
    normalSeats: 66,
    executiveSeats: 40,
    premiumSeats: 54,
    vipSeats: 12,
    totalSeats: 172
  },
  {
    theatreId: 'th5',
    name: 'Miraj IMAX Layout',
    layout: JSON.stringify({
      rows: [
        { id: 'L', tier: 'VIP', seatCount: 16 },
        { id: 'K', tier: 'VIP', seatCount: 16, gap: 3 },
        { id: 'J', tier: 'PREMIUM', seatCount: 24 },
        { id: 'H', tier: 'PREMIUM', seatCount: 24 },
        { id: 'G', tier: 'PREMIUM', seatCount: 24 },
        { id: 'F', tier: 'EXECUTIVE', seatCount: 26, gap: 2 },
        { id: 'E', tier: 'EXECUTIVE', seatCount: 26 },
        { id: 'D', tier: 'EXECUTIVE', seatCount: 26 },
        { id: 'C', tier: 'NORMAL', seatCount: 28, gap: 2 },
        { id: 'B', tier: 'NORMAL', seatCount: 28 },
        { id: 'A', tier: 'NORMAL', seatCount: 28 },
      ],
      metadata: { totalSeats: 266, tierCounts: { NORMAL: 84, EXECUTIVE: 78, PREMIUM: 72, VIP: 32 } }
    }),
    normalSeats: 84,
    executiveSeats: 78,
    premiumSeats: 72,
    vipSeats: 32,
    totalSeats: 266
  }
];

for (const layout of sampleLayouts) {
  const sql = `INSERT OR REPLACE INTO seat_templates (theatreId, name, layout, totalSeats, normalSeats, executiveSeats, premiumSeats, vipSeats, createdAt, updatedAt)
    VALUES ('${layout.theatreId}', '${layout.name}', '${layout.layout}', ${layout.totalSeats}, ${layout.normalSeats}, ${layout.executiveSeats}, ${layout.premiumSeats}, ${layout.vipSeats}, '${new Date().toISOString()}', '${new Date().toISOString()}');`;
  
  try {
    runSQL(sql);
    console.log(`✓ Added seat template for: ${layout.theatreId}`);
  } catch (error) {
    console.log(`✗ Failed to add seat template for: ${layout.theatreId}`, error.message);
  }
}

console.log('\n🎬 Advanced movie booking features setup complete!');
console.log('\nNew Features Available:');
console.log('📅 Schedule Builder - Create bulk schedules with recurring patterns');
console.log('🕒 Theatre Schedules - Configure per-theatre operating hours');
console.log('💰 Pricing Tiers - Manage advanced pricing structures');
console.log('🎭 Seat Templates - Design custom seat layouts');
console.log('\nAccess these features from the Admin Dashboard: /admin');