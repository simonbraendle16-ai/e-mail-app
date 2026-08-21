import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";

/* Ab Next.js 16 liefert eslint-config-next fertige Flat-Config-Bausteine.
   Der frühere Umweg über FlatCompat entfällt. */
const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  {
    // next-env.d.ts wird von Next.js erzeugt und nicht von uns gepflegt.
    ignores: [".next/**", "node_modules/**", ".open-next/**", "next-env.d.ts"],
  },
  {
    rules: {
      /* Ein Unterstrich vorne heisst: bewusst weggeworfen. Kommt beim
         Auseinandernehmen von Objekten vor, wenn Felder gerade NICHT
         mitwandern sollen — etwa die Geheimtexte in lib/db/kunden.ts. */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
