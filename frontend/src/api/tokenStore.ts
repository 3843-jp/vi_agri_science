let accessTokenMemory: string | null = null

export const tokenStore = {
  getAccess(): string | null {
    return accessTokenMemory
  },
  setAccess(access: string) {
    accessTokenMemory = access
  },
  clear() {
    accessTokenMemory = null
  },
}
