import { app, BrowserWindow, shell, ipcMain, IpcMainInvokeEvent } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { update } from './update'
import { execSync as _execSync } from 'node:child_process'

// Wrapper around execSync that explicitly pipes all stdio instead of
// inheriting from the parent. When hyprmixer is launched detached from a
// terminal (e.g. via a waybar widget) and the parent shell exits, the
// inherited file descriptors get closed. Later execSync calls then crash
// the main process with "EIO: i/o error, write" when they try to write
// progress/diagnostics to those dead fds. Forcing 'pipe' on every call
// gives the child fresh fds owned by Node, which keeps working forever.
function execSync(cmd: string): Buffer {
  return _execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
}
import Track from '@/model/Track'
import Player from '@/model/Player'
import Sink from '@/model/Sink'
import SinkInput from '@/model/SinkInput'
import Source from '@/model/Source'
import Card from '@/model/Card'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Don't let a single failing pactl/playerctl command (or a transient EIO
// from a closed parent fd) kill the whole app — just log and carry on.
// Without this Electron pops a "JavaScript error in main process" dialog
// and the user has to restart the app manually.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

// Relocate config from default ~/.config/hyprmixer to ~/.config/hypr/hyprmixer
// so it lives alongside other Hyprland-related configs.
if (process.platform === 'linux') {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  app.setPath('userData', path.join(xdgConfig, 'hypr', 'hyprmixer'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    transparent: true,
    frame: false,
    width: 900,
    height: 700,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  update(win)
}

// ============================================================
// playerctl handlers (unchanged from original)
// ============================================================

function handleListPlayers() {
  const playerNames = new TextDecoder('UTF-8').decode(execSync("playerctl --list-all")).split(os.EOL).filter(v => v != "")
  const players: Player[] = []
  for (let playerName of playerNames) {
    const status = new TextDecoder('UTF-8').decode(execSync(`playerctl status -p ${playerName}`))
    const volume = Number(new TextDecoder('UTF-8').decode(execSync(`playerctl volume -p ${playerName}`)))
    if (status !== "Stopped\n" && playerName.split(".")[0] !== "kdeconnect") {
      players.push({ name: playerName, status, volume })
    }
  }
  return players
}

function handleCurrentTrack(_event: IpcMainInvokeEvent, player: Player) {
  if (player.name === "vlc") {
    return {
      title: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata xesam:title -p ${player.name}`)),
      artist: "Unknow",
      artUrl: "",
      length: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata --format "{{ duration(mpris:length) }}" -p ${player.name}`)),
      status: new TextDecoder('UTF-8').decode(execSync(`playerctl status -p ${player.name}`)),
      position: "0:00"
    }
  }

  if (player.name === "chromium" && player.status === "Stopped\n" || player.name === undefined) {
    return { title: "", artist: "", artUrl: "", length: "0:00", status: "", position: "0:00" }
  }
  const track: Track = {
    title: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata xesam:title -p ${player.name}`)),
    artist: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata xesam:artist -p ${player.name}`)),
    artUrl: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata mpris:artUrl -p ${player.name}`)),
    length: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata --format "{{ duration(mpris:length) }}" -p ${player.name}`)),
    status: new TextDecoder('UTF-8').decode(execSync(`playerctl status -p ${player.name}`)),
    position: new TextDecoder('UTF-8').decode(execSync(`playerctl metadata --format "{{ duration(position) }}" -p ${player.name}`))
  }
  return track
}

function handlePlayPause(_e: IpcMainInvokeEvent, player: string) { execSync(`playerctl play-pause -p ${player}`) }
function handleNext(_e: IpcMainInvokeEvent, player: string) { execSync(`playerctl next -p ${player}`) }
function handlePrev(_e: IpcMainInvokeEvent, player: string) { execSync(`playerctl previous -p ${player}`) }
function handlePosition(_e: IpcMainInvokeEvent, player: string, position: string) { execSync(`playerctl position ${position} -p ${player}`) }
function handleSetVolume(_e: IpcMainInvokeEvent, player: string, volume: number) { execSync(`playerctl volume ${volume} -p ${player}`) }

