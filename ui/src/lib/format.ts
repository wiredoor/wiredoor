import { formatDistanceStrict } from 'date-fns'

export const getTraffic = (traffic?: number | string) => {
  if (traffic && +traffic > 0) {
    return formatBytes(+traffic)
  }

  return '-'
}

export const getLatestHS = (timestamp?: number) => {
  if (timestamp) {
    return `${formatDistanceStrict(new Date(timestamp), Date.now(), { addSuffix: true })}`
  }

  return '-'
}

export function formatBytes(v: number, decimals = 2): string {
  if (v === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(v) / Math.log(k))

  return parseFloat((v / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}
