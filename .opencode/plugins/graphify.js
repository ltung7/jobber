// graphify OpenCode plugin (V2)
// Injects a knowledge-graph reminder before the first shell command when the graph exists.
import { existsSync } from "node:fs";
import { join } from "node:path";

const REMINDER =
  'echo "[graphify] Knowledge graph at .graphify/. For focused questions run: graphify query \\"<question>\\" (scoped subgraph, usually much smaller than GRAPH_REPORT.md). Read GRAPH_REPORT.md only for broad architecture context." && ';

export default {
  id: "graphify",
  async setup(ctx) {
    const directory = ctx.location?.directory;
    if (!directory) return;
    if (!existsSync(join(directory, ".graphify", "graph.json"))) return;

    const hook = ctx.tool?.hook?.bind(ctx.tool);
    if (!hook) return;

    let reminded = false;
    try {
      await hook("execute.before", (event) => {
        if (reminded) return;
        if (!event || (event.tool !== "bash" && event.tool !== "shell")) return;
        if (!event.input || typeof event.input.command !== "string") return;
        event.input.command = REMINDER + event.input.command;
        reminded = true;
      });
    } catch (err) {
      // Never let the reminder break tool execution.
      console.warn("[graphify] failed to register tool hook:", err);
    }
  },
};
