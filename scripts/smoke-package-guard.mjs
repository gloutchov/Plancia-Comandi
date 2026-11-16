export const SMOKE_BUDGET_MS = 5 * 60 * 1000

/** ping -t, orphan reaping and ThreadCount run only on Windows. */
export function smokeUsesWindowsConptyChecks(platform) {
  return platform === 'win32'
}

export function smokeBudgetExpired(started, now = Date.now(), budget = SMOKE_BUDGET_MS) {
  return now - started >= budget
}

export function smokeBudgetMessage(budget = SMOKE_BUDGET_MS) {
  return `Package smoke exceeded ${budget}ms and the application was stopped`
}
