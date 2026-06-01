import type { Context } from 'hono'

export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

export type Variables = {
  userId: number
  userRole: string
  userEmail: string
}

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

export const json = (data: any, status = 200) => Response.json(data, { status })
