/// <reference types="vite/client" />

import Player from './model/Player'
import Track from './model/Track'
import Sink from './model/Sink'
import SinkInput from './model/SinkInput'
import Source from './model/Source'
import Card from './model/Card'

export interface IPlayerCtlAPI {
  getPlayers: () => Promise<Player[]>
  getCurrentTrack: (player: Player) => Promise<Track>
  togglePlayPause: (player: string) => void
  next: (player: string) => void
  prev: (player: string) => void
  changePosition: (player: string, position: string) => void
  getPlayerVolume: (player: string) => Promise<string>
  setPlayerVolume: (player: string, volume: number) => void
}

export interface IPactlAPI {
  listSinks: () => Promise<Sink[]>
  listSinkInputs: () => Promise<SinkInput[]>
  setSinkVolume: (sinkId: number, volume: number) => void
  setSinkMute: (sinkId: number, mute: boolean) => void
  setDefaultSink: (sinkName: string) => void
  setSinkInputVolume: (inputId: number, volume: number) => void
  setSinkInputMute: (inputId: number, mute: boolean) => void
  moveSinkInput: (inputId: number, sinkId: number) => void
  listSources: () => Promise<Source[]>
  setSourceVolume: (sourceId: number, volume: number) => void
  setSourceMute: (sourceId: number, mute: boolean) => void
  setDefaultSource: (sourceName: string) => void
  listCards: () => Promise<Card[]>
  setCardProfile: (cardId: number, profileId: string) => void
}

declare global {
  interface Window {
    ipcRenderer: import('electron').IpcRenderer
    playerCtlAPI: IPlayerCtlAPI
    pactlAPI: IPactlAPI
  }
}
