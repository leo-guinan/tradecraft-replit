import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const password = await hashPassword("admin123");
  const [admin] = await db.insert(users).values({
    username: "admin",
    password,
    isAdmin: true,
  }).returning();
  
  console.log("Admin user created:", admin);
}

createAdmin().catch(console.error);
