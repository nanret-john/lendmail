"use client";

import { useState } from "react";
import Image from "next/image";
import { connectGmailForDemo, signInForDemo, type DemoUser } from "@/lib/demo-service";

type Screen = "landing" | "welcome" | "connect" | "dashboard";

const ArrowRight = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" /></svg>;
const Check = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4.5 10.5 3.2 3.2 7.8-8" /></svg>;
const Lock = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /></svg>;
const Spark = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 5.4 3.1 8 8.5 8.5-5.4.5-8 3.1-8.5 8.5-.5-5.4-3.1-8-8.5-8.5 5.4-.5 8-3.1 8.5-8.5Z" /></svg>;
const GoogleMark = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="google-mark"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" /><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.39 13.89A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.89v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.6Z" /><path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.6C7.18 7.74 9.39 5.98 12 5.98Z" /></svg>;

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="brand" aria-label="LendMail"><Image src="/lendsqr-mark.svg" alt="" width={24} height={25} priority />{!compact && <span className="product-name">LendMail</span>}</div>;
}

function DemoBadge() { return <span className="demo-badge"><span /> Interactive prototype</span>; }

function Landing({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return <main className="landing">
    <nav className="topbar"><Logo /><DemoBadge /></nav>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><Spark /> Meeting notes, handled</div>
        <h1>From meeting finished<br />to <em>draft ready.</em></h1>
        <p>LendMail turns Gemini meeting notes into polished, client-ready email drafts—so you only need to review and send.</p>
        <button className="primary-button" onClick={onStart} disabled={busy}><GoogleMark />{busy ? "Signing you in…" : "Continue with Google"}{!busy && <ArrowRight />}</button>
        <div className="trust-line"><Lock /> Built for Lendsqr Workspace · We never send without you</div>
      </div>
      <div className="hero-visual" aria-label="Example LendMail workflow">
        <div className="glow glow-one" /><div className="glow glow-two" />
        <div className="meeting-card floating-card">
          <div className="card-topline"><span className="gemini-icon"><Spark /></span><div><b>Meeting notes are ready</b><small>Gemini · just now</small></div><span className="more">•••</span></div>
          <div className="meeting-meta"><span>Q3 Partnership Review</span><span>45 min</span></div>
          <div className="people-row"><span className="avatar avatar-one">NJ</span><span className="avatar avatar-two">AO</span><span className="avatar avatar-three">TM</span><small>+ 3 attendees</small></div>
        </div>
        <div className="flow-rail"><span /><span /><span /></div>
        <div className="draft-card floating-card">
          <div className="draft-heading"><span className="mail-icon">M</span><div><small>Draft created</small><b>Q3 Partnership Review — Meeting Notes</b></div><span className="status-pill">Ready to review</span></div>
          <div className="draft-address"><span>To</span> Ada Okafor &lt;ada@northstar.com&gt;</div>
          <div className="draft-body"><b>Hi Ada,</b><p>Thank you for a productive session today. Here&apos;s a summary of what we aligned on.</p><h4>Key decisions</h4><p>• Launch the pilot with two branches in September<br />• Weekly progress check-ins on Thursdays</p><h4>Next steps</h4><div className="task-row"><Check /><span>Share integration checklist</span><small>Nanret · Aug 23</small></div></div>
        </div>
        <div className="time-chip"><span>✦</span><b>20 min saved</b><small>on this meeting</small></div>
      </div>
    </section>
    <section className="how-it-works"><p>HOW IT WORKS</p><div><article><span>01</span><b>Gemini wraps up</b><small>Your existing notes stay exactly as they are.</small></article><i /><article><span>02</span><b>LendMail gets to work</b><small>We structure and format the important details.</small></article><i /><article><span>03</span><b>You review & send</b><small>A polished draft waits safely in your Gmail.</small></article></div></section>
  </main>;
}

function Welcome({ user, onContinue }: { user: DemoUser; onContinue: () => void }) {
  return <main className="onboarding-shell"><header><Logo /><DemoBadge /></header><section className="welcome-panel panel-enter">
    <div className="success-orbit"><Check /></div><p className="step-label">WELCOME TO LENDMAIL</p><h1>Nice to meet you, {user.name.split(" ")[0]}.</h1><p className="lead">Let&apos;s turn your next meeting into a client-ready draft. It only takes a minute to get set up.</p>
    <div className="account-chip"><GoogleMark /><span><small>Signed in as</small><b>{user.email}</b></span><Check /></div>
    <button className="primary-button wide" onClick={onContinue}>Set up LendMail <ArrowRight /></button><div className="step-dots"><span className="active" /><span /><span /></div>
  </section></main>;
}

function Connect({ onConnect, busy }: { onConnect: () => void; busy: boolean }) {
  const permissions = [["Read meeting notifications", "We only look for emails from Gemini when notes are ready."], ["Open linked meeting notes", "We use the Google Doc to prepare an accurate summary."], ["Create Gmail drafts", "A ready-to-review draft appears in your mailbox. Nothing is sent."]];
  return <main className="onboarding-shell"><header><Logo /><DemoBadge /></header><section className="connect-layout panel-enter">
    <div className="connect-copy"><p className="step-label">STEP 2 OF 3</p><h1>Connect your Gmail</h1><p className="lead">LendMail needs permission to spot your meeting notes and place finished drafts in your mailbox.</p>
      <div className="permission-list">{permissions.map(([title, body], index) => <div key={title}><span>{index === 2 ? "✎" : index === 1 ? "⌑" : "✉"}</span><p><b>{title}</b><small>{body}</small></p><i><Check /></i></div>)}</div>
      <button className="primary-button wide" onClick={onConnect} disabled={busy}><GoogleMark /> {busy ? "Connecting securely…" : "Connect Gmail"} {!busy && <ArrowRight />}</button><p className="microcopy"><Lock /> You can disconnect at any time. Your access stays yours.</p><div className="step-dots"><span /><span className="active" /><span /></div>
    </div>
    <div className="privacy-card"><div className="privacy-illustration"><span className="ring ring-one" /><span className="ring ring-two" /><span className="shield"><Lock /></span><span className="mini-node node-mail">M</span><span className="mini-node node-note">✦</span></div><h3>Your inbox stays private.</h3><p>LendMail only accesses what it needs to prepare your meeting drafts. Admins cannot read your email or transcripts.</p><ul><li><Check /> You stay in control</li><li><Check /> Drafts are never auto-sent</li><li><Check /> Disconnect whenever you want</li></ul></div>
  </section></main>;
}

function Dashboard({ user, onReplay }: { user: DemoUser; onReplay: () => void }) {
  const meetings = [
    { title: "Q3 Partnership Review", client: "Northstar Finance", time: "Today, 10:00 AM", status: "Draft ready", tone: "ready", initials: "NF" },
    { title: "Weekly Product Sync", client: "Internal", time: "Yesterday, 3:30 PM", status: "Processing", tone: "processing", initials: "PS" },
    { title: "Collections API Discovery", client: "Veridian MFB", time: "Aug 19, 11:00 AM", status: "Needs client", tone: "attention", initials: "VM" },
  ];
  return <main className="dashboard panel-enter"><aside><Logo /><nav><button className="active">⌂ <span>Overview</span></button><button>▱ <span>Meetings</span></button><button>✦ <span>My styles</span></button></nav><div className="side-bottom"><button>⚙ <span>Settings</span></button><div className="profile"><span>NJ</span><p><b>{user.name}</b><small>{user.email}</small></p></div></div></aside>
    <section className="dashboard-main"><header><div><p className="step-label">YOUR WORKSPACE</p><h1>Good morning, {user.name.split(" ")[0]}</h1><span>Your meeting notes are under control.</span></div><div className="connected-pill"><i /><span><small>Gmail connected</small><b>{user.email}</b></span><Check /></div></header>
      <div className="demo-notice"><Spark /><p><b>You&apos;re all set.</b> This preview uses demo meetings to show what your workspace will look like.</p><button onClick={onReplay}>Replay onboarding</button></div>
      <div className="stats-grid"><article><span className="stat-icon purple">✦</span><p><small>Drafts ready</small><b>12</b><em>+4 this week</em></p></article><article><span className="stat-icon green">✓</span><p><small>Minutes saved</small><b>240</b><em>About 4 hours</em></p></article><article><span className="stat-icon amber">⌁</span><p><small>Needs attention</small><b>1</b><em>Client tag needed</em></p></article></div>
      <div className="meetings-card"><div className="section-heading"><div><h2>Recent meetings</h2><p>Follow each note from capture to Gmail draft.</p></div><button>View all <ArrowRight /></button></div><div className="meeting-table">{meetings.map((meeting) => <div className="meeting-row" key={meeting.title}><span className={`meeting-avatar ${meeting.tone}`}>{meeting.initials}</span><p><b>{meeting.title}</b><small>{meeting.client} · {meeting.time}</small></p><span className={`row-status ${meeting.tone}`}><i />{meeting.status}</span><button aria-label={`Open ${meeting.title}`}>›</button></div>)}</div></div>
    </section>
  </main>;
}

export function DemoApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [user, setUser] = useState<DemoUser | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() { setBusy(true); const signedInUser = await signInForDemo(); setUser(signedInUser); setBusy(false); setScreen("welcome"); }
  async function connect() { setBusy(true); await connectGmailForDemo(); setBusy(false); setScreen("dashboard"); }

  if (screen === "landing") return <Landing onStart={signIn} busy={busy} />;
  if (screen === "welcome" && user) return <Welcome user={user} onContinue={() => setScreen("connect")} />;
  if (screen === "connect") return <Connect onConnect={connect} busy={busy} />;
  if (screen === "dashboard" && user) return <Dashboard user={user} onReplay={() => setScreen("welcome")} />;
  return null;
}