// ============================================================
// pactl handlers — new
// ============================================================

// pactl outputs blocks separated by blank lines. Parse them into key->value maps
// keyed by the "Sink #N" / "Sink Input #N" header.
function parsePactlBlocks(raw: string): Map<number, Record<string, string>>[] {
  // returns one map entry per block, keyed by id; we return as an array of { id, kv }
  const blocks: { id: number; kv: Record<string, string> }[] = []
  const lines = raw.split('\n')
  let current: { id: number; kv: Record<string, string> } | null = null
  let lastKey: string | null = null

  for (const line of lines) {
    const headerMatch = line.match(/^(Sink|Sink Input|Source|Source Output)\s+#(\d+)/)
    if (headerMatch) {
      if (current) blocks.push(current)
      current = { id: parseInt(headerMatch[2], 10), kv: {} }
      lastKey = null
      continue
    }
    if (!current) continue

    // top-level key: value lines start with a tab and "Key: value"
    const kvMatch = line.match(/^\t([A-Za-z0-9 .-]+):\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1].trim()
      const val = kvMatch[2].trim()
      current.kv[key] = val
      lastKey = key
      continue
    }

    // properties block has lines indented further like "\t\tapplication.name = "Vivaldi""
    const propMatch = line.match(/^\t\t([a-zA-Z0-9._-]+)\s*=\s*"(.*)"$/)
    if (propMatch) {
      current.kv[`prop:${propMatch[1]}`] = propMatch[2]
    }
  }
  if (current) blocks.push(current)
  // collapse to single map array form expected by callers
  return blocks.map(b => new Map([[b.id, b.kv]]))
}

// Volume parsing: "front-left: 65536 / 100% / 0.00 dB,   front-right: 65536 / 100% / 0.00 dB"
// We average the percentages. Default 100% if unparseable.
function parseVolumePercent(volStr: string | undefined): number {
  if (!volStr) return 1
  const matches = [...volStr.matchAll(/(\d+)%/g)].map(m => parseInt(m[1], 10))
  if (matches.length === 0) return 1
  const avg = matches.reduce((a, b) => a + b, 0) / matches.length
  return Math.max(0, Math.min(1.5, avg / 100))
}

function getDefaultSinkName(): string {
  try {
    return new TextDecoder('UTF-8').decode(execSync('pactl get-default-sink')).trim()
  } catch {
    return ''
  }
}

function handleListSinks(): Sink[] {
  const raw = new TextDecoder('UTF-8').decode(execSync('pactl list sinks'))
  const blocks = parsePactlBlocks(raw)
  const defaultName = getDefaultSinkName()
  const result: Sink[] = []
  for (const block of blocks) {
    for (const [id, kv] of block) {
      const name = kv['Name'] || ''
      const description = kv['Description'] || kv['prop:device.description'] || name
      const volume = parseVolumePercent(kv['Volume'])
      const muted = (kv['Mute'] || 'no').toLowerCase() === 'yes'
      result.push({ id, name, description, isDefault: name === defaultName, volume, muted })
    }
  }
  return result
}

function handleListSinkInputs(): SinkInput[] {
  const raw = new TextDecoder('UTF-8').decode(execSync('pactl list sink-inputs'))
  const blocks = parsePactlBlocks(raw)
  const result: SinkInput[] = []
  for (const block of blocks) {
    for (const [id, kv] of block) {
      const appName =
        kv['prop:application.name'] ||
        kv['prop:media.name'] ||
        kv['prop:application.process.binary'] ||
        'Unknown'
      const binary = kv['prop:application.process.binary'] || ''
      const sinkId = parseInt(kv['Sink'] || '-1', 10)
      const volume = parseVolumePercent(kv['Volume'])
      const muted = (kv['Mute'] || 'no').toLowerCase() === 'yes'
      result.push({ id, appName, binary, sinkId, volume, muted })
    }
  }
  return result
}

