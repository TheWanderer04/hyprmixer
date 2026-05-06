export default interface Source {
  id: number
  name: string
  description: string
  isDefault: boolean
  volume: number // 0-1
  muted: boolean
}
