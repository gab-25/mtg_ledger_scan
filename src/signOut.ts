import { logout } from "./api/account";

/** Log out, then the login page (a full load: nothing of the previous user stays in memory). */
export async function signOut() {
  await logout();
  window.location.assign("/login/");
}
