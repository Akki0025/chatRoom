import Room from "../models/Room.js";

export const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

export const getRoomDetails = async (req, res) => {
    const { roomId } = req.params;
    try {
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};


export const createRoom = async (req, res) => {
    const { name, userId } = req.body; // Include userId in the request body
    try {
        const newRoom = new Room({ 
            name, 
            participants: [userId], // Add the creator as a participant
            messages: [], 
            roles: { [userId]: "admin" }, // Assign the creator as the admin
            bannedUsers: [] // Initialize the bannedUsers array as empty
        });
        await newRoom.save();
        res.status(201).json(newRoom);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
