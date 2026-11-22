"use client";

import React, { useState, useEffect } from "react";
import styles from "@/components/form/form.module.css";
import { AppInput } from "@/components/form/inputs";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

function LoginForm({ allowRegistration }) {
  const { data: session } = useSession();
  const [loginData, setLoginData] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.replace("/");
    }
  }, [session?.user, router]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        login: loginData.login,
        password: loginData.password,
        redirect: false,
      });
      if (!res?.ok || res.error) setError("Prijava nije uspjela.");
    } catch {
      setError("Prijava nije uspjela.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={onSubmit} aria-busy={submitting}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Prijava</h2>
      </div>
      <div className={styles.body}>
        {error && (
          <div className="mb-2 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {inputs.map((input, i) => {
          const { name, placeholder, type, label } = input;
          return (
            <div key={i}>
              <AppInput
                name={name}
                placeholder={placeholder}
                type={type}
                label={label}
                value={loginData[name] || ""}
                onChange={onChange}
              />
            </div>
          );
        })}
      </div>
      <div className={` flex gap-2 justify-center`}>
        <button type="submit" className="btn submitButton" disabled={submitting}>
          {submitting ? "Prijava u tijeku…" : "Prijava"}
        </button>
        {allowRegistration && <div
          className={`btn btnSecondary`}
          onClick={() => router.push("/registracija")}
        >
          Registracija
        </div>}
      </div>
    </form>
  );
}

export default LoginForm;

const inputs = [
  {
    name: "login",
    placeholder: "Email ili korisničko ime",
    type: "text",
    label: "Email ili korisničko ime",
  },
  {
    name: "password",
    placeholder: "Lozinka",
    type: "password",
    label: "Lozinka",
  },
];
