/* ============================================================
   FL-200 FACE AUTH
   Token-only / sessionStorage-only
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  function key() {
    return (C && C.tokenPolicy && C.tokenPolicy.sessionKey) || "fl200_face_tok";
  }

  function getToken() {
    try { return sessionStorage.getItem(key()) || ""; } catch (e) { return ""; }
  }

  function setToken(token) {
    token = token || "";
    try {
      if (token) sessionStorage.setItem(key(), token);
      else sessionStorage.removeItem(key());
    } catch (e) {}
    return token;
  }

  function clear() {
    try { sessionStorage.removeItem(key()); } catch (e) {}
  }

  async function validate(token) {
    if (!token) throw new Error("FACE_TOKEN zaroori hai.");

    var repoUrl =
      (C.github.api || "https://api.github.com") +
      "/repos/" + C.heartRepo;

    var opts = {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: C.github.accept || "application/vnd.github+json"
      },
      cache: "no-store"
    };

    var repoResp = await fetch(repoUrl + "?_=" + Date.now(), opts);

    if (repoResp.status === 401) throw new Error("401 — FACE_TOKEN incorrect or expired.");
    if (repoResp.status === 403) throw new Error("403 — GitHub permission denied.");
    if (repoResp.status === 404) throw new Error("404 — FL-200-Private is not accessible with this token.");
    if (!repoResp.ok) throw new Error("GitHub " + repoResp.status + " during token verification.");

    var rootResp = await fetch(
      repoUrl + "/contents/?ref=" + encodeURIComponent(C.branch) + "&_=" + Date.now(),
      opts
    );

    if (!rootResp.ok) {
      throw new Error("Repository contents read failed (" + rootResp.status + ").");
    }

    return true;
  }

  function openApp() {
    var lock = document.getElementById("lock");
    var shell = document.getElementById("appShell");
    if (lock) lock.style.display = "none";
    if (shell) {
      shell.style.display = "block";
      shell.removeAttribute("aria-hidden");
    }
    document.body.classList.remove("locked");
    document.dispatchEvent(new CustomEvent("fl200:unlock"));
  }

  function lockApp() {
    clear();
    var shell = document.getElementById("appShell");
    var lock = document.getElementById("lock");
    if (shell) {
      shell.style.display = "none";
      shell.setAttribute("aria-hidden", "true");
    }
    if (lock) lock.style.display = "flex";
    var input = document.getElementById("ltok");
    if (input) {
      input.value = "";
      input.focus();
    }
    var err = document.getElementById("lockErr");
    if (err) err.textContent = "";
    document.dispatchEvent(new CustomEvent("fl200:lock"));
  }

  async function boot() {
    var lock = document.getElementById("lock");
    if (lock) lock.style.display = "flex";

    var existing = getToken();
    if (!existing) {
      var input = document.getElementById("ltok");
      if (input) input.focus();
      return;
    }

    try {
      await validate(existing);
      window.FL200_TOKEN = existing;
      openApp();
    } catch (e) {
      clear();
      var err = document.getElementById("lockErr");
      if (err) err.textContent = "Session expired. Enter FACE_TOKEN again.";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("lockBtn");
    var input = document.getElementById("ltok");
    var toggle = document.getElementById("toggleToken");
    var logout = document.getElementById("btnLogout");
    var logout2 = document.getElementById("btnLogout2");

    if (toggle) {
      toggle.addEventListener("click", function () {
        if (!input) return;
        var visible = input.type === "text";
        input.type = visible ? "password" : "text";
        toggle.textContent = visible ? "SHOW" : "HIDE";
      });
    }

    if (btn) {
      btn.addEventListener("click", async function () {
        var token = input ? input.value.trim() : "";
        var err = document.getElementById("lockErr");
        if (!token) {
          if (err) err.textContent = "FACE_TOKEN zaroori hai.";
          return;
        }
        if (err) err.textContent = "Verifying FACE_TOKEN…";
        try {
          await validate(token);
          window.FL200_TOKEN = setToken(token);
          if (err) err.textContent = "";
          openApp();
        } catch (e) {
          window.FL200_TOKEN = "";
          if (err) err.textContent = e && e.message ? e.message : "Authentication failed.";
        }
      });
    }

    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && btn) btn.click();
      });
    }

    if (logout) logout.addEventListener("click", lockApp);
    if (logout2) logout2.addEventListener("click", lockApp);

    boot();
  });

  window.FL200_AUTH = {
    getToken: getToken,
    setToken: setToken,
    clear: clear,
    validate: validate,
    lock: lockApp,
    open: openApp
  };
})();
