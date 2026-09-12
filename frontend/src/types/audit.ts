export interface AuditLog {
  id: number
  user: number | null
  username: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string
  ip_address: string | null
  created_at: string
}
