const Stripe = require('stripe');
require('dotenv').config({ path: '../.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

async function setupStripePrices() {
  console.log('🚀 Setting up Stripe prices for OmniX AI...\n');

  try {
    // First, create products
    console.log('📦 Creating products...');
    
    const subscriptionProduct = await stripe.products.create({
      name: 'OmniX AI Subscription',
      description: 'Access to OmniX AI platform with multiple AI models',
      type: 'service',
    });

    const creditsProduct = await stripe.products.create({
      name: 'OmniX AI Credits',
      description: 'Credits for pay-as-you-go usage of OmniX AI',
      type: 'service',
    });

    console.log('✅ Products created successfully!\n');

    // Create subscription prices
    console.log('💳 Creating subscription prices...');
    
    const subscriptionPrices = [
      { plan: 'student', price: 499, name: 'Student Plan' },
      { plan: 'pro', price: 1999, name: 'Pro Plan' },
      { plan: 'team', price: 4999, name: 'Team Plan' },
      { plan: 'enterprise', price: 19999, name: 'Enterprise Plan' },
    ];

    const createdPrices = {};

    for (const { plan, price, name } of subscriptionPrices) {
      // Monthly price
      const monthlyPrice = await stripe.prices.create({
        product: subscriptionProduct.id,
        unit_amount: price,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        nickname: `${name} - Monthly`,
        metadata: {
          plan: plan,
          interval: 'monthly',
        },
      });

      // Annual price (20% discount)
      const annualPrice = await stripe.prices.create({
        product: subscriptionProduct.id,
        unit_amount: Math.round(price * 12 * 0.8), // 20% discount
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        nickname: `${name} - Annual (20% off)`,
        metadata: {
          plan: plan,
          interval: 'annual',
        },
      });

      createdPrices[`${plan}_monthly`] = monthlyPrice.id;
      createdPrices[`${plan}_annual`] = annualPrice.id;

      console.log(`✅ ${name}: Monthly (${monthlyPrice.id}), Annual (${annualPrice.id})`);
    }

    // Create credit prices
    console.log('\n💰 Creating credit prices...');
    
    const creditPackages = [
      { amount: 500, credits: 100, name: 'Starter Pack' },
      { amount: 1500, credits: 350, name: 'Popular Pack' },
      { amount: 4000, credits: 1000, name: 'Power Pack' },
      { amount: 10000, credits: 2500, name: 'Enterprise Pack' },
    ];

    for (const { amount, credits, name } of creditPackages) {
      const creditPrice = await stripe.prices.create({
        product: creditsProduct.id,
        unit_amount: amount,
        currency: 'usd',
        nickname: `${name} - ${credits} credits`,
        metadata: {
          credits: credits.toString(),
          type: 'credits',
        },
      });

      createdPrices[`credits_${amount/100}`] = creditPrice.id;
      console.log(`✅ ${name}: $${amount/100} for ${credits} credits (${creditPrice.id})`);
    }

    // Generate configuration file
    console.log('\n📝 Generating price configuration...');
    
    const configContent = `// Auto-generated Stripe Price IDs - ${new Date().toISOString()}
export const STRIPE_PRICE_IDS = {
  // Subscription Plans
  student_monthly: '${createdPrices.student_monthly}',
  pro_monthly: '${createdPrices.pro_monthly}',
  team_monthly: '${createdPrices.team_monthly}',
  enterprise_monthly: '${createdPrices.enterprise_monthly}',
  
  // Annual Plans (20% discount)
  student_annual: '${createdPrices.student_annual}',
  pro_annual: '${createdPrices.pro_annual}',
  team_annual: '${createdPrices.team_annual}',
  enterprise_annual: '${createdPrices.enterprise_annual}',

  // Credit Packages
  credits_5: '${createdPrices.credits_5}',
  credits_15: '${createdPrices.credits_15}',
  credits_40: '${createdPrices.credits_40}',
  credits_100: '${createdPrices.credits_100}',
} as const;

// Usage: Update src/lib/stripe.ts with these price IDs
`;

    const fs = require('fs');
    fs.writeFileSync('../stripe-prices.generated.ts', configContent);

    console.log('\n🎉 Stripe setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update src/lib/stripe.ts with the generated price IDs');
    console.log('2. Check stripe-prices.generated.ts for the price IDs');
    console.log('3. Test the payment flow on your application');
    console.log('\n🔗 View your products in Stripe Dashboard:');
    console.log(`   Subscription Product: https://dashboard.stripe.com/products/${subscriptionProduct.id}`);
    console.log(`   Credits Product: https://dashboard.stripe.com/products/${creditsProduct.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe prices:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Make sure your STRIPE_SECRET_KEY is set in .env.local');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupStripePrices(); 