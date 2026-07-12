import "server-only";

import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export const ADMIN_SESSION_COOKIE = "ik_admin_session";

const DEFAULT_ADMIN_EMAIL = "admin@internetkudo.com";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const adminRoles = ["super_admin", "operations", "finance", "support", "analyst", "developer", "read_only"] as const;
export type AdminRole = (typeof adminRoles)[number];

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  disabledAt?: string;
};

type AdminSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

type AuthStore = {
  users: AdminUser[];
  sessions: AdminSession[];
};

export type PublicAdminUser = Omit<AdminUser, "passwordHash">;

function storageDir() {
  return process.env.ADMIN_AUTH_STORAGE_DIR || "/var/lib/internetkudo-admin";
}

function storagePath() {
  return path.join(storageDir(), "admin-auth.json");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function defaultAdminUser(): Promise<AdminUser> {
  const password = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_DEFAULT_PASSWORD is required when seeding the first admin account.");
  }

  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    email: DEFAULT_ADMIN_EMAIL,
    name: "InternetKudo Admin",
    role: "super_admin",
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  };
}

async function readStore(): Promise<AuthStore> {
  await mkdir(storageDir(), { recursive: true, mode: 0o700 });

  let store: AuthStore;
  try {
    store = JSON.parse(await readFile(storagePath(), "utf8")) as AuthStore;
  } catch {
    store = { users: [await defaultAdminUser()], sessions: [] };
    await writeStore(store);
    return store;
  }

  if (!Array.isArray(store.users)) store.users = [];
  if (!Array.isArray(store.sessions)) store.sessions = [];

  if (!store.users.some((user) => normalizeEmail(user.email) === DEFAULT_ADMIN_EMAIL)) {
    store.users.unshift(await defaultAdminUser());
    await writeStore(store);
  }

  return pruneExpiredSessions(store);
}

async function writeStore(store: AuthStore) {
  await mkdir(storageDir(), { recursive: true, mode: 0o700 });
  const file = storagePath();
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, file);
}

async function pruneExpiredSessions(store: AuthStore) {
  const now = Date.now();
  const sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  if (sessions.length !== store.sessions.length) {
    store.sessions = sessions;
    await writeStore(store);
  }
  return store;
}

export function publicAdminUser(user: AdminUser): PublicAdminUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function listAdminUsers() {
  const store = await readStore();
  return store.users.map(publicAdminUser);
}

export async function createAdminUser(input: { email: string; name: string; role: AdminRole; password: string }) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!email.includes("@")) throw new Error("A valid email address is required.");
  if (name.length < 2) throw new Error("Name must be at least 2 characters.");
  if (!adminRoles.includes(input.role)) throw new Error("Invalid admin role.");
  if (input.password.length < 10) throw new Error("Password must be at least 10 characters.");

  const store = await readStore();
  if (store.users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error("An admin account already exists for that email.");
  }

  const now = new Date().toISOString();
  const user: AdminUser = {
    id: randomUUID(),
    email,
    name,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };

  store.users.push(user);
  await writeStore(store);
  return publicAdminUser(user);
}

export async function authenticateAdmin(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const store = await readStore();
  const user = store.users.find((candidate) => normalizeEmail(candidate.email) === email);
  if (!user || user.disabledAt || !(await verifyPassword(password, user.passwordHash))) {
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  user.lastLoginAt = now.toISOString();
  user.updatedAt = now.toISOString();
  store.sessions.push({
    id: randomUUID(),
    userId: user.id,
    tokenHash: sha256(token),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  });
  await writeStore(store);

  return { token, user: publicAdminUser(user) };
}

export async function getAdminFromToken(token?: string | null) {
  if (!token) return null;
  const store = await readStore();
  const session = store.sessions.find((candidate) => candidate.tokenHash === sha256(token));
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;

  const user = store.users.find((candidate) => candidate.id === session.userId && !candidate.disabledAt);
  return user ? publicAdminUser(user) : null;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  return getAdminFromToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function destroyAdminSession(token?: string | null) {
  if (!token) return;
  const store = await readStore();
  store.sessions = store.sessions.filter((session) => session.tokenHash !== sha256(token));
  await writeStore(store);
}
