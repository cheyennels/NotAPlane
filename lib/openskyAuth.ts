const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const TOKEN_REFRESH_MARGIN_MS = 30_000;

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function readEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

export function getOpenSkyClientCredentials(): {
  clientId?: string;
  clientSecret?: string;
} {
  return {
    clientId: readEnv("OPENSKY_CLIENT_ID"),
    clientSecret: readEnv("OPENSKY_CLIENT_SECRET"),
  };
}

export function getOpenSkyBasicCredentials(): {
  username?: string;
  password?: string;
} {
  return {
    username:
      readEnv("OPENSKY_USERNAME") ?? readEnv("EXPO_PUBLIC_OPENSKY_USERNAME"),
    password:
      readEnv("OPENSKY_PASSWORD") ?? readEnv("EXPO_PUBLIC_OPENSKY_PASSWORD"),
  };
}

function toBase64(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;

  while (i < value.length) {
    const a = value.charCodeAt(i++);
    const b = i < value.length ? value.charCodeAt(i++) : 0;
    const c = i < value.length ? value.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;

    output += chars[(bitmap >> 18) & 63];
    output += chars[(bitmap >> 12) & 63];
    output += i - 2 < value.length ? chars[(bitmap >> 6) & 63] : "=";
    output += i - 1 < value.length ? chars[bitmap & 63] : "=";
  }

  return output;
}

export async function getOpenSkyAuthHeaders(): Promise<Record<string, string>> {
  const { clientId, clientSecret } = getOpenSkyClientCredentials();

  if (clientId && clientSecret) {
    const now = Date.now();
    if (tokenCache && now < tokenCache.expiresAt) {
      return { Authorization: `Bearer ${tokenCache.token}` };
    }

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          access_token?: string;
          expires_in?: number;
        };

        if (data.access_token) {
          const expiresInMs = (data.expires_in ?? 1800) * 1000;
          tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + expiresInMs - TOKEN_REFRESH_MARGIN_MS,
          };
          return { Authorization: `Bearer ${tokenCache.token}` };
        }
      } else {
        console.warn("OpenSky OAuth token request failed:", response.status);
      }
    } catch (error) {
      console.warn("OpenSky OAuth token request error:", error);
    }
  }

  const { username, password } = getOpenSkyBasicCredentials();
  if (username && password) {
    return { Authorization: `Basic ${toBase64(`${username}:${password}`)}` };
  }

  return {};
}
