import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database helper functions
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await sql(query, params)
    return result as T[]
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

export async function executeTransaction<T>(queries: Array<{ query: string; params?: any[] }>): Promise<T[]> {
  try {
    const results: T[] = []

    for (const { query, params = [] } of queries) {
      const result = await sql(query, params)
      results.push(result as T)
    }

    return results
  } catch (error) {
    console.error("Database transaction error:", error)
    throw error
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}
