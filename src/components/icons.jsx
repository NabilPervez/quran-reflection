// Line icons shared by the v2 screens (stroke = currentColor)
const S = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IcPlay = () => <S><path d="M7 5l12 7-12 7z" /></S>;
export const IcPause = () => <S><path d="M8 5v14M16 5v14" /></S>;
export const IcStop = () => <S><rect x="6" y="6" width="12" height="12" rx="2" /></S>;
export const IcSpeak = () => <S><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></S>;
export const IcRepeat = () => <S><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></S>;
export const IcHeart = () => <S><path d="M12 20s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5C19 15.5 12 20 12 20z" /></S>;
export const IcBook = () => <S><path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-4" /></S>;
export const IcPen = () => <S><path d="M4 20h4L19 9l-4-4L4 16z" /></S>;
export const IcLoad = () => <S><path d="M12 3a9 9 0 1 0 9 9" /></S>;
export const IcMinus = () => <S><path d="M5 12h14" /></S>;
export const IcPlus = () => <S><path d="M12 5v14M5 12h14" /></S>;
export const IcCopy = () => <S size={18}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></S>;
export const IcBack = () => <S><path d="M15 18l-6-6 6-6" /></S>;
export const IcGear = () => (
  <S>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </S>
);

export const GearButton = ({ onClick }) => (
  <button type="button" className="v2-icon-btn" id="settings-btn" onClick={onClick} aria-label="Settings" title="Settings"><IcGear /></button>
);
