import { useState } from "react";

const TEMPLATE_STEPS = [
  {
    id: 1, label: "ROLE", color: "#C8F04E",
    title: "Define the Expert",
    instruction: "You are a top 0.1% expert in [FIELD]",
    description: "Set Claude's persona before anything else. The more specific the field, the better the output. This anchors the entire response quality.",
    placeholder: "e.g. UX design for financial apps, B2B SaaS copywriting, growth marketing for startups",
    examples: ["UX design for financial apps", "B2B SaaS copywriting", "growth marketing for startups"],
    tip: "Be domain-specific, not generic. 'marketing' is weak. 'email marketing for SaaS onboarding sequences' is strong.",
    field: "role"
  },
  {
    id: 2, label: "TASK", color: "#4ECAF0",
    title: "State the Task Clearly",
    instruction: "I want you to [SPECIFIC ACTION] and output [FORMAT]",
    description: "One clear action. State what to do AND what format you expect back. Don't let Claude guess.",
    placeholder: "e.g. research X and output a comparison table / write a 3-paragraph summary / create 5 options with pros and cons",
    examples: ["Research the top 5 email marketing tools and output a comparison table", "Rewrite this landing page headline in 5 different tones", "Audit this UI flow and output a prioritized list of issues"],
    tip: "Name the output format explicitly: table, bullet list, numbered steps, JSON, paragraph, etc.",
    field: "task"
  },
  {
    id: 3, label: "CONTEXT", color: "#F0A64E",
    title: "Provide Your Context",
    instruction: "Here is my context: [EVERYTHING RELEVANT]",
    description: "Dump everything relevant. Background, past attempts, what worked, what didn't, your goals, your audience. More context = better output.",
    placeholder: "e.g. I've tried X with Y results. My budget is Z. My audience is... My current approach is...",
    examples: ["I've run 3 A/B tests on this CTA. Version A got 2.1% CTR, Version B got 1.4%", "My client is a Latvian fintech startup targeting SMB owners aged 35–55", "I'm redesigning a banking app used by 500k monthly users, current NPS is 34"],
    tip: "Paste in actual data, real numbers, and past results. Don't summarize — give the raw context.",
    field: "context"
  },
  {
    id: 4, label: "CONSTRAINTS", color: "#F04E8A",
    title: "Set Your Constraints",
    instruction: "Constraints: [LIST YOUR LIMITS]",
    description: "Tell Claude what's off the table. Budget, time, platform, format, tone, audience, what you refuse to do. Constraints shape entirely different outputs.",
    placeholder: "e.g. no face-on-camera, budget under €500, must work in Figma, tone must be professional not casual",
    examples: ["Must be implementable in Wix without custom code", "All copy must be bilingual (Latvian + English)", "No stock photos — illustration only", "Response must fit in a single screen on mobile"],
    tip: "Negative constraints ('no X') are just as powerful as positive ones. Be explicit about both.",
    field: "constraints"
  },
  {
    id: 5, label: "CLARIFY", color: "#A44EF0",
    title: "Ask for Clarifying Questions",
    instruction: "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully.",
    description: "This single line changes everything. Claude will surface your blind spots before doing the work — not after. You'll also get sharper on what you actually want.",
    placeholder: null,
    examples: [],
    tip: "Use 'one at a time' — it forces a deeper dialogue rather than a list of questions you'll skim and partially answer.",
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
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(() => {});
  }
}