function handleSetSinkVolume(_e: IpcMainInvokeEvent, sinkId: number, volume: number) {
  const pct = Math.round(Math.max(0, Math.min(1.5, volume)) * 100)
  execSync(`pactl set-sink-volume ${sinkId} ${pct}%`)
}

function handleSetSinkMute(_e: IpcMainInvokeEvent, sinkId: number, mute: boolean) {
  execSync(`pactl set-sink-mute ${sinkId} ${mute ? 1 : 0}`)
}

function handleSetDefaultSink(_e: IpcMainInvokeEvent, sinkName: string) {
  execSync(`pactl set-default-sink "${sinkName}"`)
}

function handleSetSinkInputVolume(_e: IpcMainInvokeEvent, inputId: number, volume: number) {
  const pct = Math.round(Math.max(0, Math.min(1.5, volume)) * 100)
  execSync(`pactl set-sink-input-volume ${inputId} ${pct}%`)
}

function handleSetSinkInputMute(_e: IpcMainInvokeEvent, inputId: number, mute: boolean) {
  execSync(`pactl set-sink-input-mute ${inputId} ${mute ? 1 : 0}`)
}

function handleMoveSinkInput(_e: IpcMainInvokeEvent, inputId: number, sinkId: number) {
  execSync(`pactl move-sink-input ${inputId} ${sinkId}`)
}

// Sources (input devices). Excludes monitor sources (loopbacks of outputs)
// since they're not physical mics — pavucontrol hides them by default too.
function getDefaultSourceName(): string {
  try {
    return new TextDecoder('UTF-8').decode(execSync('pactl get-default-source')).trim()
  } catch {
    return ''
  }
}

function handleListSources(): Source[] {
  const raw = new TextDecoder('UTF-8').decode(execSync('pactl list sources'))
  const blocks = parsePactlBlocks(raw)
  const defaultName = getDefaultSourceName()
  const result: Source[] = []
  for (const block of blocks) {
    for (const [id, kv] of block) {
      const name = kv['Name'] || ''
      // skip monitor sources — they're per-sink loopbacks, not real inputs
      if (name.endsWith('.monitor') || (kv['prop:device.class'] === 'monitor')) continue
      const description = kv['Description'] || kv['prop:device.description'] || name
      const volume = parseVolumePercent(kv['Volume'])
      const muted = (kv['Mute'] || 'no').toLowerCase() === 'yes'
      result.push({ id, name, description, isDefault: name === defaultName, volume, muted })
    }
  }
  return result
}

function handleSetSourceVolume(_e: IpcMainInvokeEvent, sourceId: number, volume: number) {
  const pct = Math.round(Math.max(0, Math.min(1.5, volume)) * 100)
  execSync(`pactl set-source-volume ${sourceId} ${pct}%`)
}

function handleSetSourceMute(_e: IpcMainInvokeEvent, sourceId: number, mute: boolean) {
  execSync(`pactl set-source-mute ${sourceId} ${mute ? 1 : 0}`)
}

function handleSetDefaultSource(_e: IpcMainInvokeEvent, sourceName: string) {
  execSync(`pactl set-default-source "${sourceName}"`)
}

