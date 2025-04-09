import mongoose, {Schema} from "mongoose";

const channelSchema = new Schema (
    {
        name: { 
            type: String, 
            required: true,
            enum: ["Email", "Web", "Social Media", "Live Chat"],
        },
        isActive: {
            type: Boolean,
            default: true
        },
        config: {
            // For email
            emailAddress: { type: String },
            emailPassword: { type: String },
            emailServer: { type: String },
            emailPort: { type: Number },
            
            // For social media
            platform: { type: String }, // Facebook, Twitter, etc.
            apiKey: { type: String },
            apiSecret: { type: String },
            accessToken: { type: String },
            
            // For chat
            widgetCode: { type: String },
            autoResponse: { type: Boolean, default: false },
            welcomeMessage: { type: String },
        },
        autoAssignTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

export const Channel = mongoose.model("Channel", channelSchema);