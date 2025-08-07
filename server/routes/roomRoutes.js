import express from "express";
import { getAllRooms, createRoom, getRoomDetails } from "../controllers/roomController.js";

const router = express.Router();

router.get("/", getAllRooms);
router.post("/", createRoom);
router.get("/:roomId", getRoomDetails);
export default router;
