import { BrowserWindow, shell } from 'electron'
import crypto from 'node:crypto'
import type { Account } from '../shared/types'
import { loadRefreshToken, saveRefreshToken } from './store'
import { log } from './logger'

const SCOPE = 'XboxLive.signin offline_access'
const TENANT = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'

export interface McAuth {
  access_token: string
  client_token: string
  uuid: string
  name: string
  user_properties: string
  meta: { type: 'msa' | 'mojang'; demo: boolean }
}

let cancelled = false
export const cancelLogin = () => {
  cancelled = true
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function post(url: string, body: any, form = false) {
  const res = await fetch(url, {
    method: 'POST',
    headers: form
      ? { 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body)
  })
  const text = await res.text()
  let json: any = {}
  try {
    json = JSON.parse(text)
  } catch {
    /* not json */
  }
  return { ok: res.ok, status: res.status, json, text }
}

function emitCode(info: { userCode: string; verificationUri: string } | null) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('auth:device-code', info)
  }
}

// Цепочка: MS access token -> Xbox Live -> XSTS -> Minecraft -> профиль
async function minecraftFromMsToken(msAccess: string) {
  const xbl = await post('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + msAccess },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  })
  if (!xbl.ok) throw new Error('Xbox Live: ' + xbl.status)

  const xsts = await post('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.json.Token] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT'
  })
  if (!xsts.ok) {
    const code = xsts.json?.XErr
    const map: Record<number, string> = {
      2148916233: 'У аккаунта нет профиля Xbox. Создайте его на xbox.com.',
      2148916235: 'Xbox Live недоступен в вашей стране.',
      2148916236: 'Нужна проверка возраста для аккаунта Xbox.',
      2148916238: 'Детский аккаунт: добавьте его в семью Microsoft.'
    }
    throw new Error(map[code] || 'XSTS: ' + xsts.status)
  }
  const uhs = xsts.json.DisplayClaims.xui[0].uhs

  const mc = await post('https://api.minecraftservices.com/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${uhs};${xsts.json.Token}`
  })
  if (!mc.ok) throw new Error('Minecraft services: ' + mc.status)

  const profRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: 'Bearer ' + mc.json.access_token }
  })
  if (profRes.status === 404) throw new Error('На этом аккаунте не куплен Minecraft: Java Edition.')
  if (!profRes.ok) throw new Error('Профиль Minecraft: ' + profRes.status)
  const prof: any = await profRes.json()
  return { token: mc.json.access_token as string, uuid: prof.id as string, name: prof.name as string }
}

export async function microsoftLogin(clientId: string): Promise<{ account: Account; auth: McAuth }> {
  if (!clientId.trim()) {
    throw new Error('Укажите Azure Client ID в настройках (см. подсказку рядом с полем).')
  }
  cancelled = false
  const dc = await post(`${TENANT}/devicecode`, { client_id: clientId.trim(), scope: SCOPE }, true)
  if (!dc.ok) throw new Error(dc.json?.error_description || 'Не удалось получить код входа')

  emitCode({ userCode: dc.json.user_code, verificationUri: dc.json.verification_uri })
  shell.openExternal(dc.json.verification_uri).catch(() => {})
  log('info', `Код входа Microsoft: ${dc.json.user_code}`)

  const deadline = Date.now() + dc.json.expires_in * 1000
  let interval = (dc.json.interval || 5) * 1000
  let tokens: any = null
  try {
    while (Date.now() < deadline) {
      await sleep(interval)
      if (cancelled) throw new Error('Вход отменён')
      const t = await post(
        `${TENANT}/token`,
        {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: clientId.trim(),
          device_code: dc.json.device_code
        },
        true
      )
      if (t.ok) {
        tokens = t.json
        break
      }
      const err = t.json?.error
      if (err === 'authorization_pending') continue
      if (err === 'slow_down') interval += 5000
      else throw new Error(t.json?.error_description || 'Ошибка входа: ' + err)
    }
  } finally {
    emitCode(null)
  }
  if (!tokens) throw new Error('Время ожидания входа истекло')

  saveRefreshToken(tokens.refresh_token)
  const mc = await minecraftFromMsToken(tokens.access_token)
  return {
    account: { type: 'microsoft', name: mc.name, uuid: mc.uuid },
    auth: toAuth(mc.token, mc.uuid, mc.name)
  }
}

export async function refreshMicrosoft(clientId: string): Promise<McAuth> {
  const refresh = loadRefreshToken()
  if (!refresh) throw new Error('Сессия Microsoft истекла. Войдите в аккаунт заново.')
  const t = await post(
    `${TENANT}/token`,
    { grant_type: 'refresh_token', client_id: clientId.trim(), refresh_token: refresh, scope: SCOPE },
    true
  )
  if (!t.ok) throw new Error('Сессия Microsoft истекла. Войдите в аккаунт заново.')
  if (t.json.refresh_token) saveRefreshToken(t.json.refresh_token)
  const mc = await minecraftFromMsToken(t.json.access_token)
  return toAuth(mc.token, mc.uuid, mc.name)
}

function toAuth(token: string, uuid: string, name: string): McAuth {
  return {
    access_token: token,
    client_token: crypto.randomUUID().replace(/-/g, ''),
    uuid,
    name,
    user_properties: '{}',
    meta: { type: 'msa', demo: false }
  }
}

// UUID офлайн-игрока совпадает с тем, что считает ванильный сервер: md5("OfflinePlayer:name")
export function offlineUuid(name: string) {
  const h = crypto.createHash('md5').update('OfflinePlayer:' + name).digest()
  h[6] = (h[6] & 0x0f) | 0x30
  h[8] = (h[8] & 0x3f) | 0x80
  return h.toString('hex')
}

export function offlineAuth(name: string): McAuth {
  const uuid = offlineUuid(name)
  return {
    access_token: uuid,
    client_token: uuid,
    uuid,
    name,
    user_properties: '{}',
    meta: { type: 'mojang', demo: false }
  }
}

export function logoutMicrosoft() {
  saveRefreshToken(null)
}
