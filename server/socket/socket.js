import Room from "../models/Room.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import leoProfanity from 'leo-profanity';

// Load multiple language dictionaries
leoProfanity.loadDictionary("en");
leoProfanity.loadDictionary("fr");
leoProfanity.loadDictionary("es");

export const configureSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("joinRoom", async ({ roomId, userId }) => {
            try {
                const room = await Room.findById(roomId);

                if (room) {


                    const userIdStr = userId.toString();


                    // Check if the user is banned
                    if (room.bannedUsers && room.bannedUsers.includes(userIdStr)) {
                        socket.emit("error", "You are banned from this room");
                        return;
                    }

                    // Add user to participants if not already added
                    if (!room.participants.includes(userIdStr)) {
                        room.participants.push(userIdStr);

                        // Assign the default role as "member" if not already assigned
                        if (!room.roles.has(userIdStr)) {
                            room.roles.set(userIdStr, "member");
                        }

                        await room.save();
                    }

                    // Join the room in Socket.IO
                    socket.userId = userId;
                    socket.join(roomId);

                    // Retrieve the user's role
                    const userRole = room.roles.get(userIdStr);

                    // Create a list of participants with their roles
                    const participants = room.participants.map((userId) => {
                        const role = room.roles.get(userId) || "member"; // Default to "member" if no role found
                        const user = { userId, role }; // Include role
                        return user;
                    });

                    // Emit participants list with roles to everyone in the room
                    io.to(roomId).emit("participantsUpdated", participants);

                    // Notify users in the room
                    io.to(roomId).emit("userJoined", { userId: userIdStr, roomId, role: userRole });

                    console.log(`User ${userIdStr} joined room ${roomId} with role ${userRole}`);
                } else {
                    socket.emit("error", "Room not found");
                }
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred");
            }
        });

        // Backend: Listen for when a user starts typing
        socket.on("startTyping", ({ roomId, userId }) => {
            console.log(`THis is working`);
            socket.to(roomId).emit("userTyping", { userId });
        });

        // Backend: Listen for when a user stops typing
        socket.on("stopTyping", ({ roomId, userId }) => {
            console.log(`This is stoping`);
            socket.to(roomId).emit("userStopTyping", { userId });
        });



        // Send a message
        socket.on("sendMessage", async ({ roomId, userId, username, message }) => {
            try {
                console.log({ message, userId });
                const room = await Room.findById(roomId);

                if (room && room.participants.includes(userId)) {
                    const userRole = room.roles.get(userId);  // Get the role of the user from the room's roles

                    const cleanMessage = leoProfanity.clean(message);

                    // Create a new message with the role included
                    const newMessage = new Message({
                        senderId: userId,
                        roomId,
                        message: cleanMessage,
                        username,
                        role: userRole  // Add the role to the message
                    });
                    await newMessage.save();

                    room.messages.push(newMessage._id);
                    await room.save();

                    // Emit the new message along with the sender's role
                    io.to(roomId).emit("newMessage", { senderId: userId, message: cleanMessage, username, role: userRole });
                } else {
                    socket.emit("error", "You are not a participant of this room");
                }
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred");
            }
        });

        socket.on("leaveRoom", async ({ roomId, userId }) => {
            try {
                const room = await Room.findById(roomId);
                if (room) {
                    // Remove the user from the participants list
                    room.participants = room.participants.filter((id) => id.toString() !== userId);

                    // Remove the user from roles as well
                    room.roles.delete(userId);

                    // Save the updated room
                    await room.save();

                    // Emit to the room that the user has left
                    io.to(roomId).emit("userLeft", { userId });

                    // Send the updated participants list to all users in the room
                    const updatedParticipants = room.participants.map(async (userIdStr) => {
                        const userRole = room.roles.get(userIdStr);
                        return { userId: userIdStr, role: userRole };
                    });

                    // Wait for all the participant data to be resolved
                    const participantsList = await Promise.all(updatedParticipants);

                    // Emit the updated participants list to all users in the room
                    io.to(roomId).emit("updateParticipantsList", participantsList);

                    // Leave the room in Socket.IO
                    socket.leave(roomId);

                    console.log(`User ${userId} left room ${roomId}`);
                }
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred");
            }
        });



        socket.on("deleteRoom", async ({ roomId, userId }) => {
            try {
                // Find the room by its ID
                const room = await Room.findById(roomId);
                // Check if the room exists
                if (!room) {
                    socket.emit("error", "Room not found");
                    return;
                }

                // Check if the user is a participant of the room
                if (!room.participants.includes(userId)) {
                    socket.emit("error", "You are not a participant of this room");
                    return;
                }

                // Delete all messages related to the room
                await Message.deleteMany({ roomId });

                // Delete the room
                await room.deleteOne();  // Remove the room from the database

                console.log(`Room ${roomId} and its messages have been deleted`);

                // Notify users that the room has been deleted
                io.emit("roomListUpdated");

            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred while trying to delete the room");
            }
        });



        socket.on("changeRole", async ({ roomId, adminId, targetUserId, newRole }) => {
            try {
                const room = await Room.findById(roomId);

                if (!room) {
                    socket.emit("error", "Room not found");
                    return;
                }

                if (!room.roles.has(adminId) || room.roles.get(adminId) !== "admin") {
                    socket.emit("error", "Only admins can change roles");
                    return;
                }

                if (!room.roles.has(targetUserId)) {
                    socket.emit("error", "User not found in the room");
                    return;
                }

                let updatedRole = newRole;

                // Apply role change rules
                if (newRole === "moderator") {
                    // Only an admin can promote someone to moderator
                    if (room.roles.get(adminId) === "admin") {
                        room.roles.set(targetUserId, "moderator");
                    }
                } else if (newRole === "member") {
                    // Admin can demote a moderator to member
                    if (room.roles.get(targetUserId) === "moderator") {
                        room.roles.set(targetUserId, "member");
                    }
                } else if (newRole === "admin") {
                    // If an admin makes someone else an admin, they get demoted to moderator
                    room.roles.set(targetUserId, "admin");
                    room.roles.set(adminId, "moderator");
                } else {
                    socket.emit("error", "Invalid role");
                    return;
                }

                await room.save();

                // Emit updated participant roles to the room
                const participants = room.participants.map((userId) => ({
                    userId,
                    role: room.roles.get(userId) || "member",
                }));

                io.to(roomId).emit("participantsUpdated", participants);

                console.log(`User ${targetUserId} is now a ${updatedRole} in room ${roomId}`);
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred while changing role");
            }
        });









        // Kick a user from the room
        socket.on("kickUser", async ({ roomId, adminId, targetUserId }) => {
            try {
                const room = await Room.findById(roomId);
                if (!room) {
                    socket.emit("error", "Room not found");
                    return;
                }

                if (!room.roles.has(adminId) || (room.roles.get(adminId) !== "admin" && room.roles.get(adminId) !== "moderator")) {
                    socket.emit("error", "Only admins or moderators can kick users");
                    return;
                }

                if (!room.participants.includes(targetUserId)) {
                    socket.emit("error", "User is not in this room");
                    return;
                }

                room.participants = room.participants.filter((id) => id !== targetUserId);
                room.roles.delete(targetUserId);
                await room.save();

                // Find the target user's socket
                const targetSocket = [...io.sockets.sockets.values()].find(
                    (s) => s.userId === targetUserId
                );
                console.log(`This is a target socket ${targetSocket}`);

                if (targetSocket) {
                    targetSocket.emit("youAreKicked", { roomId });
                    targetSocket.leave(roomId); // Force user to leave room
                }

                io.to(roomId).emit("userKicked", { targetUserId });
                console.log(`User ${targetUserId} was kicked from room ${roomId}`);
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred while kicking the user");
            }
        });

        // Ban a user from the room
        socket.on("banUser", async ({ roomId, adminId, targetUserId }) => {
            try {
                const room = await Room.findById(roomId);
                if (!room) {
                    socket.emit("error", "Room not found");
                    return;
                }

                if (!room.roles.has(adminId) || room.roles.get(adminId) !== "admin") {
                    socket.emit("error", "Only admins can ban users");
                    return;
                }

                if (room.bannedUsers.includes(targetUserId)) {
                    socket.emit("error", "User is already banned");
                    return;
                }

                room.participants = room.participants.filter((id) => id !== targetUserId);
                room.roles.delete(targetUserId);
                room.bannedUsers.push(targetUserId);
                await room.save();

                // Find the target user's socket
                const targetSocket = [...io.sockets.sockets.values()].find(
                    (s) => s.userId === targetUserId
                );

                if (targetSocket) {
                    targetSocket.emit("youAreBanned", { roomId });
                    targetSocket.leave(roomId); // Force user to leave room
                }

                io.to(roomId).emit("userBanned", { targetUserId });
                console.log(`User ${targetUserId} was banned from room ${roomId}`);
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred while banning the user");
            }
        });

        // Unban a user
        socket.on("unbanUser", async ({ roomId, adminId, targetUserId }) => {
            try {
                const room = await Room.findById(roomId);
                if (!room) {
                    socket.emit("error", "Room not found");
                    return;
                }

                if (!room.roles.has(adminId) || room.roles.get(adminId) !== "admin") {
                    socket.emit("error", "Only admins can unban users");
                    return;
                }

                room.bannedUsers = room.bannedUsers.filter((id) => id !== targetUserId);
                await room.save();

                io.to(roomId).emit("userUnbanned", { targetUserId });
                console.log(`User ${targetUserId} was unbanned from room ${roomId}`);
            } catch (err) {
                console.error(err);
                socket.emit("error", "An error occurred while unbanning the user");
            }
        });




        // Handle message deletion
        socket.on("deleteMessage", async ({ roomId, messageId, userId }) => {
            try {
              // Find the message to delete
              const message = await Message.findById(messageId);
              console.log(`This is the message:`, message);
              
              if (!message) {
                return socket.emit("error", "Message not found.");
              }
          
              // Get the room details with participants
              const room = await Room.findById(roomId).populate("participants.userId", "role"); // Ensure roles are populated
              if (!room) {
                return socket.emit("error", "Room not found.");
              }
          
              // Ensure `participants` exists before using `.find()`
              if (!room.participants || !Array.isArray(room.participants)) {
                return socket.emit("error", "Room participants data is missing.");
              }
          
              // Find participant's role in the room safely
              const participant = room.participants.find(p => p.userId && p.userId._id.toString() === userId);
          
              if (!participant || !participant.userId) {
                return socket.emit("error", "User not found in this room.");
              }
          
              const userRole = participant.userId.role; // ✅ Now userRole is safely assigned
              console.log(`This is user Role: ${userRole}`);
          
              // Role-based deletion logic
              if (userRole === "admin" || userRole === "moderator") {
                // ✅ Admin and Moderator can delete any message
                await message.remove();
                io.to(roomId).emit("messageDeleted", { messageId });
                console.log(`Message deleted by ${userRole} from room ${roomId}`);
              } else if (userRole === "member" && message.senderId.toString() === userId) {
                // ✅ Member can only delete their own message
                await message.remove();
                io.to(roomId).emit("messageDeleted", { messageId });
                console.log(`Message deleted by member from room ${roomId}`);
              } else {
                socket.emit("error", "You do not have permission to delete this message.");
              }
          
            } catch (err) {
              console.error("Error deleting message:", err);
              socket.emit("error", "An error occurred while deleting the message.");
            }
          });
          




        socket.on("disconnect", () => {
            console.log("A user disconnected:", socket.id);
        });
    });
};
