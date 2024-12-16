import mongoose from "mongoose";

const TGUserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  messagesSent: {
    type: Number,
    required: true,
  },
  lastThrottled: {
    type: String,
    required: true,
  },
});

export const TGUser = mongoose.model("TGUser", TGUserSchema);
