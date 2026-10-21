"use client";
import Link from "next/link";
import { useState } from "react";
import { requestJson } from "@/shared/client";
export default function Login() {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [savedCode, setSavedCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function continueToApp() {
    window.location.replace(new URL("/play", window.location.origin).href);
  }
  return (
    <main className="lobby-page">
      <section className="lobby-panel login-panel">
        <p className="eyebrow">D&D COMPANION</p>
        <h1>
          {savedCode
            ? "Сохраните резервный код"
            : mode === "register"
              ? "Создать аккаунт"
              : mode === "recover"
                ? "Восстановить доступ"
                : "Вход в аккаунт"}
        </h1>
        <p>
          Справочники доступны без входа. Аккаунт хранит ваших персонажей,
          кампании и лобби.
        </p>
        {savedCode ? (
          <>
            <p>
              Этот код показывается только сейчас. Сохраните его в менеджере
              паролей: он позволит задать новый пароль, если вы забудете старый.
              Никому не передавайте код.
            </p>
            <label>
              Резервный код
              <input
                readOnly
                value={savedCode}
                autoComplete="off"
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />{" "}
              Я сохранил резервный код
            </label>
            <button
              className="button primary"
              disabled={!acknowledged}
              onClick={continueToApp}
            >
              Перейти к лобби
            </button>
          </>
        ) : (
          <>
            <div
              className="lobby-actions"
              role="group"
              aria-label="Действие с аккаунтом"
            >
              {(["login", "register", "recover"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`button ${mode === value ? "primary" : "secondary"}`}
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError("");
                    setPassword("");
                    setConfirm("");
                    setSetupKey("");
                  }}
                >
                  {value === "login"
                    ? "Войти"
                    : value === "register"
                      ? "Регистрация"
                      : "Забыли пароль?"}
                </button>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                if (mode !== "login" && password !== confirm) {
                  setError("Пароли не совпадают.");
                  return;
                }
                setBusy(true);
                try {
                  const result = await requestJson<{ recoveryCode?: string }>(
                    "/api/account",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: mode,
                        username,
                        password,
                        ...(mode === "register"
                          ? { displayName, ...(setupKey ? { setupKey } : {}) }
                          : {}),
                        ...(mode === "recover" ? { recoveryCode } : {}),
                      }),
                    },
                  );
                  setPassword("");
                  setConfirm("");
                  setSetupKey("");
                  setRecoveryCode("");
                  if (result.recoveryCode) setSavedCode(result.recoveryCode);
                  else continueToApp();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Логин
                <input
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <small>
                3–32 символа: латинские буквы, цифры, дефис и подчёркивание.
              </small>
              {mode === "register" && (
                <label>
                  Имя в игре
                  <input
                    required
                    autoComplete="nickname"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </label>
              )}
              {mode === "recover" && (
                <label>
                  Резервный код
                  <input
                    required
                    autoComplete="off"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                  />
                </label>
              )}
              <label>
                {mode === "login"
                  ? "Пароль"
                  : "Новый пароль — минимум 12 символов"}
                <input
                  required
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode !== "login" && (
                <label>
                  Повторите пароль
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              )}
              {mode === "register" && (
                <details>
                  <summary>Первоначальная настройка владельцем сервера</summary>
                  <p>
                    Только для владельца этой установки: ключ из
                    .local/host-key.txt или DND_HOST_KEY перенесёт прежние
                    данные в ваш аккаунт и выдаст права администратора. Обычная
                    регистрация не требует ключа.
                  </p>
                  <label>
                    Ключ установки
                    <input
                      type="password"
                      autoComplete="off"
                      value={setupKey}
                      onChange={(e) => setSetupKey(e.target.value)}
                    />
                  </label>
                </details>
              )}
              {error && (
                <p className="lobby-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Подождите…"
                  : mode === "login"
                    ? "Войти"
                    : mode === "register"
                      ? "Создать аккаунт"
                      : "Задать новый пароль"}
              </button>
            </form>
          </>
        )}
        <Link href="/">Открыть справочники без входа →</Link>
        <Link href="/play">Присоединиться к лобби по приглашению →</Link>
      </section>
    </main>
  );
}
