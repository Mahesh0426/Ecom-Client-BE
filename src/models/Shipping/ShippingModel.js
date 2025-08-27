import { v4 as uuidv4 } from "uuid";
import {
  getCartFromLocalStorage,
  saveCartToLocalStorage,
} from "../../utils/cartLocalStorage";
import { setCarts, setPromoApplied, updatePricing } from "./cartSlice";
import { checkCoupon } from "./couponApi";
import { toast } from "react-toastify";

//Add item to cart
export const addItemToCart =
  (product, selectedColor, selectedSize, quantity) => (dispatch, getState) => {
    // Get current cart from Redux
    const reduxCartItems = getState().cartInfo.cartItems;

    const cartPayload = {
      _id: uuidv4(),
      product_id: product._id,
      product_title: product.title,
      color: selectedColor,
      size: selectedSize,
      discountPrice: product.discountPrice,
      price: product.price,
      quantity: quantity,
      thumbnail: product.thumbnail,
      mainCategory: product.mainCategory,
    };

    // Check if item exists, update or add
    let updatedCartItems;
    const existingItemIndex = reduxCartItems.findIndex(
      (item) =>
        item.product_id === cartPayload.product_id &&
        item.color === cartPayload.color &&
        item.size === cartPayload.size
    );

    if (existingItemIndex !== -1) {
      updatedCartItems = reduxCartItems.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + cartPayload.quantity }
          : item
      );
    } else {
      updatedCartItems = [...reduxCartItems, cartPayload];
    }

    dispatch(setCarts(updatedCartItems));
    saveCartToLocalStorage(updatedCartItems);

    // Recalculate pricing with current coupon data
    const { isPromoApplied, appliedCoupon } = getState().cartInfo;
    const pricing = calculatePricing(
      updatedCartItems,
      isPromoApplied,
      appliedCoupon
    );
    dispatch(updatePricing(pricing));
  };

// delete a cart product
export const deleteCartItem = (itemId) => (dispatch, getState) => {
  const existingCartItems = getCartFromLocalStorage();
  const updatedCartItems = existingCartItems.filter(
    (item) => item._id !== itemId
  );
  dispatch(setCarts(updatedCartItems));
  saveCartToLocalStorage(updatedCartItems);

  // Recalculate pricing with current coupon data
  const { isPromoApplied, appliedCoupon } = getState().cartInfo;
  const pricing = calculatePricing(
    updatedCartItems,
    isPromoApplied,
    appliedCoupon
  );
  dispatch(updatePricing(pricing));
};

// Update pricing when promo is applied
export const updatePricingOnPromoChange = () => (dispatch, getState) => {
  const { cartItems, isPromoApplied, appliedCoupon } = getState().cartInfo;
  const pricing = calculatePricing(cartItems, isPromoApplied, appliedCoupon);
  dispatch(updatePricing(pricing));
};

//update a quantity in cart
export const updateCartItemQuantity =
  (itemId, quantity) => (dispatch, getState) => {
    const existingCartItems = getCartFromLocalStorage();
    const updatedCartItems = existingCartItems.map((item) =>
      item._id === itemId ? { ...item, quantity } : item
    );
    dispatch(setCarts(updatedCartItems));
    saveCartToLocalStorage(updatedCartItems);

    // Recalculate pricing with current coupon data
    const { isPromoApplied, appliedCoupon } = getState().cartInfo;
    const pricing = calculatePricing(
      updatedCartItems,
      isPromoApplied,
      appliedCoupon
    );
    dispatch(updatePricing(pricing));
  };

// Calculate pricing based on cart items and coupon data
const calculatePricing = (cartItems, isPromoApplied, appliedCoupon = null) => {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.discountPrice || item.price) * item.quantity,
    0
  );

  let discount = 0;

  if (isPromoApplied && appliedCoupon) {
    // Handle different discount types
    switch (appliedCoupon.discountType) {
      case "percentage":
        discount = subtotal * (appliedCoupon.value / 100);
        break;
      case "fixed":
        discount = Math.min(appliedCoupon.value, subtotal); // Don't exceed subtotal
        break;
      default:
        discount = 0;
    }

    // Apply maximum discount limit if specified
    if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
      discount = appliedCoupon.maxDiscount;
    }

    // Apply minimum order value check
    if (appliedCoupon.minOrderValue && subtotal < appliedCoupon.minOrderValue) {
      discount = 0;
    }
  }

  const shipping = subtotal > 80 ? 0 : 7.99;
  const total = Math.max(0, subtotal - discount + shipping); // Ensure total is not negative

  return { subtotal, discount, shipping, total };
};

