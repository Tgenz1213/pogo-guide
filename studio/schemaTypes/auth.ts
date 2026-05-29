export function isAdministrator(currentUser?: {roles?: Array<{name?: string}>} | null) {
  return currentUser?.roles?.some((role) => role.name === 'administrator') ?? false
}
