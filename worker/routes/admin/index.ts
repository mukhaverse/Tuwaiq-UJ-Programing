// Everything under /api/admin requires an admin. One file per kind of content.
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { requireRole } from "../../auth";
import type { AppEnv } from "../../db/client";
import badges from "./badges";
import members from "./members";
import milestones from "./milestones";
import settings from "./settings";
import uploads from "./uploads";

const admin = new Hono<AppEnv>();

// Reject form posts from other sites (on top of the login cookie being SameSite=Lax).
admin.use("*", csrf());
admin.use("*", requireRole("admin"));
admin.route("/members", members);
admin.route("/milestones", milestones);
admin.route("/badges", badges);
admin.route("/settings", settings);
admin.route("/uploads", uploads);

export default admin;
