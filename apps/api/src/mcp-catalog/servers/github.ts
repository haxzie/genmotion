import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand } from "../icons";

export default defineMcpCatalogEntry({
  id: "github",
  name: "GitHub",
  description: "Repositories, pull requests and releases — the raw material for a PR walkthrough or launch video.",
  category: "Content sources",
  iconUrl: brand("github", "FFFFFF"),
  homepage: "https://github.com/github/github-mcp-server",
  transport: "http",
  url: "https://api.githubcopilot.com/mcp",
  // GitHub's authorization server registers no clients on the fly and takes
  // no URL client ids — OAuth here needs a GitHub App of GenMotion's own.
  // A personal access token works today, so that is what the card asks for.
  auth: {
    kind: "header",
    headerName: "Authorization",
    prefix: "Bearer ",
    hint: "A fine-grained or classic personal access token with repo access.",
    tokenUrl: "https://github.com/settings/tokens/new?description=GenMotion&scopes=repo,read:org,read:user",
  },
  tags: ["code", "releases"],
});
