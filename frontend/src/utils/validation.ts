export function isBlank(value: string | undefined | null) {
  return !value || value.trim().length === 0
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export function isNonNegativeNumber(value: string) {
  if (value === '') return true // let "required" handle emptiness separately
  const n = Number(value)
  return !Number.isNaN(n) && n >= 0
}

export function isPositiveNumber(value: string) {
  const n = Number(value)
  return !Number.isNaN(n) && n > 0
}
