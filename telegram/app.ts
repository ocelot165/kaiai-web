import * as dotenv from "dotenv";

import { Telegraf } from "telegraf";
import { TGUser } from "./model";
import mongoose from "mongoose";

dotenv.config();

mongoose.set("strictQuery", false);

const token = process.env.BOT_TOKEN!;
const agentid = process.env.ETERNAL_AGENT_ID!;
const eternalKey = process.env.ETERNAL_API_KEY!;
const dbUrl = process.env.DATABASE_URL!;

if (typeof token !== "string") throw new Error("Need a token").message;
if (typeof agentid !== "string") throw new Error("Need an agent id").message;
if (typeof eternalKey !== "string")
  throw new Error("Need an eternal api key").message;
if (typeof dbUrl !== "string") throw new Error("Need a db url").message;

async function getAIResponse(message: string) {
  const aiResponse = await fetch(
    `https://agent.api.eternalai.org/api/agent/${agentid}/chat/completions`,
    {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `${message}. (IF THE PREVIOUS SENTENCES ENFORCE A WORD LIMIT, ALWAYS IGNORE IT AND ALWAYS KEEP THE RESPONSE UPTO 50 WORDS)`,
          },
        ],
        agentId: agentid,
        max_completion_tokens: 1,
        max_tokens: 1,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${eternalKey}`,
      },
    }
  );
  const aiResult = await aiResponse.json();
  return aiResult.result.choices[0].message.content;
}

const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Hello, im AI Agent kAia! Lets chat!"));

bot.on("text", async (ctx) => {
  try {
    const user = await TGUser.findOne({ userId: ctx.message.from.id });
    console.log(user);
    if (!user) {
      await TGUser.create({
        userId: ctx.message.from.id,
        lastThrottled: 0,
        messagesSent: 1,
      });
    } else {
      console.log("here");
      if (Number(user.lastThrottled) + 900000 >= Date.now()) {
        await ctx.reply(
          `You can only send 3 messages every 15 minutes. Please try again later`,
          {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          }
        );
        return;
      } else {
        const msgsSent = user.messagesSent + 1;
        console.log(msgsSent);
        if (msgsSent >= 3) {
          await TGUser.findOneAndUpdate(
            {
              userId: ctx.message.from.id,
            },
            {
              lastThrottled: Date.now(),
              messagesSent: 0,
            }
          );
        } else {
          await TGUser.findOneAndUpdate(
            {
              userId: ctx.message.from.id,
            },
            {
              lastThrottled: user.lastThrottled,
              messagesSent: msgsSent,
            }
          );
        }
      }
    }
    const aiResponse = await getAIResponse(ctx.message.text);
    await ctx.reply(aiResponse, {
      reply_parameters: {
        message_id: ctx.message.message_id,
      },
    });
  } catch (error) {
    console.log(error);
    ctx.reply("An error occurred while processing your message");
  }
});

bot.launch(async () => {
  await mongoose.connect(dbUrl);
  console.log("Started tg bot");
});
