"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TalkingHead } from "@/app/lib/talkingHead/talkinghead";
import Input from "./components/input";
import Button from "./components/button";
import { io, Socket } from "socket.io-client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { moodTemplates, poseTemplates } from "./constants/poseTemplates";
import Toast from "./toast";
import { useToastStore } from "../hooks/use-toast-store";
import Footer from "./components/footer";
import { dances } from "./constants/dances";
import YouTube from "react-youtube";

interface EV {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

interface ChatMsgProps {
  message: string;
  context?: string;
}

const danceUrls = dances.map((val) => `/${val}.fbx`);

function ChatMsg({ message, context = "User" }: ChatMsgProps) {
  return (
    <div className="p-2  bg-lm-dark-gray">
      <div className="flex flex-row gap-2 items-center">
        <p className="text-lm-gray">{">"}</p>
        <p className="text-lm-orange">{context}</p>
      </div>
      <span>{message}</span>
    </div>
  );
}

const opts = {
  height: "390",
  width: "640",
  playerVars: {
    autoplay: 1,
    loop: 1,
    volume: 10,
  },
};

export default function Home() {
  const head = useRef<TalkingHead>();
  const nodeAvatarRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket>();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();

  const [danceLoadingStates, updateDanceLoadingStates] = useState<number[]>(
    dances.map(() => 0)
  );
  const [danceDropdownOpened, setDanceDropdownOpened] = useState(false);
  const [dropdownOpened, setDropdownOpened] = useState(false);
  const [moodDropdownOpened, setMoodDropdownOpened] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>[]>([]);

  const [modelLoadState, setModelLoadState] = useState(0);
  const [sceneLoadState, setSceneLoadState] = useState(0);
  const [initialInteractionComplete, setInitialInteractionComplete] =
    useState(false);

  const danceStateLoaded =
    danceLoadingStates.reduce((prev, curr) => prev + curr, 0) / dances.length;
  const average = (modelLoadState + sceneLoadState + danceStateLoaded) / 3;
  const isLoaded = average === 100;
  const [text, setText] = useState("");

  const onProgressDanceCallbacks = useMemo(() => {
    return dances.map((_, index) => (ev: EV) => {
      updateDanceLoadingStates((state) => {
        if (ev.lengthComputable) {
          const copy = [...state];
          const val = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
          copy[index] = val;
          return copy;
        }
        return state;
      });
    });
  }, [updateDanceLoadingStates]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    async function f() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND!}/getMessages`,
          {
            method: "GET",
          }
        );

        if (res.status === 200) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.log(error);
      }
    }
    f();
  }, []);

  useEffect(() => {
    if (head.current) return;
    async function f() {
      if (!head.current && nodeAvatarRef.current) {
        head.current = new TalkingHead(nodeAvatarRef.current, {
          ttsEndpoint: "-",
          ttsApikey: "-",
          lipsyncModules: ["en", "fi"],
          cameraView: "upper",
        });
        head.current.showAvatar(
          {
            url: "https://models.readyplayer.me/6759b38810bdb9775a6e5aa3.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png",
            body: "F",
            avatarMood: "neutral",
            ttsLang: "en-GB",
            ttsVoice: "en-GB-Standard-A",
            lipsyncLang: "en",
          },
          (ev: EV) => {
            if (ev.lengthComputable) {
              const val = Math.min(
                100,
                Math.round((ev.loaded / ev.total) * 100)
              );
              setModelLoadState(val);
            }
          }
        );
        head.current.showEnvironment("/modern_bedroom.glb", (ev: EV) => {
          return setSceneLoadState((ev.loaded / 16820168) * 100);
        });
        head.current.loadAnimations(danceUrls, onProgressDanceCallbacks);
      }
    }
    f();
  }, [onProgressDanceCallbacks]);

  useEffect(() => {
    if (socketRef.current) return;
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_BACKEND!);

    function setMsg({ data, context }: { data: string; context: string }) {
      setMessages((msgs: Record<string, string>[]) => [
        ...msgs,
        { message: data, context: context || "User" },
      ]);
    }

    function onResponse({ data, message }: { data: string; message: string }) {
      if (head.current) {
        head.current.stopSpeaking();
        head.current.speakText(message, data);
      }
      setMessages((msgs: Record<string, string>[]) => [
        ...msgs,
        { message: message, context: "kAia" },
      ]);
    }

    socketRef.current.on("message", setMsg);
    socketRef.current.on("response", onResponse);
  }, []);

  const onClick = useCallback(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND!}/sendMessage`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      setText("");
    } catch (error) {
      addToast("Rate limit hit, try again in 15 minutes", "Error");
      console.log(error);
    }
  }, [text, addToast]);

  return (
    <div className="grid grid-cols-7 h-dvh">
      <Toast />
      <div className="bg-lm-terminal-gray h-[40px] col-span-7 flex flex-row justify-between items-center px-2">
        <span>{`KaiAI chat terminal`}</span>
        <div className="flex items-center gap-2">
          {" "}
          <DropdownMenu.Root
            open={danceDropdownOpened}
            onOpenChange={setDanceDropdownOpened}
          >
            <DropdownMenu.Trigger>
              <Button className="p-1 h-[30px]">Dances</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="border-2 flex flex-col space-y-2 border-dashed border-lm-orange bg-lm-terminal-darkgray max-h-[200px] overflow-auto">
              {dances.map((template) => {
                return (
                  <p
                    onClick={() => {
                      if (head.current)
                        head.current.playAnimation(`/${template}.fbx`);
                      setDanceDropdownOpened(false);
                    }}
                    className="cursor-pointer hover:bg-lm-terminal-gray p-2"
                    key={template}
                  >
                    {template}
                  </p>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <DropdownMenu.Root
            open={moodDropdownOpened}
            onOpenChange={setMoodDropdownOpened}
          >
            <DropdownMenu.Trigger>
              <Button className="p-1 h-[30px]">Mood</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="border-2 flex flex-col space-y-2 border-dashed border-lm-orange bg-lm-terminal-darkgray max-h-[200px] overflow-auto">
              {moodTemplates.map((template) => {
                return (
                  <p
                    onClick={() => {
                      if (head.current) head.current.setMood(template);
                      setMoodDropdownOpened(false);
                    }}
                    className="cursor-pointer hover:bg-lm-terminal-gray p-2"
                    key={template}
                  >
                    {template}
                  </p>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <DropdownMenu.Root
            open={dropdownOpened}
            onOpenChange={setDropdownOpened}
          >
            <DropdownMenu.Trigger>
              <Button className="p-1 h-[30px]">Poses</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="border-2 flex flex-col space-y-2 border-dashed border-lm-orange bg-lm-terminal-darkgray max-h-[200px] overflow-auto">
              {poseTemplates.map((template) => {
                return (
                  <p
                    onClick={() => {
                      if (head.current) {
                        head.current.poseType = template;
                        head.current.setPoseFromTemplate(
                          //@ts-expect-error eee
                          head.current.poseTemplates[template]
                        );
                      }
                      setDropdownOpened(false);
                    }}
                    className="cursor-pointer hover:bg-lm-terminal-gray p-2"
                    key={template}
                  >
                    {template}
                  </p>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
      {!initialInteractionComplete && (
        <div className="fixed w-full h-dvh bg-lm-terminal-darkgray flex flex-col gap-2 items-center justify-center">
          {!isLoaded ? (
            <div className="flex flex-col gap-2 text-center">
              <span>Loading</span>
              <span>{`${average.toFixed(0)}%`}</span>
            </div>
          ) : (
            <Button
              className="bg-lm-orange text-black hover:text-black"
              onClick={() => setInitialInteractionComplete(true)}
            >
              Enter
            </Button>
          )}
        </div>
      )}
      <div
        ref={nodeAvatarRef}
        className="xs:col-span-7 md:col-span-5 h-full max-h-[calc(100dvh-70px)] xs:h-[50dvh] md:h-[calc(100dvh-70px)]"
      >
        {initialInteractionComplete && (
          <div className="hidden">
            <YouTube
              videoId="VXY2P8vKgV4"
              opts={opts}
              onReady={(e: { target: { setVolume: (c: number) => void } }) => {
                e.target.setVolume(10);
              }}
            />
          </div>
        )}
      </div>
      <div
        id="controls"
        className="z-1 xs:col-span-7 md:col-span-2 flex flex-col justify-between max-h-[calc(100dvh-70px)] xs:h-[calc(50dvh-70px)] md:h-[calc(100dvh-30px)]"
      >
        <div
          ref={messageContainerRef}
          className="flex flex-col gap-1 overflow-scroll p-1 bg-lm-terminal-darkgray overflow-x-hidden"
        >
          {messages.map((val, index) => (
            <ChatMsg
              key={`${val.message}-${val.context}-${index}`}
              context={val.context}
              message={val.message}
            />
          ))}
        </div>
        <div className="flex items-stretch p-1 bg-lm-terminal-darkgray">
          <Input
            value={text}
            onValueChange={(e) => setText(e.target.value)}
            placeholder="Enter Message"
          />
          <Button
            className="bg-lm-orange text-black hover:text-black"
            onClick={onClick}
            disabled={text === "" || !text}
          >
            Send
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
