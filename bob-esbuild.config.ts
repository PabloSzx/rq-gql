export const config: import("bob-esbuild").BobConfig = {
  tsc: {
    dirs: ["packages/*"],
  },
  distDir: "dist",
  verbose: true,
  keepDynamicImport: true,
};
