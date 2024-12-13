import { create } from "zustand";

type ToastType = "Info" | "Success" | "Error";

type Store = {
  message: string | null;
  type: ToastType;
};

type Actions = {
  addToast: (message: string, type: ToastType) => void;
  removeToast: () => void;
};

export const useToastStore = create<Store & Actions>()((set) => ({
  message: null,
  type: "Info",
  addToast(message, type) {
    set({
      message,
      type,
    });
  },
  removeToast() {
    set({
      message: null,
      type: "Info",
    });
  },
}));
