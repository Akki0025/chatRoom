import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import generateTokenAndSetCookie from '../utils/generateToken.js';

const JWT_SECRET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopkqrstuvwxyz1234567890';

export const signup = async (req, res) => {
    try {
        const { fullName, email, username, password, confirmpassword, gender } = req.body;

        if (password !== confirmpassword) {
            return res.status(400).json({ message: "Password and Confirm Password doesn't match" });
        }

        const user = await User.findOne({ username, email });

        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            username,
            password: hashedPassword,
            gender,
        });

        if (newUser) {
            generateTokenAndSetCookie(newUser._id, username, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullname: newUser.fullname,
                email: newUser.email,
                username: newUser.username,
            });
        } else {
            return res.status(400).json({ message: "Invalid user data" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || " ");

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid username or password" });
        }
        generateTokenAndSetCookie(user._id,username, res);

        res.status(200).json({
            _id: user._id,
            fullname: user.fullName,
            username: user.username,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const logout = async (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const extract = async (req, res) => {
    const token = req.cookies.jwt;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ userId: decoded.userId , username:decoded.username});
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}