type MasterLoginConfig = {
  masterLogin?: string
  masterEmail?: string
}

type MasterLoginPayload = {
  login?: string
  password?: string
} | null

export type MasterLoginValidation =
  | {
      ok: true
      login: string
      password: string
      masterEmail: string
    }
  | {
      ok: false
      status: 400 | 401 | 500
      error: string
    }

export function validateMasterLoginPayload(
  payload: MasterLoginPayload,
  config: MasterLoginConfig
): MasterLoginValidation {
  const login = payload?.login?.trim() || ''
  const password = payload?.password || ''
  const masterLogin = config.masterLogin?.trim() || ''
  const masterEmail = config.masterEmail?.trim() || ''

  if (!masterLogin || !masterEmail) {
    return {
      ok: false,
      status: 500,
      error: 'El acceso master no está configurado en el servidor',
    }
  }

  if (!login || !password) {
    return {
      ok: false,
      status: 400,
      error: 'Debes indicar usuario master y contraseña',
    }
  }

  if (login !== masterLogin) {
    return {
      ok: false,
      status: 401,
      error: 'Usuario master no reconocido',
    }
  }

  return {
    ok: true,
    login,
    password,
    masterEmail,
  }
}
