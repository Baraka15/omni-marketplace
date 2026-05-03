import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import sellerRouter from "./seller";
import rfqRouter from "./rfq";
import paymentsRouter from "./payments";
import marketplaceRouter from "./marketplace";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(sellerRouter);
router.use(rfqRouter);
router.use(paymentsRouter);
router.use(marketplaceRouter);

export default router;
