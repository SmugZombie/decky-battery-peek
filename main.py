import os

import decky


class Plugin:
    """Minimal backend — battery data comes from the Browser Battery API in the frontend."""

    async def _main(self):
        decky.logger.info("Battery Peek backend loaded")

    async def _unload(self):
        decky.logger.info("Battery Peek backend unloaded")

    async def _uninstall(self):
        decky.logger.info("Battery Peek backend uninstalled")

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
