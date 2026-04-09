import { useState, useEffect, useRef } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const TEMPLATE_STEPS = [
  {
    id: 1, label: "ROLE", color: "#B8F060",
    title: "Define the Expert",
    instruction: "You are a top 0.1% expert in [FIELD]",
    hint: "The more specific the financial domain, the better the output.",
    placeholder: "e.g. UX strategy for retail mobile banking, design systems for financial platforms",
    persistentExample: "UX strategy for retail mobile banking apps",
    examples: [
      "UX strategy for retail mobile banking apps",
      "Design systems for omnichannel financial platforms",
      "User research and journey mapping for fintech onboarding flows",
      "Conversational UI and AI-powered banking experience design",
      "Enterprise UX for core banking and back-office transformation",
    ],
    tip: "Match the role to your deliverable. A UX audit needs a different expert than a stakeholder narrative or RFP response.",
    field: "role"
  },
  {
    id: 2, label: "TASK", color: "#5DD8F5",
    title: "State the Task Clearly",
    instruction: "I want you to [SPECIFIC ACTION] and output [FORMAT]",
    hint: "One action + one output format. Don't let the AI guess.",
    placeholder: "e.g. synthesize user interview insights and output a prioritized insight cluster",
    persistentExample: "Audit the onboarding flow and output a prioritized list of UX issues",
    examples: [
      "Synthesize these user interview notes and output a prioritized insight cluster with themes and supporting quotes",
      "Write a strategic project rationale for a private banking app redesign and output a 3-paragraph executive narrative",
      "Conduct a UX audit of this mobile banking flow and output a prioritized issue list with severity ratings",
      "Draft an RFP response for a neobank redesign project and output a structured proposal with sections: approach, team, timeline",
      "Create a JTBD-based user persona for a corporate banking platform and output a structured persona card",
    ],
    tip: "Name the output format explicitly: insight cluster, executive narrative, issue list, persona card, journey map, etc.",
    field: "task"
  },
  {
    id: 3, label: "CONTEXT", color: "#FFAD3D",
    title: "Provide Your Context",
    instruction: "Here is my context: [EVERYTHING RELEVANT]",
    hint: "Dump everything — client type, project stage, what's done, who reads the output.",
    placeholder: "e.g. The client is a mid-size retail bank in the Baltics. We're in discovery phase...",
    persistentExample: "Client is a retail bank, 2M users, redesigning their mobile app. Stakeholder is the CDO.",
    examples: [
      "Client is a Baltic retail bank with 2M users. We are in discovery phase. The presentation audience is the CDO and Head of Digital Product.",
      "This is a neobank targeting millennials aged 25–38 in the EU. The existing onboarding flow has a 61% drop-off rate at step 3.",
      "We are designing a wealth management platform for HNWI clients. The current system is a 10-year-old desktop legacy tool being migrated to web and mobile.",
      "The client is a corporate banking division of a top-10 European bank. Primary users are treasury managers and CFOs of mid-size enterprises.",
      "We are pitching a full UX redesign to the CEO of a crypto wallet startup. They have 80k active users and are preparing a Series B round.",
    ],
    tip: "Include client type, user segment, project phase, and who will act on the output. Real numbers beat vague descriptions.",
    field: "context"
  },
  {
    id: 4, label: "CONSTRAINTS", color: "#F0527A",
    title: "Set Your Constraints",
    instruction: "Constraints: [LIST YOUR LIMITS]",
    hint: "Tell the AI what's off the table — tone, format, compliance, audience limitations.",
    placeholder: "e.g. tone must be strategic not operational, no jargon the C-suite won't understand",
    persistentExample: "Tone must be strategic, not operational. No UX jargon. Max 300 words.",
    examples: [
      "Tone must be strategic and confident — avoid operational UX jargon. The reader is a C-suite executive, not a designer.",
      "Output must comply with GDPR framing — do not suggest data collection approaches that require explicit new consent flows.",
      "The deliverable must fit within a 10-minute stakeholder presentation. No more than 5 key points.",
      "Design recommendations must be implementable within the client's existing design system — no new components.",
      "This is an internal UXDA document — tone can be direct and candid. No need to soften critique of the client's current UX.",
    ],
    tip: "Audience constraints are the most powerful. 'The reader is a CDO, not a designer' changes everything about tone and framing.",
    field: "constraints"
  },
  {
    id: 5, label: "CLARIFY", color: "#9B6EEA",
    title: "Ask for Clarifying Questions",
    instruction: "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully.",
    hint: "This one line surfaces blind spots before the AI starts — not after.",
    placeholder: null,
    persistentExample: null,
    examples: [],
    tip: "'One at a time' forces deeper dialogue rather than a list you'll skim and half-answer.",
    field: null
  }
];

