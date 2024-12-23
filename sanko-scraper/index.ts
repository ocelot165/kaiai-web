import Websocket from "websocket";
import dotenv from "dotenv";

dotenv.config();

type SocketData = {
  host: string;
  timestamp: string;
  eventHash: string;
  eventType: string;
  event: {
    attributes?: {
      name: string;
      giftName: string;
      quantity: string;
    };
    host: string;
    sender: {
      userId: string;
      attributes: {
        address: string;
        name: string;
        color: string;
        flair: string[];
      };
    };
    sendTime: string;
    content: string;
    emotes: Record<string, string>[];
  };
};

type SocketMSG = {
  event: string;
  data: SocketData;
};

var client = new Websocket.client();

client.on("connectFailed", function (error) {
  console.log("Connect Error: " + error.toString());
});

function handleMessage(e: SocketData) {
  const event = e.event;
  if (event.attributes && "GIFT" === e.eventType) {
    let { name, giftName, quantity } = event.attributes;

    const displayContent = `JUST MINTED ${parseInt(quantity) > 1 ? "" : "A"} ${
      parseInt(quantity) > 1 ? quantity : ""
    } ${giftName}${parseInt(quantity) > 1 ? "S" : ""}`;

    const overrideSpeechContent = `${name} ${displayContent}. Thank you for the donation!`;

    return {
      userName: name,
      displayContent,
      overrideSpeechContent,
      isGift: true,
      isAction: false,
    };
  } else if ("content" in event) {
    let content: string = event.content;
    if (content.includes("⇒")) return;
    const emotes =
      event?.emotes?.map((val) => `:${Object.keys(val)[0]}:`) || [];
    emotes.forEach((emote) => (content = content.replace(emote, "")));
    content = content.trim();
    if (!content.length) return;
    const userName = event?.sender?.attributes?.name;
    let isAction = e.eventType === "DICEROLL" || e.eventType === "COINFLIP";
    content = isAction ? `${userName} ${content}` : content;
    const overrideSpeechContent = isAction ? content : undefined;
    return {
      userName,
      displayContent: content,
      overrideSpeechContent,
      isGift: false,
      isAction,
    };
  }
}

client.on("connect", function (connection) {
  console.log("WebSocket Client Connected");

  connection.on("error", function (error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on("close", function () {
    console.log("echo-protocol Connection Closed");
  });
  connection.on("message", async function (message) {
    try {
      if (message.type === "utf8") {
        const msg = message.utf8Data;
        const parsedMessage: SocketMSG = JSON.parse(msg);
        console.log("parsed message", JSON.stringify(parsedMessage));
        switch (parsedMessage.event) {
          case "GIFT":
          case "CHAT":
          case "EMOTE":
          case "DICEROLL":
          case "COINFLIP": {
            const msg = handleMessage(parsedMessage.data);
            if (msg) {
              console.log(
                JSON.stringify({
                  ...msg,
                  bearer: process.env.BEARER_TOKEN!,
                })
              );
              const backendUrl = process.env.BACKEND_URL!;
              await fetch(`${backendUrl}/ingestSankoChat`, {
                method: "POST",
                body: JSON.stringify({
                  ...msg,
                  bearer: process.env.BEARER_TOKEN!,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              });
              console.log("processed message", msg);
            } else {
              console.log("invalid message");
            }
          }
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  });
});

client.connect(
  "wss://chat.sanko.tv/ws?streamerAddress=0xb651043fba75092a9de3a6d501f99cad5ccb3035",
  "echo-protocol",
  "https://sanko.tv",
  {
    cookie: process.env.SANKO_COOKIES!,
    origin: "https://sanko.tv",
  }
);
