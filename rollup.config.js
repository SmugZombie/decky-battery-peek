import deckyPlugin from "@decky/rollup";

export default deckyPlugin({
  // One file under dist/ avoids extra dynamic chunk fetches from 127.0.0.1 (seen as Failed to fetch).
  output: {
    inlineDynamicImports: true,
  },
});
