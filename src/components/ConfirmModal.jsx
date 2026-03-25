import { ghostBtnStyle, primaryBtnStyle } from "../lib/styles";

export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(26,28,26,0.48)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9000, padding: 20,
      animation: "fadeIn 0.25s ease",
    }}>
      <div style={{
        background: "var(--surface-lowest)",
        borderRadius: 20, padding: 32, maxWidth: 360, width: "100%",
        boxShadow: "0 40px 80px rgba(26,28,26,0.06)",
      }}>
        <p style={{
          color: "var(--on-surface)", fontFamily: "'Inter', sans-serif",
          lineHeight: 1.7, margin: "0 0 24px", fontSize: 15, fontWeight: 400,
        }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button id="modal-cancel" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
          <button id="modal-confirm" onClick={onConfirm} style={{
            ...primaryBtnStyle,
            background: danger ? "linear-gradient(135deg,#991b1b,#b91c1c)" : primaryBtnStyle.background,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
