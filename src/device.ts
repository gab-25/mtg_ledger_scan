/** Camera scanning is for smartphones (autofocus rear camera); same test as mtg_ledger_core's server side. */
export function isPhone(userAgent = navigator.userAgent): boolean {
  return /Mobi|Android|iPhone|iPod/i.test(userAgent);
}
