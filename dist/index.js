var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaBolt (props) {
  return GenIcon({"attr":{"viewBox":"0 0 320 512"},"child":[{"tag":"path","attr":{"d":"M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z"},"child":[]}]})(props);
}

/** Avoid `callable()` / `@decky/api` — those bridge calls surface as TypeError "Failed to fetch" when WS flakes. sysfs is unreadable from JS anyway. */
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
};
function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return defaultSettings;
        return { ...defaultSettings, ...JSON.parse(raw) };
    }
    catch {
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
function useBatteryPoller(enabled) {
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
        }, 15000);
        return () => {
            cancelled = true;
            if (timer)
                window.clearInterval(timer);
        };
    }, [enabled]);
    return { status, loading };
}
function FloatingBatteryOverlay({ status, settings, }) {
    const mountRef = SP_REACT.useRef(null);
    const overlayStyle = SP_REACT.useMemo(() => {
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
        };
    }, [settings]);
    SP_REACT.useEffect(() => {
        let host = document.getElementById(OVERLAY_ID);
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
            host.innerHTML = "";
        };
    }, [overlayStyle, settings, status]);
    return null;
}
function Content() {
    const [settings, setSettings] = SP_REACT.useState(loadSettings);
    const { status, loading } = useBatteryPoller(settings.enabled);
    const applySettings = (next) => {
        setSettings(next);
        saveSettings(next);
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(FloatingBatteryOverlay, { status: status, settings: settings }), SP_JSX.jsxs(DFL.PanelSection, { title: "Overlay", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.enabled, label: "Enable overlay", description: "Show the floating battery pill while playing.", onChange: (value) => applySettings({ ...settings, enabled: value }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.showPercent, label: "Show percentage", description: "Display the exact battery percent inside the overlay.", onChange: (value) => applySettings({ ...settings, showPercent: value }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { checked: settings.compactMode, label: "Compact mode", description: "Reduce padding and text size to block even less of the screen.", onChange: (value) => applySettings({ ...settings, compactMode: value }) }) })] }), SP_JSX.jsx(DFL.PanelSection, { title: "Position", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => applySettings({
                            ...settings,
                            corner: settings.corner === "top-right" ? "top-left" : "top-right",
                        }), children: ["Move to ", settings.corner === "top-right" ? "top left" : "top right"] }) }) }), SP_JSX.jsxs(DFL.PanelSection, { title: "Live status", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: loading ? "Loading battery…" : `${status?.percent ?? 0}%` }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: status?.status ?? "Unknown" }) }), status?.minutesRemaining != null && !status?.isCharging ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: formatRemaining(status.minutesRemaining) }) })) : null, status?.error ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: DFL.staticClasses.Text, children: status.error }) })) : null] })] }));
}
var index = DFL.definePlugin(() => {
    const content = SP_JSX.jsx(Content, {});
    return {
        name: "Battery Peek",
        titleView: (SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [SP_JSX.jsx(FaBolt, {}), SP_JSX.jsx("span", { children: "Battery Peek" })] })),
        content,
        icon: SP_JSX.jsx(FaBolt, {}),
        onDismount() {
            const overlay = document.getElementById(OVERLAY_ID);
            if (overlay?.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
