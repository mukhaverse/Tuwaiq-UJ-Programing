// Everything under /api/admin requires an admin. One file per kind of content.
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { requireRole } from "../../auth";
import type { AppEnv } from "../../db/client";
import badges from "./badges";
import members from "./members";
import milestones from "./milestones";
import projects from "./projects";
import settings from "./settings";
import survey from "./survey";
import tracks from "./tracks";
import uploads from "./uploads";

const admin = new Hono<AppEnv>();

// Reject form posts from other sites (on top of the login cookie being SameSite=Lax).
admin.use("*", csrf());
admin.use("*", requireRole("admin"));
admin.route("/members", members);
admin.route("/milestones", milestones);
admin.route("/projects", projects);
admin.route("/tracks", tracks);
admin.route("/badges", badges);
admin.route("/settings", settings);
admin.route("/uploads", uploads);
admin.route("/survey", survey);

export default admin;
