// Importing the survey spreadsheet, linking answers to roster members, exporting
// a clean copy, and clearing responses.
import { useState } from "react";
import { api } from "../api";
import { useAction, useToast } from "../hooks";
import { Button, ConfirmButton } from "../ui";
import { checkSheet, matchMember, toCsv, toImportRows } from "./model";
import { readSheet } from "./sheet";
import { Card, Txt } from "./charts";
import { personHref } from "./format";

export default function DataPanel({ responses, people, members, reload }) {
  const [preview, setPreview] = useState(null);
  const [busy, run] = useAction();
  const toast = useToast();

  const pickFile = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      // Read before clearing the input: clearing it can invalidate the file.
      const read = readSheet(file);
      const { headers, rows } = await read.finally(() => (input.value = ""));
      const problem = checkSheet(headers);
      if (problem) return toast(problem, "error");
      // Keep links already made (by hand or earlier imports); guess the rest from names.
      const known = new Map(responses.filter((r) => r.memberId).map((r) => [r.respondent, r.memberId]));
      const importRows = toImportRows(rows, (respondent, name) => known.get(respondent) ?? matchMember(name, members));
      const stored = new Set(responses.map((r) => `${r.respondent}|${r.submittedAt}`));
      const fresh = importRows.filter((r) => !stored.has(`${r.respondent}|${r.submittedAt}`));
      const byPerson = new Map(importRows.map((r) => [r.respondent, r]));
      setPreview({
        file: file.name,
        rows: importRows,
        fresh: fresh.length,
        people: byPerson.size,
        linked: [...byPerson.values()].filter((r) => r.memberId).length,
        unlinked: [...byPerson.values()].filter((r) => !r.memberId).map((r) => r.name),
      });
    } catch (err) {
      toast(err.message || "Couldn't read that file", "error");
    }
  };

  const doImport = () =>
    run(() => api("/admin/survey/import", { method: "POST", body: { rows: preview.rows } })).then((res) => {
      if (!res) return;
      toast(`Imported ${res.added} new ${res.added === 1 ? "response" : "responses"}${res.skipped ? `, ${res.skipped} already here` : ""}`);
      setPreview(null);
      reload();
    });

  const link = (p, memberId) =>
    run(() => api("/admin/survey/link", { method: "PUT", body: { respondent: p.key, memberId: memberId || null } }), memberId ? "Linked" : "Unlinked").then(
      (ok) => ok && reload()
    );

  const removePerson = (p) =>
    run(() => api("/admin/survey/respondent", { method: "DELETE", body: { respondent: p.key } }), "Response removed").then((ok) => ok && reload());

  const removeAll = () => run(() => api("/admin/survey", { method: "DELETE" }), "All responses removed").then((ok) => ok && reload());

  const exportCsv = () => {
    const blob = new Blob([toCsv(people)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `survey-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Members linked to more than one response: probably a wrong link.
  const linkCounts = new Map();
  for (const p of people) if (p.memberId) linkCounts.set(p.memberId, (linkCounts.get(p.memberId) ?? 0) + 1);
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const unlinkedFirst = [...people].sort((a, b) => Number(!!a.memberId) - Number(!!b.memberId));

  return (
    <div className="srv-grid">
      <Card title="Import responses" wide>
        <p className="adm-muted">
          Upload the survey's spreadsheet export (.xlsx or .csv). You can upload a newer export of the same survey any time: only new responses are added, and
          links you've made stay as they are. The file is read in your browser and only the answers are saved.
        </p>
        <label className={`adm-btn adm-btn--primary adm-upload${busy ? " is-busy" : ""}`}>
          Choose a spreadsheet
          <input id="survey-upload" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={pickFile} disabled={busy} />
        </label>
        {preview && (
          <div className="srv-preview">
            <p>
              <strong>{preview.file}</strong>: {preview.rows.length} responses from {preview.people} people. <strong>{preview.fresh}</strong>{" "}
              {preview.fresh === 1 ? "is" : "are"} new.
            </p>
            <p className="adm-muted adm-small">
              {preview.linked} of {preview.people} people matched to a roster member automatically.
              {preview.unlinked.length > 0 && <> Not matched: {preview.unlinked.join(", ")}. You can link them below after importing.</>}
            </p>
            <div className="adm-actions">
              <Button variant="primary" onClick={doImport} disabled={busy || !preview.fresh}>
                {busy ? "Importing…" : preview.fresh ? `Import ${preview.fresh} new` : "Nothing new to import"}
              </Button>
              <Button onClick={() => setPreview(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {people.length > 0 && (
        <Card
          title="Linking answers to members"
          wide
          note="Each response is matched to a roster member by name (Arabic or English spelling). Check the matches, and fix any that are wrong or missing. A link is what connects a member to their survey profile."
        >
          <table className="srv-table srv-links">
            <thead>
              <tr>
                <th scope="col">Name in the survey</th>
                <th scope="col">Roster member</th>
                <th scope="col">
                  <span className="srv-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {unlinkedFirst.map((p) => (
                <tr key={p.key} className={!p.memberId ? "is-unlinked" : undefined}>
                  <td>
                    <a className="adm-link" href={personHref(p)}>
                      <Txt>{p.name}</Txt>
                    </a>
                    {p.submissions > 1 && <span className="adm-muted adm-small"> · {p.submissions} submissions</span>}
                  </td>
                  <td>
                    <select
                      id={`link-${p.key}`}
                      aria-label={`Roster member for ${p.name}`}
                      value={p.memberId ?? ""}
                      onChange={(e) => link(p, e.target.value)}
                      disabled={busy}
                      lang={p.memberId ? "ar" : undefined}
                    >
                      <option value="">— Not linked —</option>
                      {sortedMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    {p.memberId && linkCounts.get(p.memberId) > 1 && (
                      <span className="adm-error adm-small">Also linked to another response; one of them is probably wrong.</span>
                    )}
                  </td>
                  <td>
                    <ConfirmButton onConfirm={() => removePerson(p)} disabled={busy}>
                      Remove
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {people.length > 0 && (
        <Card title="Export">
          <p className="adm-muted adm-small">
            A cleaned spreadsheet: one row per person (their latest answers), with majors tidied up and each skill as a 0–3 level plus the overall score. Opens in
            Excel with Arabic intact. It contains members' answers, so keep it private.
          </p>
          <div className="adm-actions">
            <Button onClick={exportCsv}>Download CSV</Button>
          </div>
        </Card>
      )}

      {responses.length > 0 && (
        <Card title="Start over">
          <p className="adm-muted adm-small">
            Removes all {responses.length} stored submissions. Use it before importing a different survey. This can't be undone, but you can import the
            spreadsheet again.
          </p>
          <div className="adm-actions">
            <ConfirmButton onConfirm={removeAll} disabled={busy}>
              Remove all responses
            </ConfirmButton>
          </div>
        </Card>
      )}

      <Card title="Privacy" wide>
        <ul className="srv-notes adm-small">
          <li>Survey answers are stored in the database and only sent to signed-in admins. They aren't part of the public site or its data.</li>
          <li>
            The code repository is public: never commit the survey spreadsheet (or the member list with phone numbers and emails) to it. Spreadsheet files are
            git-ignored as a safety net.
          </li>
          <li>Anyone you make an admin can see everything here, including individual answers.</li>
        </ul>
      </Card>
    </div>
  );
}
