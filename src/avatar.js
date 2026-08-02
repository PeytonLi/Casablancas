const STATES = new Set(["idle", "listening", "speaking", "singing"]);

let avatar;
let state = "idle";

export function initAvatar(el) {
  if (!el?.classList) throw new TypeError("initAvatar requires a DOM element");

  if (!document.getElementById("casablancas-avatar-styles")) {
    const styles = document.createElement("style");
    styles.id = "casablancas-avatar-styles";
    styles.textContent = `
      [data-casablancas-avatar] {
        --avatar-accent: #ff5b35;
        --avatar-glow: #ffd447;
        position: relative;
        display: grid;
        place-items: center;
        width: min(42vw, 12rem);
        aspect-ratio: 1;
        isolation: isolate;
      }

      .avatar__orbit,
      .avatar__face {
        position: absolute;
        border-radius: 50%;
      }

      .avatar__orbit {
        inset: 4%;
        border: .18rem solid color-mix(in srgb, var(--avatar-accent), transparent 45%);
        box-shadow: 0 0 1.8rem color-mix(in srgb, var(--avatar-accent), transparent 50%);
      }

      .avatar__orbit::before,
      .avatar__orbit::after {
        content: "";
        position: absolute;
        border-radius: 50%;
        background: var(--avatar-glow);
        box-shadow: 0 0 .8rem var(--avatar-glow);
      }

      .avatar__orbit::before { width: 12%; aspect-ratio: 1; top: 4%; left: 15%; }
      .avatar__orbit::after { width: 7%; aspect-ratio: 1; right: 5%; bottom: 18%; }

      .avatar__face {
        inset: 18%;
        display: grid;
        grid-template: 1fr 1fr / 1fr 1fr;
        place-items: end center;
        overflow: hidden;
        background:
          linear-gradient(145deg, transparent 48%, rgb(255 255 255 / .12) 49% 52%, transparent 53%),
          radial-gradient(circle at 32% 25%, #fff2c7, var(--avatar-glow) 25%, var(--avatar-accent) 70%);
        border: .18rem solid rgb(255 255 255 / .8);
        box-shadow: inset -.8rem -1rem 1.5rem rgb(35 8 42 / .32), 0 .8rem 2rem rgb(35 8 42 / .3);
      }

      .avatar__eye {
        width: 24%;
        aspect-ratio: 1;
        margin-bottom: 20%;
        border-radius: 50%;
        background: #25122e;
        box-shadow: inset .12rem .12rem 0 rgb(255 255 255 / .7);
        transform-origin: center;
      }

      .avatar__mouth {
        grid-column: 1 / -1;
        align-self: start;
        width: 32%;
        height: 8%;
        margin-top: 12%;
        border-radius: 999px;
        background: #25122e;
        transform-origin: center;
      }

      .avatar--idle .avatar__face { animation: avatar-float 3.2s ease-in-out infinite; }
      .avatar--idle .avatar__eye { animation: avatar-blink 4.5s step-end infinite; }

      .avatar--listening { --avatar-accent: #12cfc4; --avatar-glow: #b9fff8; }
      .avatar--listening .avatar__orbit { animation: avatar-listen 1.15s ease-out infinite; }
      .avatar--listening .avatar__face { transform: scale(1.04); }

      .avatar--speaking .avatar__mouth { animation: avatar-talk .28s ease-in-out infinite alternate; }
      .avatar--speaking .avatar__orbit { animation: avatar-pulse .7s ease-in-out infinite alternate; }

      .avatar--singing { --avatar-accent: #ef4b9c; --avatar-glow: #ffdf57; }
      .avatar--singing .avatar__orbit { animation: avatar-spin 2.8s linear infinite; }
      .avatar--singing .avatar__face { animation: avatar-dance .65s ease-in-out infinite alternate; }
      .avatar--singing .avatar__mouth { animation: avatar-sing .5s ease-in-out infinite alternate; }

      @keyframes avatar-float { 50% { transform: translateY(-4%); } }
      @keyframes avatar-blink { 0%, 46%, 50%, 100% { scale: 1 1; } 48% { scale: 1 .08; } }
      @keyframes avatar-listen { 70%, 100% { scale: 1.18; opacity: 0; } }
      @keyframes avatar-pulse { to { scale: 1.07; filter: brightness(1.2); } }
      @keyframes avatar-talk { to { height: 24%; width: 25%; border-radius: 50%; } }
      @keyframes avatar-spin { to { rotate: 360deg; } }
      @keyframes avatar-dance { to { transform: translateY(-5%) rotate(4deg); } }
      @keyframes avatar-sing { to { height: 28%; width: 30%; border-radius: 50% 50% 45% 45%; } }

      @media (prefers-reduced-motion: reduce) {
        [data-casablancas-avatar] * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
      }
    `;
    document.head.append(styles);
  }

  avatar = el;
  avatar.dataset.casablancasAvatar = "";
  avatar.setAttribute("role", "img");

  const orbit = document.createElement("span");
  orbit.className = "avatar__orbit";
  const face = document.createElement("span");
  face.className = "avatar__face";

  for (let i = 0; i < 2; i += 1) {
    const eye = document.createElement("span");
    eye.className = "avatar__eye";
    face.append(eye);
  }

  const mouth = document.createElement("span");
  mouth.className = "avatar__mouth";
  face.append(mouth);
  avatar.replaceChildren(orbit, face);
  setState(state);
}

export function setState(nextState) {
  if (!STATES.has(nextState)) throw new RangeError(`Unknown avatar state: ${nextState}`);

  state = nextState;
  if (!avatar) return;

  avatar.classList.remove(...[...STATES].map((name) => `avatar--${name}`));
  avatar.classList.add(`avatar--${state}`);
  avatar.dataset.state = state;
  avatar.setAttribute("aria-label", `Abstract festival guide avatar: ${state}`);
}
