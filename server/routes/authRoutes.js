import express, { Router } from 'express'
import { signup ,login, logout,extract} from  '../controllers/authController.js'


const router = express.Router();

router.post("/signup",signup);

router.post("/login",login);

router.post("/logout",logout)

router.get("/extract",extract)
export default router;