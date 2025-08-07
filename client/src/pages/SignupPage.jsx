import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmpassword: "",
    gender: "male",
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}api/auth/signup`, formData, { withCredentials: true });
      alert("Signup successful");
      navigate("/rooms");
    } catch (error) {
      alert(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-6 rounded shadow-md" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-4">Signup</h2>
        <input
          className="border w-full p-2 mb-4"
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleInputChange}
          required
        />
        <input
          className="border w-full p-2 mb-4"
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          className="border w-full p-2 mb-4"
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />
        <input
          className="border w-full p-2 mb-4"
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        <input
          className="border w-full p-2 mb-4"
          type="password"
          name="confirmpassword"
          placeholder="Confirm Password"
          value={formData.confirmpassword}
          onChange={handleInputChange}
          required
        />
        <select
          className="border w-full p-2 mb-4"
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <button className="bg-blue-500 text-white w-full py-2 rounded">Signup</button>
      </form>
    </div>
  );
}
