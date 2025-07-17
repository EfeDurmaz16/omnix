// Auto-generated Stripe Price IDs - Updated 2025-01-17 with new sustainable pricing
export const STRIPE_PRICE_IDS = {
  // Subscription Plans
  student_monthly: 'price_1Rf0s3GfQ4XRggGYLyPcWhKs',
  pro_monthly: 'price_1Rf0s4GfQ4XRggGYSB9ExPB6',
  team_monthly: 'price_1Rf0s5GfQ4XRggGYAmoZRtmz',
  enterprise_monthly: 'price_1Rf0s5GfQ4XRggGYNWPGsCZ7',
  
  // Annual Plans (20% discount)
  student_annual: 'price_1Rf0s4GfQ4XRggGYQGzx0EUS',
  pro_annual: 'price_1Rf0s4GfQ4XRggGYyjhDkBNw',
  team_annual: 'price_1Rf0s5GfQ4XRggGY5Q7ueU19',
  enterprise_annual: 'price_1Rf0s6GfQ4XRggGYm1of3Nci',

  // Credit Packages - Updated pricing for video generation sustainability
  credits_5: 'price_1RlsVjGfQ4XRggGY74J3FMmC',    // $9 for 100 credits (starter pack)
  credits_15: 'price_1RlsW2GfQ4XRggGYPaNV5jGR',   // $29 for 350 credits (300 + 50 bonus) (popular pack)
  credits_40: 'price_1RlsWZGfQ4XRggGYCstPDYua',   // $69 for 1000 credits (800 + 200 bonus) (power pack)
  credits_100: 'price_1RlsWpGfQ4XRggGYRqadeGWD', // $149 for 2500 credits (2000 + 500 bonus) (enterprise pack)
} as const;

// Usage: Update src/lib/stripe.ts with these price IDs

// IMPORTANT: Credit pricing has been updated to support video generation sustainability
// - Video models now cost 150-300 credits per generation (to cover $6-12 provider costs)
// - Credit packages have been repriced to ensure profitability
// - All prices maintain healthy margins while remaining competitive
