import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        brand: {
          bg: colors.slate["900"],
          surface: colors.slate["800"],
          text: colors.slate["50"],
          accent: colors.sky["400"],
          warning: colors.amber["400"],
        },
      },
    },
  },
};
