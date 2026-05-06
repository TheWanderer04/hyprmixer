import Sink from "@/model/Sink"
import SinkInput from "@/model/SinkInput"
import Source from "@/model/Source"
import Card from "@/model/Card"

async function listSinks(): Promise<Sink[]> {
  return await window.pactlAPI.listSinks()
}

async function listSinkInputs(): Promise<SinkInput[]> {
  return await window.pactlAPI.listSinkInputs()
}

function setSinkVolume(sinkId: number, volume: number) {
  window.pactlAPI.setSinkVolume(sinkId, volume)
}

function setSinkMute(sinkId: number, mute: boolean) {
  window.pactlAPI.setSinkMute(sinkId, mute)
}

function setDefaultSink(sinkName: string) {
  window.pactlAPI.setDefaultSink(sinkName)
}

function setSinkInputVolume(inputId: number, volume: number) {
  window.pactlAPI.setSinkInputVolume(inputId, volume)
}

function setSinkInputMute(inputId: number, mute: boolean) {
  window.pactlAPI.setSinkInputMute(inputId, mute)
}

function moveSinkInput(inputId: number, sinkId: number) {
  window.pactlAPI.moveSinkInput(inputId, sinkId)
}

async function listSources(): Promise<Source[]> {
  return await window.pactlAPI.listSources()
}

function setSourceVolume(sourceId: number, volume: number) {
  window.pactlAPI.setSourceVolume(sourceId, volume)
}

function setSourceMute(sourceId: number, mute: boolean) {
  window.pactlAPI.setSourceMute(sourceId, mute)
}

function setDefaultSource(sourceName: string) {
  window.pactlAPI.setDefaultSource(sourceName)
}

async function listCards(): Promise<Card[]> {
  return await window.pactlAPI.listCards()
}

function setCardProfile(cardId: number, profileId: string) {
  window.pactlAPI.setCardProfile(cardId, profileId)
}

export {
  listSinks,
  listSinkInputs,
  setSinkVolume,
  setSinkMute,
  setDefaultSink,
  setSinkInputVolume,
  setSinkInputMute,
  moveSinkInput,
  listSources,
  setSourceVolume,
  setSourceMute,
  setDefaultSource,
  listCards,
  setCardProfile,
}
