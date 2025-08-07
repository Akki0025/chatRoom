import Message from "../models/Message.js";
import Room from "../models/Room.js";

export const getMessagesByRoom = async (req, res) => {
    const { roomId } = req.params;
    try {
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Get all messages for the room
        const messages = await Message.find({ roomId });

        // Get roles of all participants in the room
        const userRoles = room.roles; // Assuming `roles` is a Map storing userId -> role

        // Attach roles to each message based on senderId
        const messagesWithRoles = messages.map((message) => {
            const role = userRoles.get(message.senderId.toString()) || "member"; // Default to "member" if no role is found
            return { ...message.toObject(), role }; // Convert message to plain object and add the role
        });

        res.json({ messages: messagesWithRoles, roomName: room.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
