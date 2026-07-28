import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Sonner Toaster 封装，适配 PiDeck 主题系统。
 *
 * 从 document.documentElement.dataset.theme 读取当前主题（"light" | "dark"），
 * 并监听变化同步更新。不依赖 next-themes。
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof document === "undefined") return "system";
    return (document.documentElement.dataset.theme as "light" | "dark") || "system";
  });

  useEffect(() => {
    // 监听 data-theme 属性变化，同步更新 sonner 主题
    const observer = new MutationObserver(() => {
      const t = document.documentElement.dataset.theme;
      if (t === "light" || t === "dark") setTheme(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      closeButton
      richColors
      style={
        {
          "--normal-bg": "var(--color-bg-panel)",
          "--normal-text": "var(--color-text-primary)",
          "--normal-border": "var(--color-border-default)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
