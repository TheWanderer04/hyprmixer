export interface CardProfile {
  id: string
  description: string
  available: boolean
}

export default interface Card {
  id: number
  name: string
  description: string
  activeProfile: string
  profiles: CardProfile[]
}
