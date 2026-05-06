# Disclaimer
Credit for the original goes to the creator Torelli:
https://github.com/Torelli/hyprmixer

I loved the design from hyprmixer but I also needed the functionality of pavucontrol.
I have no idea how to code, so I'll admit every change has been made through Claude. If you don't mind that and want the same as me, feel free to use it.

# 🍚 hyprmixer (fork)

![hyprmixer_overview.gif](/hyprmixer_overview.gif)

## ☑️ Features

**From the original:**
- MPRIS media control (play, pause, next, previous)
- Per-player volume control
- Multi-player support

**Added in this fork:**
- 🔊 **Outputs** tab — list audio sinks, change volume, mute, set default output
- 🎤 **Inputs** tab — list input devices (mics), change volume, mute, set default input
- 🎧 **Apps** tab — per-application volume sliders + route apps between output devices
- 🎛️ **Cards** tab — switch sound card profiles (e.g. headset modes, HDMI output)
- Config relocated from `~/.config/hyprmixer` to `~/.config/hypr/hyprmixer` to fit the Hyprland ecosystem

## 💾 Dependencies

- [playerctl](https://github.com/altdesktop/playerctl) — for media controls
- `pactl` (part of PipeWire/PulseAudio, comes preinstalled on most distros) — for mixer functionality

## 🚀 Installation

```bash
git clone https://github.com/TheWanderer04/hyprmixer
cd hyprmixer
npm install
npm run build
```

The AppImage will be under `release/1.0.1/`. You can run it directly from there, or symlink it for global access:

```bash
chmod +x release/1.0.1/hyprmixer-1.0.1.AppImage
sudo ln -s "$(pwd)/release/1.0.1/hyprmixer-1.0.1.AppImage" /usr/local/bin/hyprmixer
```

> **Note:** `npm run build` may fail at the very end with a "homepage missing" error when building the `.pacman` package. The AppImage is built before that step, so it's safe to ignore. To skip the pacman build entirely, remove `"pacman"` from the linux targets in `electron-builder.json5`.

## 🎶 Starting

Just run `hyprmixer` in your terminal.

## 🍫 Use it with waybar

```json
"mpris": {
    "format": "{player_icon}",
    "format-paused": "{status_icon}",
    "player-icons": { 
        "default": "\uf28b",
        "mpv": "🎵"
    },
    "status-icons": {
        "paused": "\uf144"
    },
    "on-click": "hyprmixer",
    "max-length": 1000,
    "interval": 1
}
```

## 🤝 Contributing

Feel free to send a pull request and let's make hyprmixer even better!