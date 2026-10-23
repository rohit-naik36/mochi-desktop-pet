// The buddy drawing, shared by the desktop pet and the play room.
const PET_SVG = `<svg viewBox="0 0 120 110" width="120" height="110" aria-label="Mochi">
        <defs>
          <filter id="smoke-outer" x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="4" seed="7" result="n">
              <animate attributeName="baseFrequency" values="0.020;0.026;0.020" dur="9s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="d"/>
            <feGaussianBlur in="d" stdDeviation="5"/>
          </filter>
          <filter id="smoke-mid" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="3" result="n">
              <animate attributeName="baseFrequency" values="0.042;0.05;0.042" dur="6s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="16" result="d"/>
            <feGaussianBlur in="d" stdDeviation="2.2"/>
          </filter>
          <filter id="smoke-wisp" x="-150%" y="-150%" width="400%" height="400%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="11" result="n"/>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="12" result="d"/>
            <feGaussianBlur in="d" stdDeviation="3"/>
          </filter>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop class="core-a" offset="0"/>
            <stop class="core-b" offset=".7"/>
            <stop class="core-c" offset="1"/>
          </radialGradient>
        </defs>
        <g id="float-group">
          <g id="wisps" filter="url(#smoke-wisp)">
            <circle class="wisp" cx="50" cy="30" r="8"/>
            <circle class="wisp w2" cx="68" cy="28" r="7"/>
            <circle class="wisp w3" cx="58" cy="34" r="6"/>
          </g>
          <g id="smoke-body">
            <ellipse class="haze" cx="60" cy="60" rx="46" ry="42" filter="url(#smoke-outer)"/>
            <g filter="url(#smoke-mid)">
              <circle class="mid" cx="60" cy="58" r="33"/>
              <circle class="mid" cx="42" cy="76" r="13"/>
              <circle class="mid" cx="78" cy="77" r="12"/>
            </g>
            <circle cx="60" cy="60" r="28" fill="url(#core)"/>
          </g>
          <g id="specks">
            <circle class="speck" cx="30" cy="48" r="1.4"/>
            <circle class="speck s2" cx="90" cy="54" r="1.2"/>
            <circle class="speck s3" cx="40" cy="86" r="1.1"/>
            <circle class="speck s4" cx="82" cy="84" r="1.4"/>
            <circle class="speck s5" cx="62" cy="28" r="1.1"/>
          </g>
          <g id="body-group">
            <g id="eyes" filter="url(#glow)">
              <g class="eye"><ellipse cx="47" cy="58" rx="6" ry="8"/></g>
              <g class="eye"><ellipse cx="73" cy="58" rx="6" ry="8"/></g>
            </g>
            <g id="eyes-angry" filter="url(#glow)">
              <ellipse cx="47" cy="60" rx="6.5" ry="6"/>
              <ellipse cx="73" cy="60" rx="6.5" ry="6"/>
            </g>
            <g id="brows">
              <path d="M37 50 L57 58 L57 49 Z"/>
              <path d="M83 50 L63 58 L63 49 Z"/>
            </g>
            <g id="eyes-closed" filter="url(#glow)">
              <path d="M41 60 Q47 64 53 60"/>
              <path d="M67 60 Q73 64 79 60"/>
            </g>
            <g id="eyes-happy" filter="url(#glow)">
              <path d="M41 62 Q47 53 53 62"/>
              <path d="M67 62 Q73 53 79 62"/>
            </g>
            <path id="mouth" d="M57 71 Q60 73.5 63 71"/>
            <ellipse id="mouth-open" cx="60" cy="72" rx="3" ry="3.5"/>
          </g>
        </g>
      </svg>`;

for (const host of document.querySelectorAll('[data-pet-svg]')) host.innerHTML = PET_SVG;
