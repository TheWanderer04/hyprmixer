import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('playerCtlAPI', {
  getPlayers() { return ipcRenderer.invoke('list-players') },
  getCurrentTrack(player: string) { return ipcRenderer.invoke('get-current-track', player) },
  togglePlayPause(player: string) { ipcRenderer.invoke('play-pause', player) },
  next(player: string) { ipcRenderer.invoke('next', player) },
  prev(player: string) { ipcRenderer.invoke('prev', player) },
  changePosition(player: string, position: string) { ipcRenderer.invoke('change-position', player, position) },
  getPlayerVolume(player: string) { ipcRenderer.invoke('get-player-volume', player) },
  setPlayerVolume(player: string, volume: number) { ipcRenderer.invoke('set-player-volume', player, volume) }
})

contextBridge.exposeInMainWorld('pactlAPI', {
  listSinks() { return ipcRenderer.invoke('list-sinks') },
  listSinkInputs() { return ipcRenderer.invoke('list-sink-inputs') },
  setSinkVolume(sinkId: number, volume: number) { ipcRenderer.invoke('set-sink-volume', sinkId, volume) },
  setSinkMute(sinkId: number, mute: boolean) { ipcRenderer.invoke('set-sink-mute', sinkId, mute) },
  setDefaultSink(sinkName: string) { ipcRenderer.invoke('set-default-sink', sinkName) },
  setSinkInputVolume(inputId: number, volume: number) { ipcRenderer.invoke('set-sink-input-volume', inputId, volume) },
  setSinkInputMute(inputId: number, mute: boolean) { ipcRenderer.invoke('set-sink-input-mute', inputId, mute) },
  moveSinkInput(inputId: number, sinkId: number) { ipcRenderer.invoke('move-sink-input', inputId, sinkId) },
  listSources() { return ipcRenderer.invoke('list-sources') },
  setSourceVolume(sourceId: number, volume: number) { ipcRenderer.invoke('set-source-volume', sourceId, volume) },
  setSourceMute(sourceId: number, mute: boolean) { ipcRenderer.invoke('set-source-mute', sourceId, mute) },
  setDefaultSource(sourceName: string) { ipcRenderer.invoke('set-default-source', sourceName) },
  listCards() { return ipcRenderer.invoke('list-cards') },
  setCardProfile(cardId: number, profileId: string) { ipcRenderer.invoke('set-card-profile', cardId, profileId) },
})

// Loading spinner setup (unchanged)
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) resolve(true)
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) return parent.appendChild(child)
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) return parent.removeChild(child)
  },
}

function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')
  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() { safeDOM.append(document.head, oStyle); safeDOM.append(document.body, oDiv) },
    removeLoading() { safeDOM.remove(document.head, oStyle); safeDOM.remove(document.body, oDiv) },
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
