const $ = (s, root = document) => root.querySelector(s);
const loginPanel = $("#login-panel"),
  dashboardPanel = $("#dashboard-panel");
let materials = [];
function esc(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  let data = {};
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function message(el, text, success = false) {
  el.textContent = text;
  el.classList.toggle("success", success);
}
function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  refresh();
}
async function checkSession() {
  try {
    const data = await api("/api/admin/me");
    if (data.authenticated) showDashboard();
  } catch {}
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formElement = e.currentTarget;
  const btn = formElement.querySelector("button");
  const msg = $("#login-message");
  btn.disabled = true;
  message(msg, "Checking credentials…");
  try {
    const form = new FormData(formElement);ss
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    formElement.reset();
    message(msg, "Signed in successfully.", true);
    showDashboard();
  } catch (err) {
    message(msg, err.message);
  } finally {
    btn.disabled = false;
  }
});
$("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch {}
  dashboardPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  message($("#login-message"), "You have signed out.", true);
});
$("#pdf-file").addEventListener("change", (e) => {
  $("#file-label").textContent = e.target.files[0]?.name || "Choose a PDF file";
});
$("#upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = $("#upload-message");
  const btn = form.querySelector('button[type="submit"]');
  const file = $("#pdf-file").files[0];
  if (!file) return message(msg, "Please choose a PDF file.");
  if (file.size > 100 * 1024 * 1024)
    return message(msg, "The file is larger than the 100 MB limit.");
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  )
    return message(msg, "Only PDF files are allowed.");
  const fd = new FormData(form);
  btn.disabled = true;
  message(msg, "Uploading PDF…");
  $("#upload-progress").classList.remove("hidden");
  $("#upload-progress span").style.width = "25%";
  try {
    await api("/api/admin/materials", { method: "POST", body: fd });
    $("#upload-progress span").style.width = "100%";
    message(msg, "PDF uploaded successfully.", true);
    form.reset();
    $("#file-label").textContent = "Choose a PDF file";
    await refresh();
    setTimeout(() => $("#upload-progress").classList.add("hidden"), 800);
  } catch (err) {
    message(msg, err.message);
    $("#upload-progress").classList.add("hidden");
  } finally {
    btn.disabled = false;
  }
});
function renderAdmin() {
  const q = $("#admin-search").value.trim().toLowerCase();
  const list = materials.filter((m) =>
    [m.title, m.subject, m.description].join(" ").toLowerCase().includes(q),
  );
  $("#admin-materials").innerHTML = list.length
    ? list
        .map(
          (m) =>
            `<div class="admin-material"><span class="pdf-icon">PDF</span><div class="admin-material-main"><strong title="${esc(m.title)}">${esc(m.title)}</strong><small>${esc(m.subject)} · ${m.size ? formatBytes(m.size) : "PDF"} · ${m.published === false ? "Draft" : "Published"}</small></div><div class="material-actions"><button class="mini-action" data-action="edit" data-id="${esc(m.id)}">Edit</button><button class="mini-action" data-action="toggle" data-id="${esc(m.id)}">${m.published === false ? "Publish" : "Unpublish"}</button><button class="mini-action danger" data-action="delete" data-id="${esc(m.id)}">Delete</button></div></div>`,
        )
        .join("")
    : `<div class="empty-state"><h3>${q ? "No matching notes" : "No notes uploaded yet"}</h3><p>${q ? "Try another search." : "Upload your first PDF using the form."}</p></div>`;
  $("#admin-total").textContent = materials.filter(
    (m) => m.published !== false,
  ).length;
  const subjects = [
    ...new Set(materials.map((m) => m.subject).filter(Boolean)),
  ].sort();
  $("#admin-subjects").textContent = subjects.length;
  $("#storage-mode").textContent = window.__storageMode || "Configured";
  $("#subject-options").innerHTML = subjects
    .map((s) => `<option value="${esc(s)}">`)
    .join("");
}
function formatBytes(n) {
  if (!n) return "PDF";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
async function refresh() {
  try {
    const data = await api("/api/admin/materials");
    materials = data.materials || [];
    window.__storageMode =
      data.storageMode === "supabase" ? "Supabase cloud" : "Local";
    renderAdmin();
  } catch (err) {
    $("#admin-materials").innerHTML =
      `<div class="empty-state"><h3>Could not load notes</h3><p>${esc(err.message)}</p></div>`;
  }
}
$("#admin-search").addEventListener("input", renderAdmin);
$("#refresh-button").addEventListener("click", refresh);
$("#admin-materials").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  const id = b.dataset.id;
  try {
    if (b.dataset.action === "delete") {
      if (!confirm("Delete this PDF note permanently?")) return;
      await api(`/api/admin/materials/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } else if (b.dataset.action === "edit") {
      const material = materials.find((m) => m.id === id);
      if (!material) return;
      const title = prompt("Note title:", material.title);
      if (title === null) return;
      const subject = prompt("Subject / category:", material.subject);
      if (subject === null) return;
      const description = prompt("Description:", material.description || "");
      if (description === null) return;
      await api(`/api/admin/materials/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, description }),
      });
    } else {
      const material = materials.find((m) => m.id === id);
      await api(`/api/admin/materials/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: material?.published === false }),
      });
    }
    await refresh();
  } catch (err) {
    alert(err.message);
  }
});
checkSession();
