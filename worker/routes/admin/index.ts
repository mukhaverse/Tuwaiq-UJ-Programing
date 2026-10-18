// Everything under /api/admin requires an admin. One file per kind of content.
import { Hono } from "hono";
import { requireAdmin } from "../../auth";
import type { AppEnv } from "../../db/client";
import accessories from "./accessories";
import badges from "./badges";
import members from "./members";
import milestones from "./milestones";
import projects from "./projects";
import settings from "./settings";
import survey from "./survey";
import tracks from "./tracks";
import uploads from "./uploads";

const admin = new Hono<AppEnv>();

// Cross-site writes are refused in worker/index.ts (sameOrigin). Admin answers are never cached.
admin.use("*", requireAdmin, async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});
admin.route("/members", members);
admin.route("/milestones", milestones);
admin.route("/projects", projects);
admin.route("/tracks", tracks);
admin.route("/badges", badges);
admin.route("/accessories", accessories);
admin.route("/settings", settings);
admin.route("/uploads", uploads);
admin.route("/survey", survey);

export default admin;
