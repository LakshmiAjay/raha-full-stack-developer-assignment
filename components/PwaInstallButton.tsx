"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null),
    [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches,
      navigatorStandalone = Boolean(
        (navigator as Navigator & { standalone?: boolean }).standalone,
      );
    setInstalled(standalone || navigatorStandalone);

    const capturePrompt = (event: Event) => {
        event.preventDefault();
        setPrompt(event as InstallPromptEvent);
      },
      markInstalled = () => {
        setInstalled(true);
        setPrompt(null);
      };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (!prompt || installed) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <button
      className="profile-menu-item"
      onClick={() => void install()}
      role="menuitem"
    >
      <Download size={15} /> Install app
    </button>
  );
}
