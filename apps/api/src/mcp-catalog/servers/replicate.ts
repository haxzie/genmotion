import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

/**
 * Replicate's app icon — the gradient tile, not Simple Icons' flat glyph.
 *
 * Inlined rather than linked because it is the one mark in the catalog that
 * neither Simple Icons (monochrome only) nor a favicon lookup reliably gives
 * us in its filled form. 1.9 kB of base64 on a response that is already a few
 * dozen kB, and one less third party between a card and its icon.
 */
const REPLICATE_ICON =
  "data:image/webp;base64,UklGRpIFAABXRUJQVlA4IIYFAABQJACdASqAAIAAPjkaiEMiIiEZe13YIAOEsjXtqNjUf6B+QHUefQ8/+KXRI8b+Ef3Q6ZM6ncp/H/Iz+V/Db+8+1nOY/pr/vf7x7wX+k/wHSAdc96GH7K+lv+1XxLeUBG5x9T8f1To55VoY2fD5y3+C2CJi8zzArhKvkzt3sB75IcW1nhyTsRNuO7Jji1yB1CxeM1QXYi20sByVBjZvZID78td0dJAoxvlrz9v7zRDxNa7CPmEL2qQVcKU3WDKSTN7VqD2S/67jyvqD0bndlV3F5mw0BqQiuFewvtz/DtMItf2/xDTf1XU62c9bYdw9tY/6OMm04P5xB7cp+ky+HsvV5WnCSvlXJsEmFlBBdSDSo1H1ahcrkVvXiYk+9MLEUV14vgMS6DoEMoiCYAD+9W6Oj0ZK6/SJTKf9W0fTv3il4YCkoRn1Gta3mXRfyMRuVDI7/Ugi8YBE4uLNdFnn5vzGy0ZVLp1WZk0XkHHWp6c+NHRe5XPqw5NtfjPr1G//NgyaxRlIKwz83QKnSKnhglwj6i7etGECR0eqANR2kBVFjgfgXoesXGIdBcYJn/vfNqaUetNEdi5u/UQbx9oBjUKYuyVVSeh1cQzySAfA92msSF+fuIF8BsTDhT3ICz78tCOTS5/vZ4+1SNLxlEuNIZYe+QOfC1XCh44JD90RkFe6CgcYk6hHp+NxfVOH4/n+33/1GlL2X0df9Q/SdD+eqhaaomRPvXJnX/uv5xrKsvEO5q3tWGfw77WUFiFoSxi7u6OY1cCDVtvpRaJ/dm83y/jzjQn92y/Adsz2EbL8r3B9XNedu4y14qYnTcK3nSQ038TEXyP6wO/+bsftrvHVlffX0rD6mqgCTsz8azqwyM3jsZn1Q4J1VYrR4RXZYbJD2IUXBrxQlphc9cRJ/u2BGSDP6sV0Zrzihe3a8IY+O8PJg1NFstRqHCxv67PT1dOxdlLdeNDvwyEzpWkwvSGPzvG6w/YOLdRwdLnESe+tDeOQrrt8w/cDJ1OxCRzi9kuBSYC8330dZf4rd/vypNl/1gf/8Pgal9h45usEn36cb9wPhfZPOS912YUArH+Eq8Tq6sG4LVvGHTM/bN/hpJ2hr2IU4BVeeFfbm57AkV51C4Ch4nusRWc47oV7BDbMd84MwTdxUz28ouErH0u0bAxR1SXn3goi2LQwPe9AQ6Vmliq4Au4dhP9Bvvx9yf8Icf4ecd3FdRKxHXfHCJVw+vzo6MZAb3TqUS7T+MKG5vkqF3iMu2VEjIjRxEzNqrLb4mXNyNV8gdqRLDhkgTwokqtDQaxqaZ/tpasQnbG/FCx66i9TL6xP/Av8vQmZ8qb0So77/xVL0u240s1Xnacz8qThryIk/gsaJgZlwdU9g1DqrAGHipr2rRNq5bKJrC44RWoZIp1YHedxFdimKQiox3xeykNJv2jlzC7uQoSNNVKbRplcX0/Hgrlm04oUAOYAwToI5sgRqCGA/hIMw7SpNQ8MCT1p+ebTfbgSTqrWjPFWDC+FnMIt3+GVhIMuy6PTOvryi5SdTaGskEo26D/cqMkMOg1CTmpKu2vyA83ZJ9hxcVn+KKnwOYpo2B7VlXWzYGhs/xgP/7KxrmRA2N6t4W+vJ6iCLhxsXvVHpkXr2rdegKM5fl5e3R/SIlQhQ+IDYynYDNPNZB11/9jNCQatjw5QjAO4IUba5QMc+8sqm/n6HFFMAhiyuax5QoYGoPO5VgJzpJbDTYItIbZHJmkLt3HCZ52kED5CPKB5zm4zU4V8z9TeyCb0kJZ30nFN0ExHzX0KuYfg04AnD51SHgS6fnbnuWsbXHFPMH3ExF5OvrTn3U5S8iTEoDOPxTxrAah4nbOhq3oesYAq9iv/+2ZVUYQgkzp1we97TAAA";

export default defineMcpCatalogEntry({
  id: "replicate",
  name: "Replicate",
  description: "Thousands of open image, video, audio and upscaling models behind one API.",
  category: "Generative media",
  iconUrl: REPLICATE_ICON,
  homepage: "https://replicate.com/docs/reference/mcp",
  transport: "http",
  url: "https://mcp.replicate.com/sse",
  auth: { kind: "oauth" },
  tags: ["image", "video", "audio"],
});
