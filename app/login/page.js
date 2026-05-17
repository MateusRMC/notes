"use client";

import { useState } from "react";

export default function Home() {
  const [emailReg, setEmailReg] = useState("");
  const [passReg, setPassReg] = useState("");

  const [emailLog, setEmailLog] = useState("");
  const [passLog, setPassLog] = useState("");

  async function register(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailReg,
        password: passReg,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.log("Erro no registro:", json.error);
      return;
    }

    console.log("Registro:", json);

    if (json.needsEmailConfirmation) {
      console.log("Conta criada. Confirme seu e-mail.");
    } else {
      console.log("Conta criada e usuário logado.");
      window.location.href = "/protect";
    }
  }

  async function login(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailLog,
        password: passLog,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.log("Erro no login:", json.error);
      return;
    }

    console.log("Login:", json);
    window.location.href = "/protect";
  }

  return (
    <div className="auth">
      <form className="register" onSubmit={register}>
        <input
          type="email"
          placeholder="Your best email"
          onChange={(e) => setEmailReg(e.target.value)}
          value={emailReg}
          required
        />

        <input
          type="password"
          placeholder="Type your password"
          onChange={(e) => setPassReg(e.target.value)}
          value={passReg}
          required
        />

        <input type="submit" value="REGISTER" />
      </form>

      <form className="login" onSubmit={login}>
        <input
          type="email"
          placeholder="Your best email"
          onChange={(e) => setEmailLog(e.target.value)}
          value={emailLog}
          required
        />

        <input
          type="password"
          placeholder="Type your password"
          onChange={(e) => setPassLog(e.target.value)}
          value={passLog}
          required
        />

        <input type="submit" value="LOGIN" />
      </form>
    </div>
  );
}
