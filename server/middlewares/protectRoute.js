import jwt from "jsonwebtoken";
import User from "../models/User";

const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookie.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized- no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized- invalid token" });
        }
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
export default protectRoute;