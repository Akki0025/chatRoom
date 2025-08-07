import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api", // Update if your backend uses a different port
    withCredentials: true, // Include cookies in requests
});

// Authentication
export const login = (data) => API.post("/auth/login", data);
export const signup = (data) => API.post("/auth/signup", data);
export const logout = () => API.post("/auth/logout");

// Other endpoints (e.g., rooms, messages) remain here...
