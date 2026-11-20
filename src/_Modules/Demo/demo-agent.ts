// The demo agent on its own (`dist/demo-agent.js`, `npm run build:agent`): for a sandboxed preview that doesn't load
// juel.js (Jollify's report pages, laid out by Logbook), so a demo on the page can still find things and act in it.
// A page that loads juel.js turns the agent on with `juel.demo.agent()` instead; both at once is harmless (the agent
// turns on once per window). Loaded as a classic script, it turns the agent on at once.
import { installDemoAgent } from "./DemoAgent";

installDemoAgent();
