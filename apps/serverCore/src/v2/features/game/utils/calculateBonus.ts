// TODO: sliding cap based on bet size (NOT IT'S ON WINNINGS).
// For larger bets, you could reduce the bonus percentage while increasing the cap:
//  Bets under $100: 50% bonus, capped at $50.
//  Bets $100–$500: 25% bonus, capped at $100.
//  Bets $500+: 10% bonus, capped at $200.

// Okay cool, there is a dynamic cap and a absolute max if it gets wayyy to high.

// const calculateBonus = (betAmount: number, multiplier: number): number => {
//   // Define a base cap that scales with bet size
//   const baseCap = betAmount * 0.2; // Example: Cap is 20% of the bet amount
  
//   // Adjust the cap based on the multiplier
//   let dynamicCap = baseCap * multiplier; // Higher multipliers allow a higher cap
  
//   // Set an absolute max cap for extreme cases
//   const maxCap = 500; // Example: No bonus can exceed $500

//   // The effective cap is the smaller of dynamicCap and maxCap
//   const effectiveCap = Math.min(dynamicCap, maxCap);
//   // const effectiveCap = baseCap * Math.sqrt(multiplier);

//   // Calculate the bonus amount
//   const bonus = betAmount * (multiplier - 1);

//   // Ensure the bonus doesn't exceed the effective cap
//   return Math.min(bonus, effectiveCap);
// };

const absoluteMaxCap = 500; // Hard limit for the maximum bonus payout

// TODO: Use on win.
const calculateBonus = (betAmount: number, multiplier: number): number => {
  // Step 1: Calculate total winnings based on the multiplier
  const winnings = betAmount * multiplier;
  console.log("winnings", winnings);

  // Step 2: Determine the sliding cap as 10% of total winnings
  const winningsCap = winnings * 0.1;
  console.log("winningsCap", winningsCap);

  // Step 3: Apply the absolute max cap
  const effectiveCap = Math.min(winningsCap, absoluteMaxCap);
  console.log("effectiveCap", effectiveCap);

  // Step 4: Calculate the bonus and ensure it's capped
  const potentialBonus = winnings - betAmount; // Bonus is winnings minus the initial bet
  const bonus = Math.min(potentialBonus, effectiveCap);
  console.log("potentialBonus", potentialBonus);
  console.log("bonus", bonus);

  // Step 5: Return the calculated bonus
  return bonus;
};

// x10 bonus
calculateBonus(100, 10);
// Total Winnings = 100 * 10 = $1,000
// Winnings Cap = 1,000 * 0.1 = $100
// Effective Cap = Math.min($100, $500) = $100
// Potential Bonus = 1,000 - 100 = $900
// Final Bonus = Math.min($900, $100) = $100
// Result: $100 Bonus

// x6 bonus
calculateBonus(50, 6);
// Total Winnings = 50 * 6 = $300
// Winnings Cap = 300 * 0.1 = $30
// Effective Cap = Math.min($30, $500) = $30
// Potential Bonus = 300 - 50 = $250
// Final Bonus = Math.min($250, $30) = $30
// Result: $30 Bonus

// x3 bonus
calculateBonus(500, 3);
// Total Winnings = 500 * 3 = $1,500
// Winnings Cap = 1,500 * 0.1 = $150
// Effective Cap = Math.min($150, $500) = $150
// Potential Bonus = 1,500 - 500 = $1,000
// Final Bonus = Math.min($1,000, $150) = $150
// Result: $150 Bonus

