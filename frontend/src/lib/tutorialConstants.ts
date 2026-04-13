/**
 * Tutorial overlay constants.
 * Centralized z-index tiers, storage keys, timings, dimensions, and user-facing labels
 * for the DIY tutorial system. Zero tolerance for magic numbers/strings.
 */


// --- Z-index tiers ---

/** Tutorial overlay z-index. Must sit above ChatInterface overlay (70). */
export const TUTORIAL_OVERLAY_Z_INDEX = 80;


// --- Storage keys ---

/** LocalStorage key prefix for per-tutorial completion flags. */
export const TUTORIAL_STORAGE_KEY_PREFIX = "thinkbridge_tutorial_";

/** Version suffix appended to storage keys (bump when tutorial steps change materially). */
export const TUTORIAL_STORAGE_KEY_VERSION = "_v1";

/** Global escape hatch — if set to "true", all tutorials are suppressed (demo day). */
export const TUTORIAL_DISABLED_STORAGE_KEY = "thinkbridge_tutorial_disabled";


// --- Spotlight + tooltip defaults ---

/** Extra padding (px) around the target element's bounding rect for the spotlight cutout. */
export const TUTORIAL_SPOTLIGHT_PADDING_PX = 8;

/** Gap (px) between the spotlight edge and the tooltip card. */
export const TUTORIAL_TOOLTIP_OFFSET_PX = 12;

/** Maximum width (px) for the tooltip card to keep line lengths readable. */
export const TUTORIAL_TOOLTIP_MAX_WIDTH_PX = 360;

/** Backdrop opacity for the dimmed background outside the spotlight. */
export const TUTORIAL_BACKDROP_OPACITY = 0.55;

/** Spotlight rect transition duration (ms). Disabled when prefers-reduced-motion. */
export const TUTORIAL_TRANSITION_MS = 300;


// --- waitFor polling ---

/** Polling interval (ms) for waitForTarget — how often to re-check the DOM. */
export const TUTORIAL_WAIT_POLL_INTERVAL_MS = 100;

/** Default timeout (ms) for waitForTarget when a step doesn't override it. */
export const TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS = 5000;


// --- Layout & timing ---

/** Viewport width breakpoint (px) below which we fall back to centered tooltip. */
export const TUTORIAL_MOBILE_BREAKPOINT_PX = 768;

/** Delay (ms) after scrollIntoView before measuring the target rect. */
export const TUTORIAL_SCROLL_STABILIZE_MS = 150;

/** Delay (ms) before restoring focus after tutorial closes. */
export const TUTORIAL_FOCUS_RESTORE_MS = 50;


// --- Viewport edge clamping ---

/** Minimum margin (px) between tooltip and any viewport edge — prevents flush-against-edge appearance. */
export const TUTORIAL_VIEWPORT_MARGIN_PX = 12;

/** Minimum free space (px) required on preferred placement side before we auto-flip to opposite. */
export const TUTORIAL_FLIP_MIN_SPACE_PX = 40;

/** Tooltip dimension estimate (px) used for the first paint before real measurement arrives. */
export const TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT_PX = 200;
export const TUTORIAL_TOOLTIP_ESTIMATED_WIDTH_PX = 360;


// --- Button labels (Korean user-facing) ---

export const TUTORIAL_BTN_NEXT = "다음";
export const TUTORIAL_BTN_PREV = "이전";
export const TUTORIAL_BTN_SKIP = "건너뛰기";
export const TUTORIAL_BTN_FINISH = "완료";
export const TUTORIAL_BTN_CLOSE_ARIA = "튜토리얼 닫기";
