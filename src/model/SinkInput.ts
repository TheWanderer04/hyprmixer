export default interface SinkInput {
  id: number
  appName: string
  binary: string
  sinkId: number
  volume: number // 0-1
  muted: boolean
}
