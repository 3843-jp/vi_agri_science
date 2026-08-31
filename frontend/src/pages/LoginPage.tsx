import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Sprout, Leaf, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { extractErrorMessage } from '../api/axios'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // 401 from SimpleJWT's login view reads as a generic auth failure —
      // deliberately vague (doesn't confirm whether username exists).
      setError(
        extractErrorMessage(err) === 'Something went wrong. Please try again.'
          ? 'Incorrect username or password.'
          : extractErrorMessage(err),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Branding panel — hidden on mobile, per Section 9/6 */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, var(--color-brand-600), transparent 45%), radial-gradient(circle at 80% 70%, var(--color-lime-500), transparent 40%)',
        }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-500">
            <Sprout className="h-6 w-6 text-brand-950" />
          </div>
          <p className="text-lg font-semibold tracking-wide">VI AGRI SCIENCE</p>
        </div>

        <div className="relative">
          <Leaf className="mb-6 h-10 w-10 text-lime-400" />
          <h1 className="max-w-md text-3xl font-semibold leading-tight">Planting dreams, harvesting life</h1>
          <p className="mt-4 max-w-sm text-sm text-brand-200">
            One place for orders, payments, stock, and business insight —
            built to replace the notebook, not to look like a spreadsheet.
          </p>
        </div>

        <p className="relative text-xs text-brand-400">
          No.27, Block No.9, Main Road, Auto Nagar, Hyderabad, Rangareddy, Telangana - 500070
        </p>
      </div>

      {/* Login form */}
      <div className="flex w-full flex-1 items-center justify-center bg-surface px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">VI AGRI SCIENCE</p>
              <p className="text-xs text-ink-500">Planting dreams, harvesting life</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-500">Sign in to manage today's business.</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="owner"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-11 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-300 hover:text-ink-500"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
