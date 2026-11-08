/** Camera scanning is for smartphones (autofocus rear camera); same test as mtg_ledger's server side. */
export function isPhone(userAgent = navigator.userAgent): boolean {
  return /Mobi|Android|iPhone|iPod/i.test(userAgent);
}
