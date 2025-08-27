import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[A-Z0-9]+$/, // only uppercase letters and numbers
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date > new Date();
        },
      },
    },

    usageLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "inactive",
      enum: ["active", "inactive", "expired"],
    },
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CouponCollection = mongoose.model("Coupon", CouponSchema);
export default CouponCollection;
