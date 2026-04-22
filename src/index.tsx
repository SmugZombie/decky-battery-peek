import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  definePlugin,
  staticClasses,
} from "@decky/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaBolt } from "react-icons/fa";

type BatteryStatus = {
  percent: number;
  status: string;
  isCharging: boolean;
  energyNow: number;
  energyFull: number;
  powerNow: number;
  minutesRemaining: number | null;
  error?: string;
};

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  }>;
};

/** Avoid `callable()` / `@decky/api` — those bridge calls surface as TypeError "Failed to fetch" when WS flakes. sysfs is unreadable from JS anyway. */
function batteryMessageFallback(raw: string): string {
  if (/failed to fetch/i.test(raw)) {
    return "Battery read blocked in this shell (often a Chromium / Game Mode limitation). Try Desktop Mode or Steam OS Beta updates.";
  }
  return raw;
}

async function readBattery(): Promise<BatteryStatus> {
  const nav = navigator as NavigatorWithBattery;
  if (!nav.getBattery) {
    return {
      percent: 0,
      status: "Unavailable",
      isCharging: false,
      energyNow: 0,
      energyFull: 0,
      powerNow: 0,
      minutesRemaining: null,
      error:
        "This Steam UI does not expose the Battery API (navigator.getBattery). Percent may not appear here.",
    };
  }
  try {
    const bm = await nav.getBattery();
    const percent = Math.max(0, Math.min(100, Math.round(bm.level * 100)));
    const charging = bm.charging;
    let minutesRemaining: number | null = null;
    if (!charging && Number.isFinite(bm.dischargingTime) && bm.dischargingTime !== Number.POSITIVE_INFINITY) {
      minutesRemaining = Math.max(0, Math.round(bm.dischargingTime / 60));
    }
    return {
      percent,
      status: charging ? "Charging" : "Discharging",
      isCharging: charging,
      energyNow: 0,
      energyFull: 0,
      powerNow: 0,
      minutesRemaining,
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      percent: 0,
      status: "Unknown",
      isCharging: false,
      energyNow: 0,
      energyFull: 0,
      powerNow: 0,
      minutesRemaining: null,
      error: batteryMessageFallback(raw),
    };
  }
}

const OVERLAY_ID = "battery-peek-overlay";
const STORAGE_KEY = "battery-peek-settings";

const defaultSettings = {
  enabled: true,
  showPercent: true,
  compactMode: false,
  corner: "top-right" as "top-right" | "top-left",
};

type Settings = typeof defaultSettings;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) } as Settings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function formatRemaining(minutesRemaining: number | null): string {
  if (minutesRemaining == null || minutesRemaining < 0) return "";
  const hours = Math.floor(minutesRemaining / 60);
  const minutes = minutesRemaining % 60;
  if (hours <= 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m left`;
}

function batteryGlyph(percent: number): string {
  if (percent >= 90) return "▰▰▰▰";
  if (percent >= 65) return "▰▰▰▱";
  if (percent >= 35) return "▰▰▱▱";
  if (percent >= 15) return "▰▱▱▱";
  return "▱▱▱▱";
}

function useBatteryPoller(enabled: boolean) {
  const [status, setStatus] = useState<BatteryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const refresh = async () => {
      const next = await readBattery();
      if (!cancelled) {
        setStatus(next);
        setLoading(false);
      }
    };

    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void refresh();
    timer = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled]);

  return { status, loading };
}

function FloatingBatteryOverlay({
  status,
  settings,
}: {
  status: BatteryStatus | null;
  settings: Settings;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const overlayStyle = useMemo(() => {
    const isLeft = settings.corner === "top-left";
    return {
      position: "fixed",
      top: "18px",
      left: isLeft ? "18px" : "auto",
      right: isLeft ? "auto" : "18px",
      zIndex: "999999",
      pointerEvents: "none",
      display: settings.enabled ? "flex" : "none",
      alignItems: "center",
      gap: settings.compactMode ? "6px" : "8px",
      padding: settings.compactMode ? "3px 8px" : "5px 10px",
      borderRadius: "999px",
      background: "rgba(0, 0, 0, 0.52)",
      color: "#ffffff",
      border: "1px solid rgba(255,255,255,0.16)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
      fontSize: settings.compactMode ? "12px" : "14px",
      fontWeight: "700",
      lineHeight: "1",
      letterSpacing: "0.02em",
      opacity: "0.95",
      userSelect: "none",
      maxWidth: "35vw",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    } as const;
  }, [settings]);

  useEffect(() => {
    let host = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    if (!host) {
      host = document.createElement("div");
      host.id = OVERLAY_ID;
      document.body.appendChild(host);
    }
    mountRef.current = host;

    Object.assign(host.style, overlayStyle);
    host.innerHTML = "";

    if (!settings.enabled) {
      host.style.display = "none";
      return;
    }

    host.style.display = "flex";

    const percent = status?.percent ?? 0;
    const charging = status?.isCharging ?? false;
    const remaining = formatRemaining(status?.minutesRemaining ?? null);

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.gap = settings.compactMode ? "6px" : "8px";

    const icon = document.createElement("span");
    icon.textContent = charging ? `⚡ ${batteryGlyph(percent)}` : batteryGlyph(percent);

    const text = document.createElement("span");
    text.textContent = settings.showPercent
      ? `${percent}%${remaining ? ` · ${remaining}` : ""}`
      : remaining || (charging ? "Charging" : "Battery");

    content.appendChild(icon);
    if (settings.showPercent || remaining || charging) {
      content.appendChild(text);
    }
    host.appendChild(content);

    return () => {
      host!.innerHTML = "";
    };
  }, [overlayStyle, settings, status]);

  return null;
}

function Content() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const { status, loading } = useBatteryPoller(settings.enabled);

  const applySettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  return (
    <>
      <FloatingBatteryOverlay status={status} settings={settings} />
      <PanelSection title="Overlay">
        <PanelSectionRow>
          <ToggleField
            checked={settings.enabled}
            label="Enable overlay"
            description="Show the floating battery pill while playing."
            onChange={(value: boolean) => applySettings({ ...settings, enabled: value })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            checked={settings.showPercent}
            label="Show percentage"
            description="Display the exact battery percent inside the overlay."
            onChange={(value: boolean) => applySettings({ ...settings, showPercent: value })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            checked={settings.compactMode}
            label="Compact mode"
            description="Reduce padding and text size to block even less of the screen."
            onChange={(value: boolean) => applySettings({ ...settings, compactMode: value })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Position">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => applySettings({
              ...settings,
              corner: settings.corner === "top-right" ? "top-left" : "top-right",
            })}
          >
            Move to {settings.corner === "top-right" ? "top left" : "top right"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Live status">
        <PanelSectionRow>
          <div className={staticClasses.Text}>{loading ? "Loading battery…" : `${status?.percent ?? 0}%`}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className={staticClasses.Text}>{status?.status ?? "Unknown"}</div>
        </PanelSectionRow>
        {status?.minutesRemaining != null && !status?.isCharging ? (
          <PanelSectionRow>
            <div className={staticClasses.Text}>{formatRemaining(status.minutesRemaining)}</div>
          </PanelSectionRow>
        ) : null}
        {status?.error ? (
          <PanelSectionRow>
            <div className={staticClasses.Text}>{status.error}</div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  const content = <Content />;

  return {
    name: "Battery Peek",
    titleView: (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FaBolt />
        <span>Battery Peek</span>
      </div>
    ),
    content,
    icon: <FaBolt />,
    onDismount() {
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay?.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    },
  };
});
