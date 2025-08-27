import CouponCollection from "./couponSchema.js";

// check if coupon exists
export const checkCouponExists = async (code) => {
  const coupon = await CouponCollection.findOne({ code: code });
  return coupon;
};

// increment coupon usage count
export const countCouponUsage = async (code) => {
  const updatedCoupon = await CouponCollection.findOneAndUpdate(
    { code: code },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  return updatedCoupon;
};
