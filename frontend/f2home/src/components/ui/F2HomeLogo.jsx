import React from "react";

/**
 * F2Home brand logo (vector recreation of the official F2Home artwork):
 * gold sun arc, green house with a 4-pane window and leaf,
 * "f2home" wordmark and the "FROM FARM TO HOME" tagline.
 *
 * Props:
 *  - className: sizing classes (control width; height follows the ratio)
 *  - showTagline: set false to render mark + wordmark only
 */
export default function F2HomeLogo({ className = "", showTagline = true }) {
  return (
    <svg
      viewBox={showTagline ? "0 0 360 300" : "0 0 360 245"}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="F2Home - From Farm to Home"
    >
      {/* Sun arc */}
      <path
        d="M 62 138 A 122 122 0 0 1 298 126"
        fill="none"
        stroke="#f5b301"
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* House roof */}
      <path
        d="M 78 158 L 180 74 L 282 158"
        fill="none"
        stroke="#2e7d32"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Leaf on the right roof slope */}
      <path
        d="M 262 118 C 286 104 306 104 318 112 C 314 132 296 146 272 142 C 264 140 260 132 262 118 Z"
        fill="#43a047"
      />
      <path
        d="M 268 138 C 280 128 296 120 312 116"
        fill="none"
        stroke="#2e7d32"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Window: 2x2 panes */}
      <rect x="162" y="128" width="17" height="17" rx="2" fill="#2e7d32" />
      <rect x="181" y="128" width="17" height="17" rx="2" fill="#2e7d32" />
      <rect x="162" y="147" width="17" height="17" rx="2" fill="#2e7d32" />
      <rect x="181" y="147" width="17" height="17" rx="2" fill="#2e7d32" />

      {/* Wordmark */}
      <text
        x="180"
        y="238"
        textAnchor="middle"
        fontFamily="'Poppins', 'Segoe UI', Arial, sans-serif"
        fontSize="78"
        fontWeight="800"
      >
        <tspan fill="#2e7d32">f2</tspan>
        <tspan fill="#37474f">home</tspan>
      </text>

      {showTagline && (
        <g>
          {/* Tagline rules */}
          <line x1="38" y1="268" x2="86" y2="268" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
          <line x1="274" y1="268" x2="322" y2="268" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
          {/* Tagline text */}
          <text
            x="180"
            y="274"
            textAnchor="middle"
            fontFamily="'Poppins', 'Segoe UI', Arial, sans-serif"
            fontSize="19"
            fontWeight="600"
            letterSpacing="4"
            fill="#2e7d32"
          >
            FROM FARM TO HOME
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Compact mark-only variant (sun arc + house + leaf) for tight spaces
 * such as the collapsed sidebar or a square avatar slot.
 */
export function F2HomeMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="F2Home"
    >
      <path
        d="M 30 118 A 74 74 0 0 1 172 112"
        fill="none"
        stroke="#f5b301"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 36 130 L 100 76 L 164 130"
        fill="none"
        stroke="#2e7d32"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 148 102 C 168 90 184 90 194 97 C 191 114 176 126 156 122 C 149 120 146 114 148 102 Z"
        fill="#43a047"
      />
      <rect x="86" y="104" width="13" height="13" rx="2" fill="#2e7d32" />
      <rect x="101" y="104" width="13" height="13" rx="2" fill="#2e7d32" />
      <rect x="86" y="119" width="13" height="13" rx="2" fill="#2e7d32" />
      <rect x="101" y="119" width="13" height="13" rx="2" fill="#2e7d32" />
    </svg>
  );
}
