import * as dotenv from "dotenv";

import { Context, NarrowedContext, Telegraf } from "telegraf";
import { TGUser } from "./model";
import mongoose from "mongoose";
import { Message, Update } from "telegraf/typings/core/types/typegram";

dotenv.config();

mongoose.set("strictQuery", false);

const excludedIDs: number[] = [];

const token = process.env.BOT_TOKEN!;
const agentid = process.env.ETERNAL_AGENT_ID!;
const eternalKey = process.env.ETERNAL_API_KEY!;
const dbUrl = process.env.DATABASE_URL!;
const groupId = process.env.GROUP_ID!;

if (typeof token !== "string") throw new Error("Need a token").message;
if (typeof agentid !== "string") throw new Error("Need an agent id").message;
if (typeof eternalKey !== "string")
  throw new Error("Need an eternal api key").message;
if (typeof dbUrl !== "string") throw new Error("Need a db url").message;
if (typeof groupId !== "string") throw new Error("Need a group id").message;

function probability(n: number) {
  return Math.random() < n;
}

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

const tgReply = async (
  ctx: NarrowedContext<
    Context<Update>,
    {
      message: Update.New & Update.NonChannel & Message.TextMessage;
      update_id: number;
    }
  >,
  userId: string | number,
  messageId: number,
  text: string,
  messagesPerWindow: number,
  rateLimitTime: number,
  replyOnError: boolean = true,
  customThrottleMessage?: string
) => {
  try {
    const user = await TGUser.findOne({ userId: userId });
    if (!user) {
      await TGUser.create({
        userId: userId,
        lastThrottled: 0,
        messagesSent: 1,
      });
    } else {
      if (Number(user.lastThrottled) + rateLimitTime >= Date.now()) {
        await ctx.reply(
          customThrottleMessage ||
            `You can only send 3 messages every 15 minutes. Please try again later`,
          {
            reply_parameters: {
              message_id: messageId as number,
            },
          }
        );
        return;
      } else {
        const msgsSent = user.messagesSent + 1;
        if (msgsSent >= messagesPerWindow) {
          await TGUser.findOneAndUpdate(
            {
              userId: userId,
            },
            {
              lastThrottled: Date.now(),
              messagesSent: 0,
            }
          );
        } else {
          await TGUser.findOneAndUpdate(
            {
              userId: userId,
            },
            {
              lastThrottled: user.lastThrottled,
              messagesSent: msgsSent,
            }
          );
        }
      }
    }
    const aiResponse = await getAIResponse(text);
    await ctx.reply(aiResponse, {
      reply_parameters: {
        message_id: messageId as number,
      },
    });
  } catch (error) {
    console.log(error);
    if (replyOnError) {
      ctx.reply("An error occurred while processing your message");
    }
  }
};

const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Hello, im AI Agent kAia! Lets chat!"));

bot.mention("@AiAgentkAiaBot", async (ctx) => {
  if (Number(groupId) === ctx.chat.id) {
    if (ctx.message && (ctx.message as any).text) {
      if (!excludedIDs.includes(ctx.message.from.id)) {
        const entities = ctx.entities();
        for (const entity of entities) {
          if (entity.type === "mention") {
            if (entity.offset !== 0)
              return ctx.reply(
                "I dont respond to incorrently formatted messages honey. Tag me only at the start of the message"
              );
          }
        }
        await tgReply(
          ctx as any,
          "groupMention",
          ctx.message.message_id,
          ((ctx.message as any).text as string)
            .slice("@AiAgentkAiaBot".length)
            .trim(),
          5,
          60000,
          false,
          "Im being overwhelmed with messages right now! I Need to take a break. I'll be back in 1 minute."
        );
      }
    }
  }
});

bot.on("text", async (ctx) => {
  if (ctx.chat.type === "private") {
    await tgReply(
      ctx,
      ctx.message.from.id,
      ctx.message.message_id,
      ctx.message.text,
      3,
      900000
    );
  } else {
    if (Number(groupId) === ctx.chat.id) {
      if (!excludedIDs.includes(ctx.message.from.id)) {
        const entities = ctx.entities();
        if (entities.length) return;
        if (probability(0.1)) {
          await tgReply(
            ctx as any,
            "randomMsg",
            ctx.message.message_id,
            ctx.message.text,
            5,
            0,
            false,
            ""
          );
        }
      }
    }
  }
});

async function sendRandomThought() {
  try {
    const aiResponse = await getAIResponse("Give us a random thought");
    await bot.telegram.sendMessage(groupId, aiResponse);
  } catch (error) {
    console.log("error", error);
  }
}

bot.launch(async () => {
  await mongoose.connect(dbUrl);
  setInterval(async () => {
    sendRandomThought();
  }, 3600000);
  sendRandomThought();
  console.log("Started tg bot");
});
