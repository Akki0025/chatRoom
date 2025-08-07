import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserProvider";
import axios from "axios";
import io from "socket.io-client";
import './ChatsPage.css';

const API_BASE_URL = "http://localhost:5000";
const socket = io(API_BASE_URL);

export default function ChatPage() {
  const { roomId } = useParams(); // Extract roomId from URL
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole,setUserRole] = useState(null);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [roomname, setRoomname] = useState();
  const [messages, setMessages] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState([]);
  const { username, userId, loading } = useContext(UserContext); // Assume `userId` identifies the current user
  const navigate = useNavigate();

  // Fetch messages for the room
  useEffect(() => {
    if (loading) return; // Wait until the user data is loaded

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    });

    const fetchMessages = async () => {
      try {
        console.log(roomId);
        const { data } = await axios.get(`${API_BASE_URL}/api/messages/${roomId}`);
        setMessages(data.messages);
        setRoomname(data.roomName);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();

    // Fetch room details to determine if the user is an admin
    const fetchRoomDetails = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`);  
        console.log(data);
        setIsAdmin(data.roles[userId] === "admin"); // Check if user is admin
        setBannedUsers(data.bannedUsers);
        const participant = data.participants.find(p => p.userId && p.userId._id === userId);
        if (participant) {
          setUserRole(participant.userId.role); // Set user's role
        }

      } catch (error) {
        console.error("Error fetching room details:", error);
      }
    };
    fetchRoomDetails();

    socket.on("youAreKicked", ({ roomId }) => {
      alert("You are kicked");
      navigate("/rooms");
    });

    socket.on("youAreBanned", ({ roomId }) => {
      alert("You are Banned");
      navigate("/rooms");
    });

    socket.on("userJoined", ({ userId }) => {
      setParticipants((prevParticipants) => {
        if (!prevParticipants.includes(userId)) {
          return [...prevParticipants, userId];
        }
        return prevParticipants;
      });
    });


    socket.on("userKicked", ({ targetUserId }) => {
      alert(`${targetUserId} has been kicked from the room.`);
      setParticipants((prevParticipants) => prevParticipants.filter((userId) => userId !== targetUserId));
    });


    socket.on("userBanned", ({ targetUserId }) => {
      alert(`${targetUserId} has been banned from the room.`);
      setParticipants((prevParticipants) => prevParticipants.filter((userId) => userId !== targetUserId));
    });


    // Listen for new messages
    socket.emit("joinRoom", { roomId, userId });

    socket.on("userTyping", ({ userId }) => {
      console.log("I can recieve");
      setTypingUsers((prevTyping) => [...prevTyping, userId]);
    });

    socket.on("userStopTyping", ({ userId }) => {
      setTypingUsers((prevTyping) => prevTyping.filter((id) => id !== userId));
    });

    socket.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("participantsUpdated", (updatedParticipants) => {
      console.log(updatedParticipants);
      setParticipants(updatedParticipants);
    });

    socket.on("roomListUpdated", () => {
      alert("This room has been deleted.");
      navigate("/rooms");
    });

    socket.on("userUnbanned", ({ targetUserId }) => {
      alert(`${targetUserId} has been unbanned from the room.`);
      setBannedUsers((prevBannedUsers) =>
        prevBannedUsers.filter((userId) => userId !== targetUserId)
      );
    });


    socket.on("error", (message) => {
      alert(message);  // Show error message (can be customized)
      navigate("/rooms");  // Redirect user back to the rooms page
    });


    return () => {
      socket.off("userTyping ");
      socket.off("userStopTyping");
      socket.off("newMessage");
      socket.off("userUnbanned");
      socket.off("participantsUpdated");
      socket.off("userJoined");
      socket.off("userKicked");
      socket.off("youAreKicked");
      socket.off("youAreBanned");
      socket.off("userBanned");
      socket.off("roomListUpdated");
      socket.off("error");
    };
  }, [roomId, userId]);

  let typingTimeout = null;
  const handleTyping = () => {
    if (!typingUsers.includes(userId)) {
      socket.emit("startTyping", { roomId, userId });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { roomId, userId });
    }, 5000);

  };



  const handleRightClick = (e, mes) => {
    e.preventDefault();
    setSelectedMessage(mes);
    // console.log(selectedMessage)
    setShowContextMenu(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleEditMessage = () => {
    if (selectedMessage) {
      const updatedMessage = prompt("Edit your message:", selectedMessage.message);
      if (updatedMessage) {
        // Send update to backend
        socket.emit("editMessage", { roomId, userId, messageId: selectedMessage.id, newMessage: updatedMessage });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === selectedMessage.id ? { ...msg, message: updatedMessage } : msg
          )
        );
      }
    }
    setShowContextMenu(false);
  };

  const handleDeleteMessage = () => {
    console.log(`seleChed message ${selectedMessage}`)
    if (selectedMessage) {
      if (window.confirm("Are you sure you want to delete this message?")) {
        // Delete message from backend and update state
        socket.emit("deleteMessage", { roomId, messageId: selectedMessage._id });
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== selectedMessage.id)
        );
      }
    }
    setShowContextMenu(false);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };



  // Send a new message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    socket.emit("sendMessage", { roomId, userId, message: newMessage, username });
    setNewMessage("");
  };

  const handleLeaveRoom = () => {

    socket.emit("leaveRoom", { roomId, userId });
    navigate("/rooms");
  };

  const handleDeleteRoom = () => {
    if (!isAdmin) {
      alert("Only the admin can end the meeting");
      return;
    }
    else {
      if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
        socket.emit("deleteRoom", { roomId, userId });
        navigate('/rooms');
      }
    }
  };

  const handleChangeRole = (targetUserId, newRole) => {
    if (targetUserId === userId && newRole === "admin") {
      alert("You cannot change your own role to admin.");
      return;
    }

    setSelectedRoles((prev) => ({
      ...prev,
      [targetUserId]: newRole,
    }));
  };

  const handleSubmitRoleChange = (targetUserId) => {
    if (!isAdmin) {
      alert("Only the admin can change roles.");
      return;
    }

    const newRole = selectedRoles[targetUserId];
    if (!newRole) {
      alert("Please select a role before submitting.");
      return;
    }

    if (targetUserId === userId && newRole === "admin") {
      alert("You cannot change your own role to admin.");
      return;
    }

    socket.emit("changeRole", { roomId, adminId: userId, targetUserId, newRole });
  };

  const handleKickUser = (targetUserId) => {
    if (!isAdmin && !isModerator) {
      alert("Only an admin or moderator can kick users.");
      return;
    }

    if (targetUserId === userId) {
      alert("You cannot kick yourself.");
      return;
    }

    if (window.confirm(`Are you sure you want to kick ${targetUserId}?`)) {
      socket.emit("kickUser", { roomId, adminId: userId, targetUserId });
    }
  };

  const handleBanUser = (targetUserId) => {
    if (!isAdmin) {
      alert("Only an admin can ban users.");
      return;
    }

    if (targetUserId === userId) {
      alert("You cannot ban yourself.");
      return;
    }

    if (window.confirm(`Are you sure you want to ban ${targetUserId}?`)) {
      socket.emit("banUser", { roomId, adminId: userId, targetUserId });
    }
  };

  const handleUnbanUser = (targetUserId) => {
    if (!isAdmin) {
      alert("Only an admin can unban users.");
      return;
    }

    socket.emit("unbanUser", { roomId, adminId: userId, targetUserId });
  };

  return (
    <div className="chat-page" onClick={handleCloseContextMenu}>
      <div className="left-panel">
        <h1 className="chat-title">Chat Room: {roomname}</h1>
        <div className="banned-users">
          <h2>Banned Users</h2>
          <ul className="banned-users-list">
            {bannedUsers.map((userId) => (
              <li key={userId} className="banned-user-item">
                <span>{userId}</span>
                <button onClick={() => handleUnbanUser(userId)}>Unban</button>
              </li>
            ))}
          </ul>
        </div>


        <h2>Participants</h2>
        <ul className="participants-list">
          {participants
            .filter(participant => participant && participant.userId)
            .map((participant, index) => (
              <li key={index} className="participant-item">
                <span className="participant-role">{participant.role}</span>
                <span className="participant-username">{participant.userId}</span>

                {/* Only admins can change roles, and not for the current user */}
                {isAdmin && participant.userId !== userId && (
                  <div className="role-change-container">
                    <select
                      value={participant.role}
                      onChange={(e) => handleChangeRole(participant.userId, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => handleSubmitRoleChange(participant.userId)}>
                      Change Role
                    </button>
                  </div>
                )}

                {/* Buttons to kick, ban, or unban users */}
                {isAdmin && participant.userId !== userId && (
                  <div className="action-buttons">
                    <button onClick={() => handleKickUser(participant.userId)}>Kick</button>
                    <button onClick={() => handleBanUser(participant.userId)}>Ban</button>
                  </div>
                )}


              </li>
            ))}
        </ul>


        <button className="leave-room-button" onClick={handleLeaveRoom}>
          Leave Room
        </button>

        <button className="delete-room-button" onClick={handleDeleteRoom}>
          Delete Room
        </button>
      </div>

      <div className="chat-box">
        <h1 className="chat-title">Chat Room: {roomname}</h1>

        <div className="messages-container">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message-item ${msg.senderId === userId ? "own-message" : "other-message"}`}
              onContextMenu={(e) => handleRightClick(e, msg)}
            >
              <span className="role">{msg.role}</span>
              <span className="username">{msg.username}:</span> {msg.message}
            </div>
          ))}
        </div>

        {showContextMenu && (
          <div
            className="context-menu"
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          >
            <ul>
              <li onClick={handleEditMessage}>Edit Message</li>
              <li onClick={handleDeleteMessage}>Delete Message</li>
            </ul>
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.map((userId) => (
              <span key={userId}>{userId} is typing...</span>
            ))}
          </div>
        )}

        <div className="message-input">
          <input
            className="message-input-field"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onBlur={() => socket.emit("stopTyping", { roomId, userId })}
          />
          <button className="send-button" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>

    </div>
  );
}
