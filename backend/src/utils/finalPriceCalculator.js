const calculateFinalPrice = (basePrice) => {
  // 1. Website Convenience Fee
  const websiteFee = basePrice * 0.05;
  const websiteGST = websiteFee * 0.18;
  const subTotal = basePrice + websiteFee + websiteGST;

  // 2. Razorpay Fee (Calculated on the subtotal)
  const razorpayFee = subTotal * 0.02;
  const razorpayGST = razorpayFee * 0.18;
  
  // 3. Final Total
  const finalTotal = subTotal + razorpayFee + razorpayGST;

  return Math.round(finalTotal); 
};