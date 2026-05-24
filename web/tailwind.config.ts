import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Montserrat", "Inter", "sans-serif"],
      },
      colors: {
        brand: {
          bg: colors.slate["950"],
          surface: colors.slate["900"],
          text: colors.slate["50"],
          accent: colors.slate["200"],
          warning: colors.amber["400"],
        },
        mystic: {
          blue: colors.blue["500"],
        },
        valor: {
          red: colors.red["500"],
        },
        instinct: {
          yellow: colors.yellow["400"],
        },
      },
    },
  },
};
