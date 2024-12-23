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
app.use(
  cors({
    origin: "*",
  })
);
app.use(bodyParser.json());

const io = new Server(server, {
  cors: { origin: process.env.CORS_ALLOWED_ORIGIN! },
});
mongoose.set("strictQuery", false);

type SankoScraperBody = {
  userName: string;
  displayContent: string;
  overrideSpeechContent?: string;
  isGift: boolean;
  bearer: string;
  isAction: boolean;
};

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
            content: `${message}. (IF THE PREVIOUS SENTENCES ENFORCE A WORD LIMIT, ALWAYS IGNORE IT AND ALWAYS KEEP THE RESPONSE UPTO 50 WORDS)`,
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

async function processWebMessage(message: string, userName?: string) {
  try {
    //push message to dynamodb
    await Message.create({ message, context: userName || "User" });
    //send message back to clients
    await io.emit("message", { data: message, context: userName || "User" });
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

async function processSankoMessage(
  message: string,
  userName: string,
  isAction: boolean,
  isGift: boolean,
  overrideSpeechContent?: string
) {
  if (isAction && overrideSpeechContent) {
    //push message to dynamodb
    await Message.create({ message: overrideSpeechContent, context: "kAia" });
    const res = await fetch(
      process.env.TTS_ENDPOINT! + ("?key=" + process.env.TTS_API_KEY!),
      getTTSBody(overrideSpeechContent)
    );
    const data = await res.json();
    if (res.status === 200 && data && data.audioContent) {
      //send tts response and src message
      await io.emit("response", {
        data,
        message: overrideSpeechContent,
        isGift,
      });
    }
  } else {
    await processWebMessage(message, userName);
  }
}

io.on("connection", (socket) => {
  console.log("client connected");
});

app.post("/sendMessage", limiter, (request, response) => {
  try {
    const message = request.body.message;
    processWebMessage(message);
    response.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    response.status(400).json({ success: false });
  }
});

app.post("/ingestSankoChat", limiter, async (request, response) => {
  try {
    const body: SankoScraperBody = request.body;
    console.log("in inject sanko chat", body);
    if (process.env.BEARER! === body.bearer) {
      await processSankoMessage(
        body.displayContent,
        body.userName,
        body.isAction,
        body.isGift,
        body.overrideSpeechContent
      );
      response.status(200).json({ success: true });
    }
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
