// The Loupe toggles: in the Develop status bar, styled as the view toggles
// beside it (Assess, Proof), and in the Library toolbar, styled as its own
// buttons. Each names the shortcuts in its tooltip.

import { LESS_ACTION, MORE_ACTION, PARK_ACTION, TOGGLE_ACTION } from "./ids";
import { React, api } from "./rt";
import { loupeStore } from "./state";

function tooltip(): string {
  const combo = (id: string) => api.keybindings.getBinding(id);
  const toggle = combo(TOGGLE_ACTION);
  const park = combo(PARK_ACTION);
  const more = combo(MORE_ACTION);
  const less = combo(LESS_ACTION);
  const lines = [
    `Magnifier loupe${toggle ? ` (${toggle})` : ""}: a closer look at the photo under the pointer`,
    `Magnification: Alt+wheel${more && less ? `, ${more} and ${less}` : ""}`,
    "Size: Shift+wheel",
    `Park it where it is${park ? ` (${park})` : ""}, then drag its ring to move it`,
  ];
  return lines.join("\n");
}

/** A text button in the status bar's look: muted, primary when on or hovered. */
export function DevelopLoupeButton() {
  const on = loupeStore()((s) => s.on);
  const toggle = loupeStore()((s) => s.toggle);
  const [hover, setHover] = React.useState(false);
  const { tokens } = api.ui;
  const title = tooltip();
  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      aria-label="Toggle magnifier loupe"
      aria-pressed={on}
      style={{ fontSize: 10, color: on || hover ? tokens.textPrimary : tokens.textMuted }}
    >
      Loupe
    </button>
  );
}

/** A button in the Library toolbar's own look (its action buttons), lit while on. */
export function LibraryLoupeButton() {
  const on = loupeStore()((s) => s.on);
  const toggle = loupeStore()((s) => s.toggle);
  const { tokens } = api.ui;
  const title = tooltip();
  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label="Toggle magnifier loupe"
      aria-pressed={on}
      className="sl-library-toolbar-action"
      style={on ? { background: tokens.surface4, color: tokens.textPrimary } : undefined}
    >
      Loupe
    </button>
  );
}
