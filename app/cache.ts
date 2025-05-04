const cache: { [key: string]: any } = {}

export const setCache = (key: string, value: any) => {
  cache[key] = value
}

export const getCache = (key: string) => {
  return cache[key]
}

export const clearCache = (key: string) => {
  delete cache[key]
}

export const clearAllCache = () => {
  Object.keys(cache).forEach(key => delete cache[key])
}
