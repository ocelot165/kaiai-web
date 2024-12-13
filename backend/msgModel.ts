import mongoose from "mongoose";

const MsgSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  context: {
    type: String,
    required: true,
  },
});

export const Message = mongoose.model("Message", MsgSchema);
