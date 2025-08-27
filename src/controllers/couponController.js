import {
  checkCouponExists,
  countCouponUsage,
} from "../models/Coupon/couponModel.js";
import { responseClient } from "../middleware/responseClient.js";

//  check coupon exists and increment usage count
export const checkCouponExistsController = async (req, res, next) => {
  try {
    const { code } = req.body;

    // Validate that code exists
    if (!code) {
      return responseClient({
        req,
        res,
        message: "Coupon code is required",
        statusCode: 400,
      });
    }

    const coupon = await checkCouponExists(code);

    if (!coupon) {
      return responseClient({
        req,
        res,
        message: "Coupon not found",
        statusCode: 404,
      });
    }

    // Check if coupon is active
    if (coupon.status !== "active") {
      return responseClient({
        req,
        res,
        message: "Coupon is not active",
        statusCode: 400,
      });
    }

    // Check if coupon has expired (additional safety check)
    const currentDate = new Date();
    if (coupon.expiryDate && new Date(coupon.expiryDate) < currentDate) {
      return responseClient({
        req,
        res,
        message: "Coupon expired, too late try early next time 😰",
        statusCode: 400,
      });
    }

    // Check if usage limit has been reached
    if (coupon.usedCount >= coupon.usageLimit) {
      return responseClient({
        req,
        res,
        message: "Sorry! 😢, Coupon limit reached",
        statusCode: 400,
      });
    }

    // Increment the usage count
    const updatedCoupon = await countCouponUsage(code);

    // If all checks pass, return the valid coupon with updated usage count
    responseClient({
      req,
      res,
      payload: updatedCoupon,
      message: "Coupon is applied successfully!!",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Coupon check error:", error);
    next(error);
  }
};
