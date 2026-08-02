import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
export default async function Home() {
  const s = await getSession();
  if (s) redirect(s.role === "head" ? "/team" : "/today");
  return (
    <main className="login">
      <section className="login-art">
        <div className="brand">
          <span className="brandmark">R</span> Raha Fielddesk
        </div>
        <div>
          <span className="eyebrow" style={{ color: "rgba(253,251,212,0.55)", letterSpacing: "0.16em" }}>
            Field operations · Hyderabad
          </span>
          <h1>
            Every visit.
            <br />
            Every kilometre.
            <br />
            Accounted for.
          </h1>
          <p>
            A quieter way for field teams to record the day, and for branch
            heads to close the month without chasing spreadsheets.
          </p>
        </div>
        <small style={{ color: "rgba(253,251,212,0.38)", fontFamily: "var(--mono)", fontSize: 11 }}>
          Raha Fintech · Internal workspace
        </small>
        <div className="route-line" />
      </section>
      <section className="login-form">
        <LoginForm />
      </section>
    </main>
  );
}
