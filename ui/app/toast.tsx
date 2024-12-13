"use client";
import { useEffect } from "react";
import { useToastStore } from "../hooks/use-toast-store";
import { cn } from "./utils/cn";

const colorClasses = {
  Info: "text-white",
  Error: "text-lm-red",
  Success: "text-lm-green",
};

const Toast = () => {
  const { message, type, removeToast } = useToastStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      removeToast();
    }, 5000);
    return () => {
      clearTimeout(timeout);
    };
  }, [message, type, removeToast]);

  return message ? (
    <div className="flex flex-col max-w-[400px] whitespace-pre z-[11]	 text-balance fixed bottom-[16px] z-10 right-[16px] border-4 border-lm-orange border-dashed p-2 bg-lm-terminal-darkgray">
      <span className={cn("text-base", colorClasses[type])}>{type}</span>
      <span className="text-md text-lm-gray">{message}</span>
    </div>
  ) : null;
};

export default Toast;
