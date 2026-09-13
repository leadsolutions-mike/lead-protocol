import { lstatSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { getTemplatesDir } from "../lib/project.js";
import { ensureGitignoreEntries, generateGuidelines, preflightScaffold } from "../lib/scaffold.js";
import { planUpdate, applyUpdate } from "../lib/updater.js";
import * as ui from "../lib/ui.js";

function isLeadProtocolInstalled(targetDir: string): boolean {
  return lstatSync(path.join(targetDir, ".agents"), { throwIfNoEntry: false }) !== undefined;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize Lead Protocol in the current directory")
    .option("-y, --yes", "skip confirmation prompt")
    .option("--force", "explicitly overwrite project seeds; preserve actor local state")
    .action(async (opts: { yes?: boolean; force?: boolean }) => {
      const targetDir = process.cwd();
      const templatesDir = getTemplatesDir();

      console.log();
      console.log(ui.heading("Lead Protocol — Init"));
      console.log();

      if (isLeadProtocolInstalled(targetDir) && !opts.force) {
        ui.error("An .agents entry already exists. Use update to preserve project state, or init --force to overwrite project seeds.");
        process.exitCode = 1;
        return;
      }
      if (opts.force) {
        ui.warn(
          "Force init is an overlay and may overwrite these bundled project files: " +
          ".agents/PROJECT_RULES.md, .agents/AGENTS_MAP.md, .agents/JOURNAL.md, " +
          ".agents/LESSONS.md, .agents/decisions.jsonl, " +
          ".agents/sessions/active_sessions.md, .agents/checkpoints/.gitkeep. " +
          "Actor local state, custom checkpoints and orphan files are preserved.",
        );
      }
      if (!opts.yes) {
        const proceed = await confirm({
          message: opts.force ? "Overwrite bundled framework and project seeds?" : "Initialize Lead Protocol in this directory?",
          default: !opts.force,
        });
        if (!proceed) { ui.info("Aborted."); return; }
      }

      const agentsDir = path.join(targetDir, ".agents");
      const templateAgentsDir = path.join(templatesDir, ".agents");
      const plan = planUpdate(templateAgentsDir, agentsDir, true);
      preflightScaffold(templatesDir, targetDir);
      applyUpdate(templateAgentsDir, agentsDir, plan);
      ui.success(".agents/ created");

      generateGuidelines(templatesDir, targetDir);

      ensureGitignoreEntries(targetDir);

      console.log();
      ui.success("Lead Protocol initialized");
      console.log();
      console.log(ui.dim("  Next steps:"));
      console.log(
        ui.dim("  1. Edit .agents/PROJECT_RULES.md — set your project identity"),
      );
      console.log(
        ui.dim("  2. Edit .agents/AGENTS_MAP.md — map your agent signatures"),
      );
      console.log(
        ui.dim("  3. Run `lead-protocol validate` to verify the setup"),
      );
      console.log();
    });
}