const POWER_MOVES = [
  { icon: "⚔️", title: "Sparring Partner", prompt: "Argue with me. What are the weak points in this? What assumptions am I making that aren't backed by data? What would a skeptic say?", use: "When you want your idea stress-tested, not validated." },
  { icon: "🔬", title: "Devil's Advocate", prompt: "Play devil's advocate. Tear this apart from the perspective of someone who would reject it. What are the top 3 reasons this fails?", use: "Before pitching a concept or submitting a proposal." },
  { icon: "🎓", title: "24/7 Tutor", prompt: "Teach me [concept] as if I'm smart but completely new to it. Use an analogy, then give me a real-world example from [my field].", use: "When onboarding to a new tool, framework, or idea." },
  { icon: "📋", title: "Reusable Skill", prompt: "Based on our conversation, write a reusable SKILL.md file I can use to prompt you with this exact context in future sessions. Include role, key context, constraints, and output format.", use: "After any session you'd want to repeat." },
  { icon: "🧠", title: "Memory Prompt", prompt: "Summarize everything important you've learned about me, my work, my goals, and my style from this conversation. Format it as a CLAUDE.md memory file.", use: "At the end of productive sessions to preserve context." },
];

const STORAGE_KEY = "uxda_prompt_v2";

// ── Utils ─────────────────────────────────────────────────────────────────────

function copyText(text, onDone) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, 99999);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) {}
  document.body.removeChild(ta);
  if (ok) { onDone(); return; }
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(onDone).catch(() => {});
}

function loadFields() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return { role: "", task: "", context: "", constraints: "" };
}
function saveFields(f) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch (_) {}
}

