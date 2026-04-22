// Must import a binding from @decky/api — Rollup marks the package "pure", so side-effect-only imports are tree-shaken away.
import { definePlugin } from "@decky/api";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  findSP,
  staticClasses,
} from "@decky/ui";
import { useEffect, useState } from "react";

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

/** Map cryptic Chromium errors when Battery API rejects (e.g. Game Mode restrictions). */
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
  refreshSeconds: 5,
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

const REFRESH_OPTIONS = [1, 2, 5, 10, 15, 30] as const;

function nextRefreshSeconds(current: number): number {
  const idx = REFRESH_OPTIONS.findIndex((s) => s === current);
  if (idx < 0) return REFRESH_OPTIONS[0];
  return REFRESH_OPTIONS[(idx + 1) % REFRESH_OPTIONS.length];
}

function useBatteryPoller(enabled: boolean, refreshSeconds: number) {
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
    }, Math.max(1000, refreshSeconds * 1000));

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, refreshSeconds]);

  return { status, loading };
}

/** Gamepad UI / game view — plugin panel lives in a different document, so overlays must attach here. */
function getSteamRootDocument(): Document {
  const sp = findSP();
  return sp?.document ?? document;
}

function removeOverlayNodes() {
  const id = OVERLAY_ID;
  document.getElementById(id)?.remove();
  const spDoc = findSP()?.document;
  spDoc?.getElementById(id)?.remove();
}

function overlayStyleForSettings(settings: Settings): Record<string, string> {
  const isLeft = settings.corner === "top-left";
  return {
    position: "fixed",
    top: "18px",
    left: isLeft ? "18px" : "auto",
    right: isLeft ? "auto" : "18px",
    zIndex: "2147483647",
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
  };
}

/** DOM overlay on the Gamepad UI document — not tied to React (Decky unmounts plugin UI when you leave the plugin or the QAM stack). */
function paintOverlayInSteamDom(settings: Settings, status: BatteryStatus | null) {
  const targetDoc = getSteamRootDocument();
  let host = targetDoc.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!host || host.ownerDocument !== targetDoc) {
    removeOverlayNodes();
    host = targetDoc.createElement("div");
    host.id = OVERLAY_ID;
    targetDoc.body.appendChild(host);
  }

  Object.assign(host.style, overlayStyleForSettings(settings));
  host.innerHTML = "";

  if (!settings.enabled) {
    host.style.display = "none";
    return;
  }

  host.style.display = "flex";

  const percent = status?.percent ?? 0;
  const charging = status?.isCharging ?? false;
  const remaining = formatRemaining(status?.minutesRemaining ?? null);

  const row = targetDoc.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = settings.compactMode ? "6px" : "8px";

  const icon = targetDoc.createElement("span");
  icon.textContent = charging ? `⚡ ${batteryGlyph(percent)}` : batteryGlyph(percent);

  const text = targetDoc.createElement("span");
  text.textContent = settings.showPercent
    ? `${percent}%${remaining ? ` · ${remaining}` : ""}`
    : remaining || (charging ? "Charging" : "Battery");

  row.appendChild(icon);
  if (settings.showPercent || remaining || charging) {
    row.appendChild(text);
  }
  host.appendChild(row);
}

type WindowWithBatteryDaemon = Window & {
  __batteryPeekDaemon?: { stop: () => void };
};

/**
 * Runs for the whole Steam session after the plugin loads.
 * Plugin React trees unmount when you back out of Battery Peek or when Decky hides the QAM panel — this keeps the pill over games.
 */
function startBatteryOverlayDaemon() {
  const w = window as WindowWithBatteryDaemon;
  if (w.__batteryPeekDaemon) return;

  let stopped = false;
  let timeoutId: number | undefined;
  let unbindBatteryEvents: (() => void) | undefined;

  const getBatteryManager = async () => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return null;
    try {
      return await nav.getBattery();
    } catch {
      return null;
    }
  };

  const tick = async () => {
    if (stopped) return;
    const settings = loadSettings();
    const status = await readBattery();
    paintOverlayInSteamDom(settings, status);

    timeoutId = window.setTimeout(() => {
      void tick();
    }, Math.max(1000, settings.refreshSeconds * 1000));
  };

  const bindBatteryEvents = async () => {
    const manager = await getBatteryManager();
    if (!manager) return;

    const onBatteryEvent = () => {
      void tick();
    };

    manager.addEventListener("chargingchange", onBatteryEvent);
    manager.addEventListener("levelchange", onBatteryEvent);
    manager.addEventListener("dischargingtimechange", onBatteryEvent);

    unbindBatteryEvents = () => {
      manager.removeEventListener("chargingchange", onBatteryEvent);
      manager.removeEventListener("levelchange", onBatteryEvent);
      manager.removeEventListener("dischargingtimechange", onBatteryEvent);
    };
  };

  void bindBatteryEvents();
  void tick();

  w.__batteryPeekDaemon = {
    stop: () => {
      stopped = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      unbindBatteryEvents?.();
      removeOverlayNodes();
      delete w.__batteryPeekDaemon;
    },
  };
}

function Content() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const { status, loading } = useBatteryPoller(settings.enabled, settings.refreshSeconds);

  const applySettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  return (
    <>
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
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => applySettings({ ...settings, refreshSeconds: nextRefreshSeconds(settings.refreshSeconds) })}
          >
            Refresh rate: {settings.refreshSeconds}s (tap to change)
          </ButtonItem>
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
  startBatteryOverlayDaemon();

  const content = <Content />;

  return {
    /** Keeps settings / live status updating when QAM is dismissed but you stay on this plugin. */
    alwaysRender: true,
    name: "Battery Peek",
    titleView: (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ fontSize: "1.15em", lineHeight: 1 }}>
          ⚡
        </span>
        <span>Battery Peek</span>
      </div>
    ),
    content,
    icon: (
      <span aria-hidden style={{ fontSize: "1.25em", lineHeight: 1 }}>
        ⚡
      </span>
    ),
    onDismount() {
      (window as WindowWithBatteryDaemon).__batteryPeekDaemon?.stop();
    },
  };
});