function PowerCard({ pm }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding: "20px", background: "#0E0E0E", border: "1px solid #1C1C1C", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "12px", transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#333"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1C1C1C"}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "22px" }}>{pm.icon}</span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#E8E8E8", marginBottom: "2px" }}>{pm.title}</div>
          <div style={{ fontSize: "10px", color: "#555", lineHeight: "1.5" }}>{pm.use}</div>
        </div>
      </div>
      <div style={{ padding: "10px 12px", background: "#131313", borderRadius: "4px", fontSize: "11px", color: "#C8F04E", lineHeight: "1.7", fontStyle: "italic", flex: 1 }}>
        "{pm.prompt}"
      </div>
      <button onClick={() => copyText(pm.prompt, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
        style={{ padding: "7px 12px", background: copied ? "#0D1F0D" : "#1A1A1A", border: `1px solid ${copied ? "#2A4A2A" : "#272727"}`, borderRadius: "3px", color: copied ? "#5A9A5A" : "#444", fontSize: "10px", letterSpacing: "0.08em", textAlign: "center", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.15s" }}>
        {copied ? "✓ Copied" : "Copy prompt"}
      </button>
    </div>
  );
}

export default function PromptGuide() {
  const [view, setView] = useState("template"); // "template" | "assembled" | "power"
  const [step, setStep] = useState(0); // 0-4
  const [fields, setFields] = useState({ role: "", task: "", context: "", constraints: "" });
  const [copied, setCopied] = useState(false);

  const S = TEMPLATE_STEPS[step];

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

  const goNext = () => {
    if (step < 4) { setStep(s => s + 1); }
    else { setView("assembled"); }
  };
  const goBack = () => {
    if (view === "assembled") { setView("template"); setStep(4); }
    else if (step > 0) { setStep(s => s - 1); }
  };

  const btnStyle = (bg, fg, extra = {}) => ({
    padding: "9px 20px", background: bg, border: "none", borderRadius: "4px",
    color: fg, fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em",
    cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "opacity 0.15s", ...extra
  });

  const navActive = (v) => view === v || (v === "template" && view === "assembled" && false);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#0A0A0A", minHeight: "100vh", color: "#E8E8E8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Bebas+Neue&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        textarea { font-family: 'IBM Plex Mono', monospace; }
        button:hover { opacity: 0.82; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0F0F0F", borderBottom: "1px solid #1A1A1A", padding: "18px 28px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "5px", height: "40px", background: "#C8F04E", borderRadius: "2px", flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "26px", letterSpacing: "0.06em", color: "#E8E8E8", lineHeight: 1 }}>Prompt Engineering Template</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {[
            { label: "TEMPLATE", v: "template" },
            { label: "ASSEMBLED", v: "assembled" },
            { label: "POWER MOVES", v: "power" },
          ].map(({ label, v }) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "6px 13px", borderRadius: "3px", fontSize: "9px", letterSpacing: "0.14em", fontWeight: "700", background: view === v ? "#C8F04E" : "#161616", color: view === v ? "#0A0A0A" : "#484848", border: "1px solid #242424", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TEMPLATE VIEW ── */}
      {view === "template" && (
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 290px", height: "calc(100vh - 77px)" }}>

          {/* Sidebar */}
          <div style={{ borderRight: "1px solid #161616", padding: "16px 0", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
            {TEMPLATE_STEPS.map((s, i) => {
              const done = s.field && fields[s.field] && fields[s.field].trim().length > 0;
              const active = step === i;
              return (
                <button key={i} onClick={() => setStep(i)}
                  style={{ padding: "11px 18px", textAlign: "left", borderLeft: active ? `3px solid ${s.color}` : "3px solid transparent", background: active ? "#111" : "transparent", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", border: "none", borderLeft: active ? `3px solid ${s.color}` : "3px solid transparent" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "3px", flexShrink: 0, background: active ? s.color : done ? s.color + "25" : "#161616", border: done && !active ? `1px solid ${s.color}55` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: active ? "#0A0A0A" : done ? s.color : "#2E2E2E" }}>
                    {done && !active ? "✓" : s.id}
                  </div>
                  <div>
                    <div style={{ fontSize: "8px", letterSpacing: "0.16em", color: active ? s.color : "#303030", fontWeight: "700" }}>{s.label}</div>
                    <div style={{ fontSize: "10px", color: active ? "#CCC" : "#404040", marginTop: "1px" }}>{s.title}</div>
                  </div>
                </button>
              );
            })}
            <div style={{ margin: "12px 18px 8px", height: "1px", background: "#161616" }} />
            <div style={{ padding: "0 18px", fontSize: "9px", color: "#262626", lineHeight: "1.6" }}>Fill steps 1–4, then copy the assembled prompt.</div>
          </div>

          {/* Main */}
          <div style={{ padding: "28px 30px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
              <div style={{ padding: "2px 8px", background: S.color + "15", border: `1px solid ${S.color}35`, borderRadius: "3px", fontSize: "8px", letterSpacing: "0.2em", color: S.color, fontWeight: "700" }}>{S.label}</div>
              <div style={{ fontSize: "9px", color: "#303030" }}>Step {S.id} of 5</div>
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: "24px", letterSpacing: "0.06em", color: "#E8E8E8", marginBottom: "10px" }}>{S.title}</h2>
            <div style={{ padding: "9px 13px", background: "#0D0D0D", border: `1px solid ${S.color}28`, borderRadius: "4px", marginBottom: "14px", fontSize: "11px", color: S.color, lineHeight: "1.5" }}>
              {S.instruction}
            </div>
            <p style={{ fontSize: "11px", lineHeight: "1.8", color: "#777", marginBottom: "18px" }}>{S.description}</p>

            {S.field ? (
              <>
                <div style={{ fontSize: "8px", letterSpacing: "0.16em", color: "#383838", marginBottom: "6px", textTransform: "uppercase" }}>Your Input</div>
                <textarea value={fields[S.field]} onChange={e => setFields(f => ({ ...f, [S.field]: e.target.value }))}
                  placeholder={S.placeholder} rows={4}
                  style={{ width: "100%", background: "#0D0D0D", border: "1px solid #202020", borderRadius: "4px", padding: "10px 12px", fontSize: "11px", color: "#E8E8E8", lineHeight: "1.6", outline: "none", resize: "vertical" }} />
              </>
            ) : (
              <div style={{ padding: "14px 16px", background: "#0D0D0D", border: `1px solid ${S.color}28`, borderRadius: "4px" }}>
                <div style={{ fontSize: "9px", color: S.color, fontWeight: "700", marginBottom: "10px", letterSpacing: "0.12em" }}>ADD THIS VERBATIM TO EVERY COMPLEX PROMPT:</div>
                <div style={{ fontSize: "12px", color: "#C0C0C0", lineHeight: "1.7", fontStyle: "italic", padding: "10px 12px", background: "#161616", borderRadius: "3px" }}>
                  "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully."
                </div>
              </div>
            )}

            {S.examples.length > 0 && (
              <div style={{ marginTop: "18px" }}>
                <div style={{ fontSize: "8px", letterSpacing: "0.16em", color: "#303030", marginBottom: "7px", textTransform: "uppercase" }}>Click an example to use it</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {S.examples.map((ex, i) => (
                    <div key={i} onClick={() => S.field && setFields(f => ({ ...f, [S.field]: ex }))}
                      style={{ padding: "7px 11px", background: "#0D0D0D", border: "1px solid #1C1C1C", borderRadius: "4px", fontSize: "10px", color: "#5A5A5A", lineHeight: "1.5", cursor: S.field ? "pointer" : "default", transition: "border-color 0.15s" }}
                      onMouseEnter={e => { if (S.field) e.currentTarget.style.borderColor = "#333"; }}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1C1C1C"}>
                      <span style={{ color: "#2E2E2E" }}>→ </span>{ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "16px", padding: "9px 13px", background: "#0B150B", border: "1px solid #152015", borderRadius: "4px", fontSize: "10px", color: "#4E7A4E", display: "flex", gap: "7px" }}>
              <span style={{ flexShrink: 0 }}>💡</span><span>{S.tip}</span>
            </div>

            <div style={{ display: "flex", gap: "9px", marginTop: "22px" }}>
              {step > 0 && (
                <button onClick={goBack} style={{ padding: "9px 16px", background: "#131313", border: "1px solid #202020", borderRadius: "4px", color: "#666", fontSize: "11px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  ← Back
                </button>
              )}
              <button onClick={goNext} style={{ padding: "9px 22px", background: S.color, border: "none", borderRadius: "4px", color: "#0A0A0A", fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                {step < 4 ? "Next Step →" : "View Assembled Prompt →"}
              </button>
            </div>
          </div>

          {/* Right live preview */}
          <div style={{ borderLeft: "1px solid #161616", padding: "18px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "#383838", marginBottom: "10px", textTransform: "uppercase" }}>Live Preview</div>
            <div style={{ flex: 1, background: "#070707", border: "1px solid #181818", borderRadius: "4px", padding: "12px", fontSize: "9px", lineHeight: "2", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {assembled.split("\n").map((line, i) => {
                let c = "#303030";
                if (line.startsWith("You are")) c = "#C8F04E";
                else if (line.startsWith("Ask me")) c = "#A44EF0";
                else if (line.startsWith("Context:")) c = "#F0A64E";
                else if (line.startsWith("Constraints:")) c = "#F04E8A";
                else if (line.trim()) c = "#A0A0A0";
                return <div key={i} style={{ color: c, minHeight: !line.trim() ? "8px" : "auto" }}>{line || " "}</div>;
              })}
            </div>
            <button onClick={doCopy}
              style={{ marginTop: "9px", padding: "10px", background: copied ? "#0C1A0C" : "#131313", border: `1px solid ${copied ? "#264026" : "#202020"}`, borderRadius: "4px", color: copied ? "#4E8A4E" : "#484848", fontSize: "10px", letterSpacing: "0.08em", fontWeight: "600", textAlign: "center", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s" }}>
              {copied ? "✓  Copied!" : "Copy Full Prompt"}
            </button>
            <button onClick={() => setView("assembled")}
              style={{ marginTop: "6px", padding: "8px", background: "transparent", border: "1px solid #181818", borderRadius: "4px", color: "#303030", fontSize: "9px", textAlign: "center", letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
              Expand View →
            </button>
          </div>
        </div>
      )}

      {/* ── ASSEMBLED VIEW ── */}
      {view === "assembled" && (
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "36px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "22px" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "#383838", marginBottom: "3px", textTransform: "uppercase" }}>Ready to use</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", letterSpacing: "0.06em", color: "#E8E8E8" }}>Your Assembled Prompt</h2>
            </div>
            <div style={{ display: "flex", gap: "7px" }}>
              <button onClick={goBack} style={{ padding: "9px 14px", background: "#131313", border: "1px solid #202020", borderRadius: "4px", color: "#666", fontSize: "10px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Edit</button>
              <button onClick={doCopy} style={{ padding: "9px 18px", background: copied ? "#0C1A0C" : "#C8F04E", border: "none", borderRadius: "4px", color: copied ? "#4E8A4E" : "#0A0A0A", fontSize: "10px", fontWeight: "700", letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s" }}>
                {copied ? "✓  Copied!" : "Copy Prompt"}
              </button>
            </div>
          </div>

          {[
            { label: "ROLE", color: "#C8F04E", text: `You are a top 0.1% expert in ${fields.role || "[FIELD]"}.` },
            { label: "TASK", color: "#4ECAF0", text: fields.task || "[TASK + OUTPUT FORMAT]" },
            { label: "CONTEXT", color: "#F0A64E", text: `Context: ${fields.context || "[YOUR CONTEXT]"}` },
            { label: "CONSTRAINTS", color: "#F04E8A", text: `Constraints: ${fields.constraints || "[YOUR CONSTRAINTS]"}` },
            { label: "CLARIFY", color: "#A44EF0", text: "Ask me clarifying questions one at a time until you are 95% confident you can complete this task successfully." },
          ].map(({ label, color, text }) => (
            <div key={label} style={{ marginBottom: "10px", borderRadius: "5px", overflow: "hidden", border: `1px solid ${color}20` }}>
              <div style={{ padding: "5px 13px", background: color + "14", borderBottom: `1px solid ${color}20` }}>
                <span style={{ fontSize: "8px", letterSpacing: "0.2em", color: color, fontWeight: "700" }}>{label}</span>
              </div>
              <div style={{ padding: "12px 14px", background: "#0C0C0C", fontSize: "12px", color: "#C8C8C8", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{text}</div>
            </div>
          ))}

          <div style={{ marginTop: "22px" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "#2A2A2A", marginBottom: "7px", textTransform: "uppercase" }}>Raw prompt — click to select all, then copy</div>
            <textarea readOnly value={assembled} rows={11} onClick={e => e.target.select()}
              style={{ width: "100%", background: "#070707", border: "1px solid #1A1A1A", borderRadius: "4px", padding: "13px 14px", fontSize: "11px", color: "#7A7A7A", lineHeight: "1.7", outline: "none", cursor: "text", resize: "vertical" }} />
          </div>

          <div style={{ marginTop: "14px", display: "flex", justifyContent: "center" }}>
            <button onClick={doCopy}
              style={{ padding: "12px 44px", background: copied ? "#0C1A0C" : "#C8F04E", border: "none", borderRadius: "4px", color: copied ? "#4E8A4E" : "#0A0A0A", fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s" }}>
              {copied ? "✓  Copied to Clipboard!" : "Copy Full Prompt to Clipboard"}
            </button>
          </div>
        </div>
      )}

      {/* ── POWER MOVES VIEW ── */}
      {view === "power" && (
        <div style={{ padding: "36px 28px", maxWidth: "940px", margin: "0 auto" }}>
          <div style={{ marginBottom: "5px", fontSize: "9px", letterSpacing: "0.2em", color: "#383838", textTransform: "uppercase" }}>Beyond the Template</div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", letterSpacing: "0.06em", color: "#E8E8E8", marginBottom: "5px" }}>Power Moves</h2>
          <p style={{ fontSize: "11px", color: "#4A4A4A", marginBottom: "24px", lineHeight: "1.7" }}>Once you've mastered the 5-part template, these patterns unlock the next tier — using AI as a sparring partner, tutor, and persistent collaborator.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {POWER_MOVES.map((pm, i) => <PowerCard key={i} pm={pm} />)}
          </div>
          <div style={{ marginTop: "24px", padding: "16px 20px", background: "#0B150B", border: "1px solid #152015", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "#4E8A4E", fontWeight: "600", marginBottom: "5px" }}>The Real Shortcut: Put In The Reps</div>
            <p style={{ fontSize: "10px", color: "#324A32", lineHeight: "1.8" }}>Watching tutorials doesn't count. The people who win with AI are using it for hours every day. Use this template, run the power moves, and iterate until they become instinct. There's no other way.</p>
          </div>
        </div>
      )}
    </div>
  );
}
