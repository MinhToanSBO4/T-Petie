export type ProvisioningAccount = {
  role: 'admin' | 'staff'; email: string; username: string; name: string; password: string;
};

type Environment = Record<string, string | undefined>;

function account(env: Environment, prefix: 'ADMIN' | 'STAFF', role: ProvisioningAccount['role']): ProvisioningAccount | null {
  const email = env[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const username = env[`${prefix}_USERNAME`]?.trim().toLowerCase();
  const password = env[`${prefix}_INITIAL_PASSWORD`];
  const name = env[`${prefix}_NAME`]?.trim() || username;
  if (!email && !username && !password) return null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !username || !/^[a-z][a-z0-9_]{2,31}$/.test(username) ||
    !password || password.length < 16 || password.length > 128 || !name || name.length > 100) {
    throw new Error(`${prefix} account requires a valid email, username, name and password of 16–128 characters.`);
  }
  return { role, email, username, name, password };
}

export function parseProvisioningAccounts(env: Environment): ProvisioningAccount[] {
  const admin = account(env, 'ADMIN', 'admin');
  if (!admin) throw new Error('Set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD before provisioning.');
  const staff = account(env, 'STAFF', 'staff');
  if (staff && (staff.email === admin.email || staff.username === admin.username)) {
    throw new Error('Admin and staff must use different email addresses and usernames.');
  }
  return staff ? [admin, staff] : [admin];
}
