import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../context/UserProvider";
import "./RoomsPage.css";
import { io } from "socket.io-client";

const API_BASE_URL = "http://localhost:5000";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const { username, userId, loading } = useContext(UserContext);
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io(API_BASE_URL);

    const fetchRooms = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/rooms`);
        setRooms(data);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    fetchRooms(); // Fetch rooms initially

    // Listen for real-time room list updates
    socket.on("roomListUpdated", async () => {
      console.log("Room list updated.");
      fetchRooms();
    });

    // Cleanup function
    return () => {
      socket.off("roomListUpdated"); // Properly remove the event listener
      socket.disconnect(); // Disconnect socket on unmount
    };
  }, []);

  // Handle room creation
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/rooms`, {
        name: newRoomName,
        userId,
      });
      setRooms((prevRooms) => [...prevRooms, data]);
      navigate(`/rooms/${data._id}`);
      setNewRoomName("");
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  // Handle room joining
  const handleJoinRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div className="rooms-page">
      <h1 className="page-title">Rooms</h1>

      {/* Room Creation */}
      <div className="room-creation">
        <input
          className="room-input"
          placeholder="Enter room name"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button className="create-room-btn" onClick={handleCreateRoom}>
          Create Room
        </button>
      </div>

      {/* Room List */}
      <ul className="room-list">
        {rooms.map((room) => (
          <li key={room._id} className="room-item">
            <span className="room-name">{room.name}</span>
            <button
              className="join-room-btn"
              onClick={() => handleJoinRoom(room._id)}
            >
              Join Room
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