// Load cart from localStorage
export const fetchCartFromStorage = () => (dispatch, getState) => {
  const cartItems = getCartFromLocalStorage();
  dispatch(setCarts(cartItems));

  // Calculate and update pricing with current coupon data
  const { isPromoApplied, appliedCoupon } = getState().cartInfo;
  const pricing = calculatePricing(cartItems, isPromoApplied, appliedCoupon);
  dispatch(updatePricing(pricing));
};

//This is for clear the cart
export const clearCart = () => (dispatch) => {
  dispatch(setCarts([]));
  saveCartToLocalStorage([]);
  dispatch(updatePricing({ subtotal: 0, discount: 0, shipping: 0, total: 0 }));
  // Clear any applied coupons when cart is cleared
  dispatch(
    setPromoApplied({
      isPromoApplied: false,
      promoCode: "",
      appliedCoupon: null,
    })
  );
};

// Apply promo code with backend validation
export const handleApplyPromo = async (promoCode, dispatch, getState) => {
  if (!promoCode.trim()) {
    toast.error("Please enter a promo code");
    return;
  }

  try {
    // Show loading state (optional)
    toast.info("Validating coupon...");

    const response = await checkCoupon({ code: promoCode.trim() });
    console.log("Coupon response:", response);

    const coupon = response.data.payload;

    // Validate coupon on frontend as well
    const now = new Date();
    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < now;
    const isUsageLimitReached =
      coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;

    if (
      !coupon ||
      coupon.status !== "active" ||
      isExpired ||
      isUsageLimitReached
    ) {
      dispatch(
        setPromoApplied({
          isPromoApplied: false,
          promoCode: "",
          appliedCoupon: null,
        })
      );

      if (isExpired) {
        toast.error("This coupon has expired");
      } else if (isUsageLimitReached) {
        toast.error("This coupon has reached its usage limit");
      } else {
        toast.error("Invalid coupon code");
      }
      return;
    }

    // Check minimum order value if specified
    const { cartItems } = getState().cartInfo;
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.discountPrice || item.price) * item.quantity,
      0
    );

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      dispatch(
        setPromoApplied({
          isPromoApplied: false,
          promoCode: "",
          appliedCoupon: null,
        })
      );
      toast.error(`Minimum order value of $${coupon.minOrderValue} required`);
      return;
    }

    // Apply coupon successfully
    dispatch(
      setPromoApplied({
        isPromoApplied: true,
        promoCode: promoCode.trim(),
        appliedCoupon: coupon,
      })
    );

    // Recalculate pricing with the new coupon
    dispatch(updatePricingOnPromoChange());

    // Show success message with discount info
    const discountText =
      coupon.discountType === "percentage"
        ? `${coupon.value}% off`
        : `$${coupon.value} off`;
    toast.success(`Promo code applied! ${discountText}`);
  } catch (error) {
    dispatch(
      setPromoApplied({
        isPromoApplied: false,
        promoCode: "",
        appliedCoupon: null,
      })
    );

    // Handle different error scenarios
    if (error.response?.status === 404) {
      toast.error("Coupon not found");
    } else if (error.response?.status === 400) {
      toast.error(error.response.data.message || "Invalid coupon");
    } else {
      toast.error("Failed to validate coupon. Please try again.");
    }

    console.error("Coupon validation error:", error);
  }
};

// Remove applied coupon
export const removeCoupon = () => (dispatch, getState) => {
  dispatch(
    setPromoApplied({
      isPromoApplied: false,
      promoCode: "",
      appliedCoupon: null,
    })
  );

  // Recalculate pricing without coupon
  const { cartItems } = getState().cartInfo;
  const pricing = calculatePricing(cartItems, false, null);
  dispatch(updatePricing(pricing));

  toast.success("Coupon removed");
};
