import express from "express";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { Message } from "./msgModel";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const port = 3101;
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(bodyParser.json());

const io = new Server(server, { cors: { origin: "*" } });
mongoose.set("strictQuery", false);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

const getTTSBody = (message: string) => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      input: {
        text: message,
      },
      voice: {
        languageCode: "en-US",
        name: "en-US-Journey-O",
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
        // speakingRate: 1.5,
      },
      enableTimePointing: [1],
    }),
  };
};

async function getAIResponse(message: string) {
  const aiResponse = await fetch(
    `https://agent.api.eternalai.org/api/agent/${process.env
      .ETERNAL_AGENT_ID!}/chat/completions`,
    {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `${message}. (ALWAYS USE MAXIMUM 50 WORDS IN THE RESPONSE, NO MATTER WHAT THE PREVIOUS SENTENCE WOULD SAY)`,
          },
        ],
        agentId: process.env.ETERNAL_AGENT_ID!,
        max_completion_tokens: 1,
        max_tokens: 1,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ETERNAL_API_KEY!}`,
      },
    }
  );
  const aiResult = await aiResponse.json();
  return aiResult.result.choices[0].message.content;
}

async function processMessage(message: string) {
  try {
    //push message to dynamodb
    await Message.create({ message, context: "User" });
    //send message back to clients
    await io.emit("message", { data: message });
    //get the AI's response from  API
    const firstMessage = await getAIResponse(message);
    //push message to dynamodb
    await Message.create({ message: firstMessage, context: "kAia" });
    //send request to google TTS
    const res = await fetch(
      process.env.TTS_ENDPOINT! + ("?key=" + process.env.TTS_API_KEY!),
      getTTSBody(firstMessage)
    );
    const data = await res.json();
    if (res.status === 200 && data && data.audioContent) {
      //send tts response and src message
      await io.emit("response", { data, message: firstMessage });
    }
  } catch (error) {
    console.log("error", error);
  }
}

io.on("connection", (socket) => {
  console.log("client connected");
});

app.post("/sendMessage", limiter, (request, response) => {
  try {
    const message = request.body.message;
    processMessage(message);
    response.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    response.status(400).json({ success: false });
  }
});

app.get("/getMessages", async (_, response) => {
  try {
    const count = await Message.countDocuments({});
    const messages = await Message.find({}).skip(count > 30 ? count - 30 : 0);
    response.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.log(error);
    response.json({ success: false });
  }
});

//@ts-ignore
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

server.listen(port, async () => {
  // io.listen(port + 1);
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log(`Server is listening at the port: ${port}`);
});