// ── Global styles ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2E2E3A; border-radius: 2px; }

  body { font-family: 'DM Sans', sans-serif; background: #080808; color: #D8D8D8; }

  button, input, textarea { font-family: 'DM Sans', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  /* Step transition */
  @keyframes stepIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .step-in { animation: stepIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }

  /* Page load */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .fade-up-1 { animation-delay: 0.05s; }
  .fade-up-2 { animation-delay: 0.12s; }
  .fade-up-3 { animation-delay: 0.19s; }

  /* Preview flash */
  @keyframes lineFlash {
    0%   { background: rgba(255,255,255,0.07); }
    100% { background: transparent; }
  }
  .line-flash { animation: lineFlash 0.55s ease-out; border-radius: 3px; }

  /* Delight pulse on completion */
  @keyframes completePulse {
    0%   { box-shadow: 0 0 0 0 rgba(184,240,96,0.4); }
    70%  { box-shadow: 0 0 0 10px rgba(184,240,96,0); }
    100% { box-shadow: 0 0 0 0 rgba(184,240,96,0); }
  }
  .complete-pulse { animation: completePulse 0.6s ease-out; }

  /* Hover lift */
  .lift { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
  .lift:hover { transform: translateY(-2px); }

  /* Button base */
  .btn { cursor: pointer; border: none; outline: none; transition: opacity 0.15s, transform 0.1s; }
  .btn:hover { opacity: 0.88; }
  .btn:active { transform: scale(0.97); }

  /* Nav active indicator */
  .nav-active { position: relative; }
  .nav-active::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 50%;
    transform: translateX(-50%);
    width: 16px; height: 2px;
    background: #B8F060;
    border-radius: 1px;
  }

  /* Sidebar item hover */
  .sidebar-item { transition: background 0.15s; }
  .sidebar-item:hover { background: #0F0F0F !important; }

  /* Example chip */
  .ex-chip { transition: border-color 0.15s, color 0.15s, background 0.15s; }

  /* Textarea focus glow */
  textarea:focus { outline: none; }

  /* Quality indicator transition */
  .quality-bar { transition: width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s; }
`;

// ── Progress dots ─────────────────────────────────────────────────────────────

function StepDots({ fields, step }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {TEMPLATE_STEPS.map((s, i) => {
        const filled = s.field ? !!fields[s.field]?.trim() : false;
        const active = step === i;
        return (
          <div key={i} style={{
            width: active ? 20 : filled ? 8 : 6,
            height: 6,
            borderRadius: 3,
            background: active ? s.color : filled ? s.color : "#2A2A2A",
            opacity: active ? 1 : filled ? 0.7 : 1,
            transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
            flexShrink: 0
          }} />
        );
      })}
    </div>
  );
}

// ── Quality bar ───────────────────────────────────────────────────────────────

function QualityBar({ value, threshold, color }) {
  const pct = Math.min(100, Math.round((value / threshold) * 100));
  const met = pct >= 100;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 2, background: "#1E1E26", borderRadius: 1, overflow: "hidden" }}>
        <div className="quality-bar" style={{ height: "100%", width: `${pct}%`, background: met ? color : "#38383E", borderRadius: 1 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 11, color: met ? color : "#8A8A9A", transition: "color 0.3s", fontFamily: "'DM Mono', monospace" }}>
          {met ? "✓ Good detail level" : `${threshold - value} chars to go`}
        </span>
        <span style={{ fontSize: 11, color: "#7A7A80", fontFamily: "'DM Mono', monospace" }}>{value}c</span>
      </div>
    </div>
  );
}

// ── Power card ────────────────────────────────────────────────────────────────

function PowerCard({ pm, delay = 0 }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="lift fade-up" style={{ animationDelay: `${delay}s`, padding: "22px", background: "#0E0E12", border: "1px solid #1E1E26", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{pm.icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#EEEEF2", marginBottom: 3 }}>{pm.title}</div>
          <div style={{ fontSize: 12, color: "#8A8A9A", lineHeight: 1.5 }}>{pm.use}</div>
        </div>
      </div>
      <div style={{ padding: "12px 14px", background: "#0E0E12", borderRadius: "8px", fontSize: 13, color: "#B8F060", lineHeight: 1.7, fontStyle: "italic", flex: 1, fontFamily: "'DM Mono', monospace" }}>
        "{pm.prompt}"
      </div>
      <button className="btn" onClick={() => copyText(pm.prompt, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
        style={{ padding: "9px 14px", background: copied ? "#0A1A0F" : "#161616", border: `1px solid ${copied ? "#1E4A2A" : "#262626"}`, borderRadius: "7px", color: copied ? "#4ABA74" : "#8A8A9A", fontSize: 12, letterSpacing: "0.04em", textAlign: "center", fontWeight: 500, transition: "all 0.15s" }}>
        {copied ? "✓  Copied" : "Copy prompt"}
      </button>
    </div>
  );
}

// ── Editable assembled card ───────────────────────────────────────────────────

function EditableCard({ label, color, field, prefix, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(taRef.current.value.length, taRef.current.value.length);
    }
  }, [editing]);

  const save = () => { setEditing(false); if (onChange) onChange(draft); };
  const isEditable = !!onChange;

  // Neutral card — color is used ONLY for the label text, not backgrounds or borders
  return (
    <div style={{ marginBottom: 6, borderRadius: 10, overflow: "hidden", border: `1px solid ${editing ? "#38383E" : "#181818"}`, transition: "border-color 0.2s", cursor: isEditable && !editing ? "pointer" : "default" }}
      onClick={() => { if (isEditable && !editing) setEditing(true); }}>
      {/* Header: neutral bg, only the label tag carries color */}
      <div style={{ padding: "7px 14px", background: "#0E0E12", borderBottom: "1px solid #1E1E26", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, letterSpacing: "0.16em", color: color, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{label}</span>
        </div>
        {isEditable && (
          <span style={{ fontSize: 11, color: editing ? "#9898A8" : "#7A7A80", transition: "color 0.15s" }}>
            {editing ? "⌘↵ save" : "✎ edit"}
          </span>
        )}
      </div>
      <div style={{ background: "#070709" }}>
        {editing ? (
          <div>
            <textarea ref={taRef} value={draft} rows={3}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
              style={{ width: "100%", background: "#0E0E12", border: "none", outline: "none", padding: "12px 14px", fontSize: 13, color: "#EEEEF2", lineHeight: 1.7, resize: "vertical", fontFamily: "'DM Sans', sans-serif" }} />
            <div style={{ display: "flex", gap: 6, padding: "8px 12px 10px" }}>
              <button className="btn" onClick={e => { e.stopPropagation(); save(); }} style={{ padding: "5px 14px", background: color, border: "none", borderRadius: 5, color: "#0A0A0A", fontSize: 11, fontWeight: 700 }}>Save</button>
              <button className="btn" onClick={e => { e.stopPropagation(); setDraft(value); setEditing(false); }} style={{ padding: "5px 14px", background: "transparent", border: "1px solid #2E2E3A", borderRadius: 5, color: "#8A8A9A", fontSize: 11 }}>Cancel</button>
              <span style={{ fontSize: 10, color: "#7A7A80", alignSelf: "center", marginLeft: 4 }}>Esc to cancel</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "13px 14px", fontSize: 13, color: value ? "#B8B8B8" : "#7A7A80", lineHeight: 1.8, whiteSpace: "pre-wrap", fontStyle: value ? "normal" : "italic" }}>
            {prefix}{value || "[empty — click to fill]"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PromptGuide() {
  const [view, setView] = useState("template");
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState(loadFields);
  const [copied, setCopied] = useState(false);
  const [flashField, setFlashField] = useState(null);
  const [stepKey, setStepKey] = useState(0); // triggers re-mount for animation
  const [justCompleted, setJustCompleted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { saveFields(fields); }, [fields]);

  // ⌘↵ to advance
  useEffect(() => {
    const h = (e) => {
      if (view !== "template") return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, step]); // eslint-disable-line

  // Focus textarea on step change
  useEffect(() => {
    if (textareaRef.current) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [step]);

  const S = TEMPLATE_STEPS[step];
  const allEmpty = !fields.role && !fields.task && !fields.context && !fields.constraints;
  const filledCount = TEMPLATE_STEPS.filter(s => s.field && fields[s.field]?.trim()).length;

  const assembled = [
    `You are a top 0.1% expert in ${fields.role || "[FIELD]"}.`,
    "",
    fields.task || "[TASK + OUTPUT FORMAT]",
    "",
    `Context: ${fields.context || "[YOUR CONTEXT]"}`,
    "",
    `Constraints: ${fields.constraints || "[YOUR CONSTRAINTS]"}`,
    "",
    "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully."
  ].join("\n");

  const doCopy = () => copyText(assembled, () => { setCopied(true); setTimeout(() => setCopied(false), 2500); });

  const updateField = (key, val) => {
    setFields(f => ({ ...f, [key]: val }));
    setFlashField(key);
    setTimeout(() => setFlashField(null), 600);
  };

  const goNext = () => {
    if (step < 4) {
      setStepKey(k => k + 1);
      setStep(s => s + 1);
    } else {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 700);
      setView("assembled");
    }
  };

  const goBack = () => {
    if (view === "assembled") { setView("template"); setStep(4); }
    else if (step > 0) { setStepKey(k => k + 1); setStep(s => s - 1); }
  };

  const clearAll = () => {
    if (window.confirm("Clear all fields and start over?")) {
      const empty = { role: "", task: "", context: "", constraints: "" };
      setFields(empty); saveFields(empty); setStep(0); setView("template");
    }
  };

  const handleNavClick = (v) => {
    if (v === "assembled" && allEmpty) { setView("template"); setStep(0); return; }
    setView(v);
  };

  const qualityThresholds = { role: 20, task: 50, context: 100, constraints: 40 };

  // preview line color — each line matches its step accent
  const lineColor = (line) => {
    if (line.startsWith("You are")) return "#B8F060";   // ROLE
    if (line.startsWith("Context:")) return "#FFAD3D";  // CONTEXT
    if (line.startsWith("Constraints:")) return "#F0527A"; // CONSTRAINTS
    if (line.startsWith("Ask me")) return "#9B6EEA";    // CLARIFY
    if (line.trim()) return "#5DD8F5";                  // TASK — anything else with content
    return null;
  };
  const lineField = (line) => {
    if (line.startsWith("You are")) return "role";
    if (line.startsWith("Context:")) return "context";
    if (line.startsWith("Constraints:")) return "constraints";
    if (line.trim() && !line.startsWith("Ask me")) return "task";
    return null;
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{ background: "#070709", borderBottom: "1px solid #1E1E26", padding: isMobile ? "10px 12px" : "0 32px", height: isMobile ? "auto" : 56, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)" }}>
      {/* Logo mark */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 3, height: 28, background: "#B8F060", borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: "0.08em", color: "#EEEEF2", lineHeight: 1 }}>PROMPT ROUGE</div>
          {!isMobile && <div style={{ fontSize: 10, color: "#8A8A9A", marginTop: 1, letterSpacing: "0.04em" }}>AI Prompt Engineer</div>}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 0, marginLeft: isMobile ? 8 : 32, borderBottom: "none" }}>
        {[
          { label: isMobile ? "Build" : "Template", v: "template" },
          { label: isMobile ? "Result" : "Assembled", v: "assembled" },
          { label: isMobile ? "Moves" : "Power Moves", v: "power" },
        ].map(({ label, v }) => {
          const active = view === v;
          const isPower = v === "power";
          return (
            <button key={v} className={`btn${active ? " nav-active" : ""}`} onClick={() => handleNavClick(v)}
              style={{ padding: isMobile ? "5px 7px" : "0 16px", height: isMobile ? "auto" : 56, background: "transparent", border: "none", fontSize: isMobile ? 11 : 13, fontWeight: active ? 600 : 400, color: active ? "#EEEEF2" : isPower ? "#B8F060" : "#8A8A9A", cursor: "pointer", position: "relative", letterSpacing: "0.01em", transition: "color 0.15s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {!isMobile && view === "template" && (
          <div style={{ fontSize: 11, color: "#8A8A9A", fontFamily: "'DM Mono', monospace" }}>
            <span style={{ padding: "2px 6px", background: "#141418", border: "1px solid #1E1E26", borderRadius: 3 }}>⌘↵</span>
            {" "}next
          </div>
        )}
        {filledCount > 0 && (
          <button className="btn" onClick={clearAll} style={{ fontSize: 11, color: "#7A7A80", background: "transparent", border: "1px solid #1E1E26", borderRadius: 6, padding: "4px 10px", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#8A8A9A"; e.currentTarget.style.borderColor = "#7A7A80"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#7A7A80"; e.currentTarget.style.borderColor = "#1E1E26"; }}>
            ↺ Clear
          </button>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATE VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "template") {
    const charCount = S.field ? (fields[S.field]?.length || 0) : 0;
    const threshold = S.field ? (qualityThresholds[S.field] || 40) : 0;

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#070709", minHeight: "100vh", color: "#EEEEF2" }}>
        <style>{GLOBAL_CSS}</style>
        <Header />

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr 272px", height: isMobile ? "auto" : "calc(100vh - 56px)" }}>

          {/* ── Sidebar ── */}
          {isMobile ? (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1E1E26", display: "flex", gap: 6, overflowX: "auto" }}>
              {TEMPLATE_STEPS.map((s, i) => {
                const done = s.field && fields[s.field]?.trim();
                const active = step === i;
                return (
                  <button key={i} className="btn" onClick={() => { setStepKey(k => k + 1); setStep(i); }} style={{ padding: "5px 12px", borderRadius: 20, flexShrink: 0, background: active ? s.color : done ? s.color + "20" : "#111", border: `1px solid ${active ? s.color : done ? s.color + "50" : "#222"}`, color: active ? "#0A0A0A" : done ? s.color : "#8A8A9A", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
                    {done && !active ? "✓ " : ""}{s.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ borderRight: "1px solid #1E1E26", padding: "24px 0", display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {TEMPLATE_STEPS.map((s, i) => {
                const done = s.field && fields[s.field]?.trim();
                const active = step === i;
                return (
                  <button key={i} className="btn sidebar-item" onClick={() => { setStepKey(k => k + 1); setStep(i); }}
                    style={{ padding: "11px 20px", textAlign: "left", borderLeft: `2px solid ${active ? s.color : "transparent"}`, background: active ? "#0D0D0D" : "transparent", display: "flex", alignItems: "center", gap: 12, border: "none", borderLeft: `2px solid ${active ? s.color : "transparent"}`, cursor: "pointer" }}>
                    {/* Step indicator */}
                    <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: active ? s.color : done ? s.color + "22" : "#141414", border: done && !active ? `1px solid ${s.color}55` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: active ? "#0A0A0A" : done ? s.color : "#7A7A80", transition: "all 0.2s", fontFamily: "'DM Mono', monospace" }}>
                      {done && !active ? "✓" : s.id}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: active ? s.color : done ? s.color + "99" : "#7A7A80", fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: active ? "#EEEEF2" : done ? "#9898A8" : "#8A8A9A", fontWeight: active ? 500 : 400 }}>{s.title}</div>
                    </div>
                  </button>
                );
              })}

              <div style={{ margin: "20px 20px 12px", height: 1, background: "#141418" }} />
              <div style={{ padding: "0 20px" }}>
                <div style={{ fontSize: 11, color: "#8A8A9A", lineHeight: 1.6, marginBottom: 8 }}>{filledCount} of 4 fields filled</div>
                <div style={{ height: 2, background: "#141418", borderRadius: 1, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${(filledCount / 4) * 100}%`, background: "#B8F060", borderRadius: 1, transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Main content ── */}
          <div style={{ padding: isMobile ? "20px 16px" : "32px 36px", overflowY: "auto" }}>
            {/* Step dots */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <StepDots fields={fields} step={step} />
              <div style={{ fontSize: 11, color: "#8A8A9A", fontFamily: "'DM Mono', monospace" }}>
                {step + 1} / 5
              </div>
            </div>

            {/* Animated step content */}
            <div key={stepKey} className="step-in">
              {/* Step label + title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ padding: "2px 8px", background: S.color + "15", border: `1px solid ${S.color}35`, borderRadius: 4, fontSize: 10, letterSpacing: "0.16em", color: S.color, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{S.label}</div>
              </div>
              <h2 style={{ fontSize: isMobile ? 26 : 30, fontWeight: 600, color: "#EEEEF2", marginBottom: 6, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{S.title}</h2>

              {/* Instruction chip */}
              <div style={{ display: "inline-block", padding: "8px 14px", background: S.color + "10", border: `1px solid ${S.color}28`, borderRadius: 8, marginBottom: 10, fontSize: 13, color: S.color, lineHeight: 1.4, fontFamily: "'DM Mono', monospace" }}>
                {S.instruction}
              </div>

              {/* Hint */}
              <div style={{ fontSize: 13, color: "#9898A8", marginBottom: 20, lineHeight: 1.6 }}>{S.hint}</div>

              {/* Input */}
              {S.field ? (
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.1em", color: S.color, marginBottom: 6, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>Your Input</div>
                  <textarea
                    ref={textareaRef}
                    value={fields[S.field]}
                    onChange={e => updateField(S.field, e.target.value)}
                    placeholder={S.placeholder} rows={4}
                    style={{ width: "100%", background: "#0E0E12", border: `1px solid ${fields[S.field] ? S.color + "45" : "#1E1E26"}`, borderRadius: 10, padding: "13px 15px", fontSize: 13, color: "#EEEEF2", lineHeight: 1.7, resize: "vertical", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: "none" }}
                    onFocus={e => { e.target.style.borderColor = S.color + "70"; e.target.style.boxShadow = `0 0 0 3px ${S.color}0C`; }}
                    onBlur={e => { e.target.style.borderColor = fields[S.field] ? S.color + "45" : "#1E1E26"; e.target.style.boxShadow = "none"; }}
                  />

                  {/* Quality bar */}
                  <QualityBar value={charCount} threshold={threshold} color={S.color} />

                  {/* Persistent example */}
                  {S.persistentExample && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#8A8A9A" }}>
                      <span style={{ color: "#7A7A80" }}>e.g. </span>
                      <span style={{ color: "#8A8A9A", fontStyle: "italic" }}>{S.persistentExample}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 5 — clarify box */
                <div style={{ padding: "18px 20px", background: S.color + "08", border: `1px solid ${S.color}25`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: S.color, fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>ADD THIS VERBATIM TO EVERY COMPLEX PROMPT</div>
                  <div style={{ fontSize: 13, color: "#9898A8", lineHeight: 1.8, fontStyle: "italic", padding: "12px 14px", background: "#0E0E12", borderRadius: 7, fontFamily: "'DM Mono', monospace" }}>
                    "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully."
                  </div>
                </div>
              )}

              {/* Examples */}
              {S.examples.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: "#8A8A9A", marginBottom: 8 }}>Click an example to use it ↓</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {S.examples.map((ex, i) => (
                      <div key={i} className="ex-chip"
                        onClick={() => updateField(S.field, ex)}
                        style={{ padding: "9px 13px", background: "#0E0E12", border: "1px solid #1E1E26", borderRadius: 8, fontSize: 12, color: "#9898A8", lineHeight: 1.5, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = S.color + "55"; e.currentTarget.style.color = "#AAAAAA"; e.currentTarget.style.background = "#141418"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E26"; e.currentTarget.style.color = "#9898A8"; e.currentTarget.style.background = "#0C0C0C"; }}>
                        <span style={{ color: S.color, flexShrink: 0, marginTop: 1, fontSize: 10 }}>↗</span>
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tip — uses step color */}
              <div style={{ marginTop: 18, padding: "10px 14px", background: S.color + "08", border: `1px solid ${S.color}18`, borderRadius: 8, fontSize: 12, color: S.color + "BB", display: "flex", gap: 8, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0 }}>💡</span>
                <span>{S.tip}</span>
              </div>

              {/* Nav buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
                {step > 0 && (
                  <button className="btn" onClick={goBack} style={{ padding: "10px 18px", background: "#0E0E12", border: "1px solid #1E1E26", borderRadius: 8, color: "#8A8A9A", fontSize: 13, fontWeight: 500 }}>
                    ← Back
                  </button>
                )}
                <button className={`btn${step === 4 ? " complete-pulse" : ""}`} onClick={goNext}
                  style={{ padding: step === 4 ? "13px 30px" : "10px 22px", background: S.color, border: "none", borderRadius: 8, color: "#0A0A0A", fontSize: step === 4 ? 14 : 13, fontWeight: 700, letterSpacing: "0.02em", boxShadow: step === 4 ? `0 0 28px ${S.color}35` : "none", transition: "all 0.25s" }}>
                  {step < 4 ? "Next →" : "Build My Prompt →"}
                </button>
                {step === 4 && <div style={{ fontSize: 12, color: "#8A8A9A" }}>You're ready ✓</div>}
              </div>

              {/* Step 5 — Power Moves nudge */}
              {step === 4 && (
                <div style={{ marginTop: 20, padding: "14px 16px", background: "#0E0E12", border: "1px solid #1E1E26", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⚡</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#EEEEF2", marginBottom: 4 }}>Before you copy — check Power Moves</div>
                    <div style={{ fontSize: 12, color: "#8A8A9A", lineHeight: 1.6, marginBottom: 10 }}>
                      Sparring partner, devil's advocate, reusable skills — prompts that go beyond the template.
                    </div>
                    <button className="btn" onClick={() => setView("power")}
                      style={{ padding: "6px 14px", background: "transparent", border: "1px solid #B8F060", borderRadius: 6, color: "#B8F060", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                      View Power Moves →
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile smart nudge — fixed to bottom of viewport */}
              {isMobile && S.field && charCount > 12 && step < 4 && (
                <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, padding: "12px 16px", background: "#0E0E12", borderTop: `1px solid ${S.color}40`, display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(8px)" }}>
                  <span style={{ fontSize: 12, color: S.color }}>Looks good ✓</span>
                  <button className="btn" onClick={goNext} style={{ background: S.color, border: "none", borderRadius: 6, padding: "8px 20px", color: "#0A0A0A", fontSize: 12, fontWeight: 700 }}>Next →</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right preview panel ── */}
          {!isMobile && (
            <div style={{ borderLeft: "1px solid #1E1E26", padding: "24px 20px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#8A8A9A", marginBottom: 12, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>Live Preview</div>
              <div style={{ flex: 1, background: "#070709", border: "1px solid #1E1E26", borderRadius: 10, padding: "14px 16px", fontSize: 12, lineHeight: 2, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'DM Mono', monospace" }}>
                {assembled.split("\n").map((line, i) => {
                  const c = lineColor(line) || "#38383E";
                  const fl = lineField(line);
                  const flashing = fl && fl === flashField;
                  return (
                    <div key={i} className={flashing ? "line-flash" : ""} style={{ color: c, minHeight: !line.trim() ? "10px" : "auto" }}>
                      {line || " "}
                    </div>
                  );
                })}
              </div>
              <button className="btn" onClick={doCopy} style={{ marginTop: 10, padding: 11, background: copied ? "#0A1A0F" : "#141418", border: `1px solid ${copied ? "#1E4A2A" : "#1E1E26"}`, borderRadius: 8, color: copied ? "#4ABA74" : "#8A8A9A", fontSize: 12, fontWeight: 600, textAlign: "center", transition: "all 0.2s" }}>
                {copied ? "✓  Copied!" : "Copy Full Prompt"}
              </button>
              <button className="btn" onClick={() => setView("assembled")} style={{ marginTop: 7, padding: 9, background: "transparent", border: "1px solid #1E1E26", borderRadius: 8, color: "#7A7A80", fontSize: 11, textAlign: "center", letterSpacing: "0.04em", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7A7A80"; e.currentTarget.style.color = "#EEEEF2"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E26"; e.currentTarget.style.color = "#7A7A80"; }}>
                Expand Full View →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSEMBLED VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "assembled") {
    if (allEmpty) {
      return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#070709", minHeight: "100vh", color: "#EEEEF2" }}>
          <style>{GLOBAL_CSS}</style>
          <Header />
          <div className="fade-up" style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 20 }}>📋</div>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#EEEEF2", marginBottom: 10, letterSpacing: "-0.02em" }}>Nothing here yet</h2>
            <p style={{ fontSize: 13, color: "#9898A8", lineHeight: 1.7, marginBottom: 24 }}>Fill in your Role, Task, Context, and Constraints first — then your assembled prompt appears here ready to copy.</p>
            <button className="btn" onClick={() => { setView("template"); setStep(0); }} style={{ padding: "12px 28px", background: "#B8F060", border: "none", borderRadius: 8, color: "#0A0A0A", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>← Start Building</button>
          </div>
        </div>
      );
    }

    const sections = [
      { label: "ROLE", color: "#B8F060", field: "role", prefix: "You are a top 0.1% expert in ", value: fields.role },
      { label: "TASK", color: "#5DD8F5", field: "task", prefix: "", value: fields.task },
      { label: "CONTEXT", color: "#FFAD3D", field: "context", prefix: "Context: ", value: fields.context },
      { label: "CONSTRAINTS", color: "#F0527A", field: "constraints", prefix: "Constraints: ", value: fields.constraints },
      { label: "CLARIFY", color: "#9B6EEA", field: null, prefix: "", value: "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully." },
    ];

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#070709", minHeight: "100vh", color: "#EEEEF2" }}>
        <style>{GLOBAL_CSS}</style>
        <Header />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px" : "36px 28px" }}>

          {/* Header row */}
          <div className="fade-up fade-up-1" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#7A7A80", marginBottom: 4, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Ready to use</div>
              <h2 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 600, color: "#EEEEF2", letterSpacing: "-0.02em" }}>Your Assembled Prompt</h2>
              <div style={{ fontSize: 12, color: "#8A8A9A", marginTop: 5 }}>
                Want to go deeper?{" "}
                <span onClick={() => setView("power")} style={{ color: "#B8F060", cursor: "pointer" }}>Try a Power Move →</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              <button className="btn" onClick={goBack} style={{ padding: "9px 16px", background: "#0E0E12", border: "1px solid #1E1E26", borderRadius: 8, color: "#8A8A9A", fontSize: 12, fontWeight: 500 }}>← Edit</button>
              <button className="btn" onClick={doCopy} style={{ padding: "9px 22px", background: copied ? "#0A1A0F" : "#B8F060", border: "none", borderRadius: 8, color: copied ? "#4ABA74" : "#0A0A0A", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", transition: "all 0.2s", boxShadow: copied ? "none" : "0 0 20px #B8F06028" }}>
                {copied ? "✓  Copied!" : "Copy Prompt"}
              </button>
            </div>
          </div>

          {/* Editable section cards */}
          <div className="fade-up fade-up-2">
            <div style={{ fontSize: 11, color: "#8A8A9A", marginBottom: 10 }}>Click any section to edit inline ↓</div>
            {sections.map(({ label, color, field, prefix, value }) => (
              <EditableCard key={label} label={label} color={color} field={field} prefix={prefix} value={value}
                onChange={field ? v => updateField(field, v) : null} />
            ))}
          </div>

          {/* Raw textarea */}
          <div className="fade-up fade-up-3" style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, color: "#7A7A80", marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Raw — click to select all</div>
            <textarea readOnly value={assembled} rows={10} onClick={e => e.target.select()}
              style={{ width: "100%", background: "#070709", border: "1px solid #1E1E26", borderRadius: 10, padding: "14px 16px", fontSize: 12, color: "#8A8A9A", lineHeight: 1.8, outline: "none", cursor: "text", resize: "vertical", fontFamily: "'DM Mono', monospace" }} />
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POWER MOVES VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#070709", minHeight: "100vh", color: "#EEEEF2" }}>
      <style>{GLOBAL_CSS}</style>
      <Header />
      <div style={{ padding: isMobile ? "20px 16px" : "36px 32px", maxWidth: 880, margin: "0 auto" }}>
        <div className="fade-up fade-up-1">
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#7A7A80", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 5 }}>Beyond the Template</div>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: "#EEEEF2", marginBottom: 6, letterSpacing: "-0.02em" }}>Power Moves</h2>
          <p style={{ fontSize: 13, color: "#9898A8", marginBottom: 28, lineHeight: 1.7, maxWidth: 560 }}>Once you've mastered the 5-part template, these patterns unlock the next tier — using AI as a sparring partner, tutor, and persistent collaborator.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {POWER_MOVES.map((pm, i) => <PowerCard key={i} pm={pm} delay={i * 0.06} />)}
        </div>
        <div className="fade-up" style={{ marginTop: 28, padding: "18px 22px", background: "#070709", border: "1px solid #1E1E26", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#4ABA74", fontWeight: 600, marginBottom: 5 }}>The Real Shortcut: Put In The Reps</div>
          <p style={{ fontSize: 12, color: "#4ABA74", lineHeight: 1.8 }}>Watching tutorials doesn't count. The people who win with AI are using it for hours every day. Use this template, run the power moves, and iterate until they become instinct.</p>
        </div>
      </div>
    </div>
  );
}