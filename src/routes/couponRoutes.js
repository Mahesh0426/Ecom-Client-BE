import express from "express";
import { checkCouponExistsController } from "../controllers/couponController.js";

const couponRouter = express.Router();

couponRouter.post("/checkCoupon", checkCouponExistsController);

export default couponRouter;
