import { Router } from "express";
import {
  fundWalletHandler,
  transferFundsHandler,
  withdrawFundsHandler,
  listTransactionsHandler,
} from "../controllers/walletController";
import { authenticate, requireUser } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireUser);
router.post("/fund", fundWalletHandler);
router.post("/transfer", transferFundsHandler);
router.post("/withdraw", withdrawFundsHandler);
router.get("/transactions", listTransactionsHandler);

export default router;