// Cards (sound device profiles). Output of `pactl list cards` has
// nested sections that don't fit the simple parser used for sinks,
// so we walk it manually with a section-aware state machine.
function handleListCards(): Card[] {
  const raw = new TextDecoder('UTF-8').decode(execSync('pactl list cards'))
  const lines = raw.split('\n')
  const cards: Card[] = []
  let current: Card | null = null
  let section: 'none' | 'profiles' | 'properties' | 'ports' | 'other' = 'none'

  const profileRe = /^\t\t(.+?):\s+(.+?)\s*\(.*available:\s*(yes|no).*\)\s*$/
  // top-level (single-tab) keys like "Name:", "Active Profile:", "Profiles:"
  const topKeyRe = /^\t([A-Za-z0-9 .-]+):\s*(.*)$/

  for (const line of lines) {
    const header = line.match(/^Card\s+#(\d+)/)
    if (header) {
      if (current) cards.push(current)
      current = {
        id: parseInt(header[1], 10),
        name: '',
        description: '',
        activeProfile: '',
        profiles: [],
      }
      section = 'none'
      continue
    }
    if (!current) continue

    // Section headers like "Profiles:" / "Properties:" / "Ports:" appear
    // with single-tab indent and an empty value, then their contents
    // follow with double-tab indent.
    const top = line.match(topKeyRe)
    if (top) {
      const key = top[1].trim()
      const val = top[2].trim()
      if (key === 'Profiles' && val === '') { section = 'profiles'; continue }
      if (key === 'Properties' && val === '') { section = 'properties'; continue }
      if (key === 'Ports' && val === '') { section = 'ports'; continue }
      if (key === 'Name') current.name = val
      if (key === 'Active Profile') current.activeProfile = val
      // Any other top-level key resets section to "other" so following
      // double-tab lines don't get mis-parsed.
      section = 'other'
      continue
    }

    // double-tab indented line — interpret based on which section we're in
    if (section === 'profiles') {
      const m = line.match(profileRe)
      if (m) {
        current.profiles.push({
          id: m[1].trim(),
          description: m[2].trim(),
          available: m[3] === 'yes',
        })
      }
    } else if (section === 'properties') {
      const propMatch = line.match(/^\t\t([a-zA-Z0-9._-]+)\s*=\s*"(.*)"$/)
      if (propMatch && propMatch[1] === 'device.description') {
        current.description = propMatch[2]
      }
    }
    // ignore "ports" and "other" content
  }
  if (current) cards.push(current)

  // Fall back to Name if device.description was missing
  for (const c of cards) {
    if (!c.description) c.description = c.name
  }
  return cards
}

function handleSetCardProfile(_e: IpcMainInvokeEvent, cardId: number, profileId: string) {
  // Profile IDs can contain "+" and ":" — pactl accepts them unquoted but
  // we quote to be safe in shell context.
  execSync(`pactl set-card-profile ${cardId} "${profileId}"`)
}

// ============================================================
// app lifecycle
// ============================================================

app.whenReady().then(() => {
  // playerctl
  ipcMain.handle('list-players', handleListPlayers)
  ipcMain.handle('get-current-track', handleCurrentTrack)
  ipcMain.handle('play-pause', handlePlayPause)
  ipcMain.handle('next', handleNext)
  ipcMain.handle('prev', handlePrev)
  ipcMain.handle('change-position', handlePosition)
  ipcMain.handle('set-player-volume', handleSetVolume)

  // pactl
  ipcMain.handle('list-sinks', handleListSinks)
  ipcMain.handle('list-sink-inputs', handleListSinkInputs)
  ipcMain.handle('set-sink-volume', handleSetSinkVolume)
  ipcMain.handle('set-sink-mute', handleSetSinkMute)
  ipcMain.handle('set-default-sink', handleSetDefaultSink)
  ipcMain.handle('set-sink-input-volume', handleSetSinkInputVolume)
  ipcMain.handle('set-sink-input-mute', handleSetSinkInputMute)
  ipcMain.handle('move-sink-input', handleMoveSinkInput)

  // sources (input devices)
  ipcMain.handle('list-sources', handleListSources)
  ipcMain.handle('set-source-volume', handleSetSourceVolume)
  ipcMain.handle('set-source-mute', handleSetSourceMute)
  ipcMain.handle('set-default-source', handleSetDefaultSource)

  // cards (device profiles)
  ipcMain.handle('list-cards', handleListCards)
  ipcMain.handle('set-card-profile', handleSetCardProfile)

  createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: { preload, nodeIntegration: true, contextIsolation: false },
  })
  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
