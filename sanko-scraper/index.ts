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

    const content = `JUST MINTED ${parseInt(quantity) > 1 ? "" : "A"} ${
      parseInt(quantity) > 1 ? quantity : ""
    } ${giftName}${parseInt(quantity) > 1 ? "S" : ""}`;

    return { userName: name, content, isAction: true };
  } else if ("content" in event) {
    if (event.content.includes("⇒")) return;
    const userName = event?.sender?.attributes?.name;
    const content = event.content;
    let isAction = false;
    return { userName, content, isAction };
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
  connection.on("message", function (message) {
    try {
      if (message.type === "utf8") {
        const msg = message.utf8Data;
        const parsedMessage: SocketMSG = JSON.parse(msg);
        console.log("parsed message", parsedMessage);
        switch (parsedMessage.event) {
          case "GIFT":
          case "CHAT":
          case "EMOTE":
          case "DICEROLL":
          case "COINFLIP": {
            const msg = handleMessage(parsedMessage.data);
            console.log("processed message", msg);
          }
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  });
});

client.connect(
  "wss://chat.sanko.tv/ws?streamerAddress=0xb47b16d12e0b235b77bb3b3183e379a46e812450",
  "echo-protocol",
  "https://sanko.tv",
  {
    cookie: process.env.SANKO_COOKIES!,
    origin: "https://sanko.tv",
  }
);
