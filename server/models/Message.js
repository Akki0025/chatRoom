import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        username: {
            type: String,
            required: true, // Ensures the username is always stored
        },
        message: {
            type: String,
            required: true,
        },
        role: {  // Add role field
            type: String,  // Assuming the role is a string, e.g., "admin", "member"
            required: true, // Ensure role is always set
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
