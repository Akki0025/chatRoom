import jwt from 'jsonwebtoken';

const JWT_SECRET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopkqrstuvwxyz1234567890';
const generateTokenAndSetCookie = (userId,username, res) => {
    const token = jwt.sign({ userId,username }, JWT_SECRET, {
        expiresIn: "15d",
    });

    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
        httpOnly: true, // Prevent XSS
        sameSite: "strict", // Prevent CSRF
        secure: false, // Use secure cookies only in production
    });
};

export default generateTokenAndSetCookie;