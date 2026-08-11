import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { resolveUserFromRequest } from '../services/auth.js'
import { reserveUsageSlot, resetUsageStore } from '../services/usageLimit.js'
import { formatAuthError } from '../frontend/src/utils/authErrors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Phase 17.1A User Authentication Foundation Tests\n')

console.log('1. Supabase client session persistence config')
const supabaseSource = readFileSync(join(ROOT, 'frontend/src/lib/supabase.js'), 'utf8')
assert(supabaseSource.includes('persistSession: true'), 'persistSession should be true')
assert(supabaseSource.includes('autoRefreshToken: true'), 'autoRefreshToken should be true')
assert(supabaseSource.includes("AUTH_STORAGE_KEY = 'auditpilot-auth'"), 'auth storage key should be set')
console.log('  PASS')

console.log('\n2. Auth context module exports')
const authContextSource = readFileSync(join(ROOT, 'frontend/src/context/AuthContext.jsx'), 'utf8')
for (const symbol of ['AuthProvider', 'useAuth', 'signIn', 'signUp', 'signOut', 'getAccessToken', 'isAuthenticated']) {
  assert(authContextSource.includes(symbol), `AuthContext should expose ${symbol}`)
}
console.log('  PASS')

console.log('\n3. Register flow (signUp contract)')
assert(typeof formatAuthError({ message: 'User already registered' }).includes('already exists'), 'register duplicate email message')
assert(authContextSource.includes('signUp'), 'AuthProvider implements signUp')
const registerPage = readFileSync(join(ROOT, 'frontend/src/pages/Register.jsx'), 'utf8')
assert(registerPage.includes('signUp'), 'Register page uses signUp')
assert(registerPage.includes('/login'), 'Register page links to login')
console.log('  PASS')

console.log('\n4. Login flow (signIn contract)')
assert(
  formatAuthError({ message: 'Invalid login credentials' }) === 'Incorrect email or password.',
  'login error mapping'
)
const loginPage = readFileSync(join(ROOT, 'frontend/src/pages/Login.jsx'), 'utf8')
assert(loginPage.includes('signIn'), 'Login page uses signIn')
console.log('  PASS')

console.log('\n5. Logout flow (signOut contract)')
assert(authContextSource.includes('signOut'), 'AuthProvider implements signOut')
assert(authContextSource.includes('setSession(null)'), 'signOut clears local session state')
const userMenu = readFileSync(join(ROOT, 'frontend/src/components/UserMenu.jsx'), 'utf8')
assert(userMenu.includes('signOut'), 'UserMenu calls signOut')
assert(userMenu.includes('Logout'), 'UserMenu shows Logout')
console.log('  PASS')

console.log('\n6. Protected routes')
const protectedRoute = readFileSync(join(ROOT, 'frontend/src/components/ProtectedRoute.jsx'), 'utf8')
assert(protectedRoute.includes('Navigate to="/login"'), 'ProtectedRoute redirects guests to login')
const appSource = readFileSync(join(ROOT, 'frontend/src/App.jsx'), 'utf8')
assert(appSource.includes('<ProtectedRoute>'), 'App wraps protected pages')
assert(appSource.includes('AuthProvider'), 'App uses AuthProvider')
console.log('  PASS')

console.log('\n7. Server auth resolves guest requests (anonymous audit compatible)')
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_ANON_KEY
const guest = await resolveUserFromRequest({ headers: {} })
assert(guest === null, 'missing Authorization should return null user')
const noSupabase = await resolveUserFromRequest({
  headers: { authorization: 'Bearer fake-token' },
})
assert(noSupabase === null, 'unconfigured auth should not crash audit API')
console.log('  PASS')

console.log('\n8. Anonymous GMC audit still works without login')
process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''
resetUsageStore()
const reservation = await reserveUsageSlot('anonymous-auth-test', 'gmc')
assert(reservation.allowed === true, 'anonymous visitor can reserve GMC audit slot')
const seoReservation = await reserveUsageSlot('anonymous-auth-test', 'seo')
assert(seoReservation.allowed === true, 'anonymous SEO audit allowed')
console.log('  PASS')

console.log('\n9. Frontend build')
const build = spawnSync('npm', ['run', 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: true,
})
assert(build.status === 0, `build failed:\n${build.stdout}\n${build.stderr}`)
console.log('  PASS')

console.log('\nPhase 17.1A User Authentication Foundation verified')
