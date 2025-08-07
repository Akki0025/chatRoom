// src/contexts/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [username, setUsername] = useState(null);
    const [userId, setuserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        
        // Fetch user details from the backend
        const fetchUser = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/auth/extract", { withCredentials: true });
                setUsername(response.data.username);
                setuserId(response.data.userId);
            } catch (error) {
                console.error("Error fetching user data:", error.response?.data || error.message);
                setUsername(null);
                setuserId(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <UserContext.Provider value={{ username,userId, loading }}>
            {children}
        </UserContext.Provider>
    );
};
