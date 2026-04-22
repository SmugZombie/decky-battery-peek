const manifest = {"name":"decky-battery-peek"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

/** Map cryptic Chromium errors when Battery API rejects (e.g. Game Mode restrictions). */
function batteryMessageFallback(raw) {
    if (/failed to fetch/i.test(raw)) {
        return "Battery read blocked in this shell (often a Chromium / Game Mode limitation). Try Desktop Mode or Steam OS Beta updates.";
    }
    return raw;
}
async function readBattery() {
    const nav = navigator;
    if (!nav.getBattery) {
        return {
            percent: 0,
            status: "Unavailable",
            isCharging: false,
            energyNow: 0,
            energyFull: 0,
            powerNow: 0,
            minutesRemaining: null,
            error: "This Steam UI does not expose the Battery API (navigator.getBattery). Percent may not appear here.",
        };
    }
    try {
        const bm = await nav.getBattery();
        const percent = Math.max(0, Math.min(100, Math.round(bm.level * 100)));
        const charging = bm.charging;
        let minutesRemaining = null;
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
    }
    catch (e) {
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
    corner: "top-right",
    refreshSeconds: 5,
};
function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return defaultSettings;
        return { ...defaultSettings, ...JSON.parse(raw) };
    }
    catch (_a) {
        return defaultSettings;
    }
}
function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
function formatRemaining(minutesRemaining) {
    if (minutesRemaining == null || minutesRemaining < 0)
        return "";
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    if (hours <= 0)
        return `${minutes}m left`;
    return `${hours}h ${minutes}m left`;
}
function batteryGlyph(percent) {
    if (percent >= 90)
        return "▰▰▰▰";
    if (percent >= 65)
        return "▰▰▰▱";
    if (percent >= 35)
        return "▰▰▱▱";
    if (percent >= 15)
        return "▰▱▱▱";
    return "▱▱▱▱";
}
const REFRESH_OPTIONS = [1, 2, 5, 10, 15, 30];
function nextRefreshSeconds(current) {
    const idx = REFRESH_OPTIONS.findIndex((s) => s === current);
    if (idx < 0)
        return REFRESH_OPTIONS[0];
    return REFRESH_OPTIONS[(idx + 1) % REFRESH_OPTIONS.length];
}
function useBatteryPoller(enabled, refreshSeconds) {
    const [status, setStatus] = SP_REACT.useState(null);
    const [loading, setLoading] = SP_REACT.useState(true);
    SP_REACT.useEffect(() => {
        let cancelled = false;
        let timer;
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
            if (timer)
                window.clearInterval(timer);
        };
    }, [enabled, refreshSeconds]);
    return { status, loading };
}
const asRecord = (v) => v && typeof v === "object" ? v : undefined;
function docFromUnknown(value) {
    var _a, _b;
    if (!value || typeof value !== "object")
        return null;
    const rec = value;
    const fromDirect = rec.document;
    if (fromDirect && typeof fromDirect === "object" && "createElement" in fromDirect) {
        return fromDirect;
    }
    const fromWindowDoc = (_a = rec.window) === null || _a === void 0 ? void 0 : _a.document;
    if (fromWindowDoc && typeof fromWindowDoc === "object" && "createElement" in fromWindowDoc) {
        return fromWindowDoc;
    }
    const popup = rec.m_popup;
    const popupDoc = popup === null || popup === void 0 ? void 0 : popup.document;
    if (popupDoc && typeof popupDoc === "object" && "createElement" in popupDoc) {
        return popupDoc;
    }
    const popupWinDoc = (_b = popup === null || popup === void 0 ? void 0 : popup.window) === null || _b === void 0 ? void 0 : _b.document;
    if (popupWinDoc && typeof popupWinDoc === "object" && "createElement" in popupWinDoc) {
        return popupWinDoc;
    }
    return null;
}
/** Steam has multiple UI windows/layers. Paint into every plausible document so one survives when QAM closes. */
function getCandidateSteamDocuments() {
    var _a, _b, _c;
    const docs = [];
    const addDoc = (d) => {
        if (!d)
            return;
        if (!docs.includes(d))
            docs.push(d);
    };
    addDoc(document);
    addDoc((_a = DFL.findSP()) === null || _a === void 0 ? void 0 : _a.document);
    const winRec = window;
    const focused = asRecord(winRec.SteamUIStore);
    const focusedInst = (_c = (_b = focused === null || focused === void 0 ? void 0 : focused.GetFocusedWindowInstance) === null || _b === void 0 ? void 0 : _b.call(focused)) !== null && _c !== void 0 ? _c : focused === null || focused === void 0 ? void 0 : focused.m_FocusedWindowInstance;
    addDoc(docFromUnknown(focusedInst));
    addDoc(docFromUnknown(winRec.GamepadUIMainWindowInstance));
    const routerRec = DFL.Router;
    const windowStore = asRecord(routerRec.WindowStore);
    addDoc(docFromUnknown(windowStore));
    addDoc(docFromUnknown(windowStore === null || windowStore === void 0 ? void 0 : windowStore.GamepadUIMainWindowInstance));
    const steamWindows = windowStore === null || windowStore === void 0 ? void 0 : windowStore.SteamUIWindows;
    if (Array.isArray(steamWindows)) {
        for (const w of steamWindows)
            addDoc(docFromUnknown(w));
    }
    return docs;
}
function removeOverlayNodes() {
    var _a;
    for (const d of getCandidateSteamDocuments()) {
        (_a = d.getElementById(OVERLAY_ID)) === null || _a === void 0 ? void 0 : _a.remove();
    }
}
function overlayStyleForSettings(settings) {
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
function paintOverlayInDocument(targetDoc, settings, status) {
    var _a, _b, _c;
    let host = targetDoc.getElementById(OVERLAY_ID);
    if (!host) {
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
    const percent = (_a = status === null || status === void 0 ? void 0 : status.percent) !== null && _a !== void 0 ? _a : 0;
    const charging = (_b = status === null || status === void 0 ? void 0 : status.isCharging) !== null && _b !== void 0 ? _b : false;
    const remaining = formatRemaining((_c = status === null || status === void 0 ? void 0 : status.minutesRemaining) !== null && _c !== void 0 ? _c : null);
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
/** DOM overlay not tied to React (Decky can unmount plugin UI when you leave the plugin/QAM). */
function paintOverlayInSteamDom(settings, status) {
    for (const targetDoc of getCandidateSteamDocuments()) {
        paintOverlayInDocument(targetDoc, settings, status);
    }
}
/**
 * Runs for the whole Steam session after the plugin loads.
 * Plugin React trees unmount when you back out of Battery Peek or when Decky hides the QAM panel — this keeps the pill over games.
 */
function startBatteryOverlayDaemon() {
    const w = window;
    if (w.__batteryPeekDaemon)
        return;
    let stopped = false;
    let timeoutId;
    let unbindBatteryEvents;
    const getBatteryManager = async () => {
        const nav = navigator;
        if (!nav.getBattery)
            return null;
        try {
            return await nav.getBattery();
        }
        catch (_a) {
            return null;
        }
    };
    const tick = async () => {
        if (stopped)
            return;
        const settings = loadSettings();
        const status = await readBattery();
        paintOverlayInSteamDom(settings, status);
        timeoutId = window.setTimeout(() => {
            void tick();
        }, Math.max(1000, settings.refreshSeconds * 1000));
    };
    const bindBatteryEvents = async () => {
        const manager = await getBatteryManager();
        if (!manager)
            return;
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
            if (timeoutId)
                window.clearTimeout(timeoutId);
            unbindBatteryEvents === null || unbindBatteryEvents === void 0 ? void 0 : unbindBatteryEvents();
            removeOverlayNodes();
            delete w.__batteryPeekDaemon;
        },
    };
}
function Content() {
    var _a, _b;
    const [settings, setSettings] = SP_REACT.useState(loadSettings);
    const { status, loading } = useBatteryPoller(settings.enabled, settings.refreshSeconds);
    const applySettings = (next) => {
        setSettings(next);
        saveSettings(next);
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Overlay", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.enabled, label: "Enable overlay", description: "Show the floating battery pill while playing.", onChange: (value) => applySettings({ ...settings, enabled: value }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.showPercent, label: "Show percentage", description: "Display the exact battery percent inside the overlay.", onChange: (value) => applySettings({ ...settings, showPercent: value }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.compactMode, label: "Compact mode", description: "Reduce padding and text size to block even less of the screen.", onChange: (value) => applySettings({ ...settings, compactMode: value }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => applySettings({ ...settings, refreshSeconds: nextRefreshSeconds(settings.refreshSeconds) }), children: ["Refresh rate: ", settings.refreshSeconds, "s (tap to change)"] }) })] }), SP_JSX.jsx(DFL.PanelSection, { title: "Position", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => applySettings({
                            ...settings,
                            corner: settings.corner === "top-right" ? "top-left" : "top-right",
                        }), children: ["Move to ", settings.corner === "top-right" ? "top left" : "top right"] }) }) }), SP_JSX.jsxs(DFL.PanelSection, { title: "Live status", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: loading ? "Loading battery…" : `${(_a = status === null || status === void 0 ? void 0 : status.percent) !== null && _a !== void 0 ? _a : 0}%` }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: (_b = status === null || status === void 0 ? void 0 : status.status) !== null && _b !== void 0 ? _b : "Unknown" }) }), (status === null || status === void 0 ? void 0 : status.minutesRemaining) != null && !(status === null || status === void 0 ? void 0 : status.isCharging) ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: formatRemaining(status.minutesRemaining) }) })) : null, (status === null || status === void 0 ? void 0 : status.error) ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: status.error }) })) : null] })] }));
}
var index = definePlugin(() => {
    startBatteryOverlayDaemon();
    const content = SP_JSX.jsx(Content, {});
    return {
        /** Keeps settings / live status updating when QAM is dismissed but you stay on this plugin. */
        alwaysRender: true,
        name: "Battery Peek",
        titleView: (SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [SP_JSX.jsx("span", { "aria-hidden": true, style: { fontSize: "1.15em", lineHeight: 1 }, children: "\u26A1" }), SP_JSX.jsx("span", { children: "Battery Peek" })] })),
        content,
        icon: (SP_JSX.jsx("span", { "aria-hidden": true, style: { fontSize: "1.25em", lineHeight: 1 }, children: "\u26A1" })),
        onDismount() {
            var _a;
            (_a = window.__batteryPeekDaemon) === null || _a === void 0 ? void 0 : _a.stop();
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
