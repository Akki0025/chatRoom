import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    participants: [
        {
            type: String,
        },
    ],
    roles: {
        type: Map,
        of: String,
        default: {},
    },
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
    ],
    bannedUsers: [
        {
            type: String, // Store user IDs of banned users
        },
    ],
});

const Room = mongoose.model("Room", RoomSchema);
export default Room;

