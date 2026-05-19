import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import haulersRouter from "./haulers";
import profileRouter from "./profile";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(haulersRouter);
router.use(profileRouter);
router.use(leadsRouter);

export default router;
