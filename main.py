import asyncio
import os
from pathlib import Path

import decky

BATTERY_BASE = Path("/sys/class/power_supply/BAT1")


class Plugin:
    async def _main(self):
        self.loop = asyncio.get_event_loop()
        decky.logger.info("Battery Peek backend loaded")

    async def _unload(self):
        decky.logger.info("Battery Peek backend unloaded")

    async def _uninstall(self):
        decky.logger.info("Battery Peek backend uninstalled")

    async def get_battery_status(self):
        """
        Returns a simple battery snapshot directly from Linux power_supply.
        This is more reliable on Steam Deck than depending on browser battery APIs.
        """
        try:
            capacity = self._read_int(BATTERY_BASE / "capacity", default=0)
            status = self._read_text(BATTERY_BASE / "status", default="Unknown")
            energy_now = self._read_int(BATTERY_BASE / "energy_now", default=0)
            energy_full = self._read_int(BATTERY_BASE / "energy_full", default=0)
            power_now = self._read_int(BATTERY_BASE / "power_now", default=0)

            minutes_remaining = None
            if power_now > 0 and energy_now > 0 and status.lower() == "discharging":
                hours_remaining = energy_now / power_now
                minutes_remaining = int(hours_remaining * 60)

            return {
                "percent": max(0, min(capacity, 100)),
                "status": status,
                "isCharging": status.lower() == "charging",
                "energyNow": energy_now,
                "energyFull": energy_full,
                "powerNow": power_now,
                "minutesRemaining": minutes_remaining,
            }
        except Exception as exc:
            decky.logger.error(f"Failed to read battery status: {exc}")
            return {
                "percent": 0,
                "status": "Unknown",
                "isCharging": False,
                "energyNow": 0,
                "energyFull": 0,
                "powerNow": 0,
                "minutesRemaining": None,
                "error": str(exc),
            }

    def _read_text(self, path: Path, default: str = "") -> str:
        try:
            return path.read_text(encoding="utf-8").strip()
        except Exception:
            return default

    def _read_int(self, path: Path, default: int = 0) -> int:
        try:
            return int(self._read_text(path, str(default)))
        except Exception:
            return default

    async def _migration(self):
        decky.logger.info("Battery Peek migration check")
        decky.migrate_logs(
            os.path.join(decky.DECKY_USER_HOME, ".config", "battery-peek", "battery-peek.log")
        )
        decky.migrate_settings(
            os.path.join(decky.DECKY_HOME, "settings", "battery-peek.json"),
            os.path.join(decky.DECKY_USER_HOME, ".config", "battery-peek"),
        )
        decky.migrate_runtime(
            os.path.join(decky.DECKY_HOME, "battery-peek"),
            os.path.join(decky.DECKY_USER_HOME, ".local", "share", "battery-peek"),
        )
