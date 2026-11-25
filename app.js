(function () {
  "use strict";

  var CATEGORIES = [
    { id: "all", label: "Tümü" },
    { id: "dizi", label: "Dizi" },
    { id: "film", label: "Film" },
    { id: "anime", label: "Anime" },
    { id: "asya", label: "Asya" },
    { id: "cizgi", label: "Çizgi ve Çocuk" },
    { id: "tv", label: "Ulusal TV" },
    { id: "belgesel", label: "Belgesel" },
    { id: "canli", label: "Canlı TV" }
  ];

  var state = {
    providers: [],
    query: "",
    category: "all",
    platform: "all"
  };

  var refs = {
    root: document.documentElement,
    themeToggle: document.getElementById("theme-toggle"),
    heroBgImg: document.getElementById("hero-bg-img"),
    mobileMenuBtn: document.getElementById("mobile-menu-btn"),
    mobileNav: document.getElementById("mobile-nav"),
    repoVersion: document.getElementById("repo-version"),
    footerVersion: document.getElementById("footer-version"),
    statCs: document.getElementById("stat-cs"),
    statNuvio: document.getElementById("stat-nuvio"),
    statChannels: document.getElementById("stat-channels"),
    tabButtons: Array.prototype.slice.call(document.querySelectorAll('[role="tab"]')),
    tabPanels: {
      "panel-cs": document.getElementById("panel-cs"),
      "panel-nuvio": document.getElementById("panel-nuvio")
    },
    copyButtons: Array.prototype.slice.call(document.querySelectorAll(".copy-btn")),
    copyAnnouncer: document.getElementById("copy-announcer"),
    searchInput: document.getElementById("provider-search"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    platformSelect: document.getElementById("platform-select"),
    categoryBar: document.getElementById("category-filters"),
    providerCount: document.getElementById("provider-count"),
    stateLoading: document.getElementById("state-loading"),
    stateEmpty: document.getElementById("state-empty"),
    stateError: document.getElementById("state-error"),
    resetFiltersBtn: document.getElementById("reset-filters-btn"),
    retryLoadBtn: document.getElementById("retry-load-btn"),
    providerGrid: document.getElementById("provider-grid")
  };

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function runTransition(updateFn) {
    if (typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
      return document.startViewTransition(updateFn);
    }
    updateFn();
    return null;
  }

  function applyTheme(theme) {
    var safeTheme = theme === "light" ? "light" : "dark";
    refs.root.setAttribute("data-theme", safeTheme);

    if (refs.heroBgImg) {
      var nextSrc = safeTheme === "light"
        ? refs.heroBgImg.getAttribute("data-light-src")
        : refs.heroBgImg.getAttribute("data-dark-src");
      if (nextSrc && refs.heroBgImg.getAttribute("src") !== nextSrc) {
        refs.heroBgImg.setAttribute("src", nextSrc);
      }
    }

    if (refs.themeToggle) {
      var isLight = safeTheme === "light";
      refs.themeToggle.setAttribute("aria-pressed", String(isLight));
      refs.themeToggle.setAttribute("aria-label", isLight ? "Koyu temaya geç" : "Açık temaya geç");
    }

    try {
      localStorage.setItem("bb-theme", safeTheme);
    } catch (e) {
      /* Depolama kisitlamasinda sessiz devam */
    }
  }

  function initTheme() {
    applyTheme(refs.root.getAttribute("data-theme") || "dark");
    if (refs.themeToggle) {
      refs.themeToggle.addEventListener("click", function () {
        var next = refs.root.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(next);
      });
    }
  }

  function setMobileMenu(open) {
    if (!refs.mobileMenuBtn || !refs.mobileNav) {
      return;
    }
    refs.mobileMenuBtn.setAttribute("aria-expanded", String(open));
    refs.mobileMenuBtn.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
    refs.mobileNav.hidden = !open;
  }

  function initMobileMenu() {
    if (!refs.mobileMenuBtn || !refs.mobileNav) {
      return;
    }
    refs.mobileMenuBtn.addEventListener("click", function () {
      var expanded = refs.mobileMenuBtn.getAttribute("aria-expanded") === "true";
      setMobileMenu(!expanded);
    });

    refs.mobileNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMobileMenu(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !refs.mobileNav.hidden) {
        setMobileMenu(false);
        refs.mobileMenuBtn.focus();
      }
    });
  }

  function selectTab(nextTab, moveFocus) {
    var targetId = nextTab.getAttribute("aria-controls");
    runTransition(function () {
      refs.tabButtons.forEach(function (btn) {
        var selected = btn === nextTab;
        btn.setAttribute("aria-selected", String(selected));
        btn.setAttribute("tabindex", selected ? "0" : "-1");
      });

      Object.keys(refs.tabPanels).forEach(function (panelId) {
        var panel = refs.tabPanels[panelId];
        if (panel) {
          panel.hidden = panelId !== targetId;
        }
      });
    });

    if (moveFocus) {
      nextTab.focus();
    }
  }

  function initTabs() {
    refs.tabButtons.forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        selectTab(btn, false);
      });

      btn.addEventListener("keydown", function (event) {
        var nextIdx = idx;
        if (event.key === "ArrowRight") {
          nextIdx = (idx + 1) % refs.tabButtons.length;
        } else if (event.key === "ArrowLeft") {
          nextIdx = (idx - 1 + refs.tabButtons.length) % refs.tabButtons.length;
        } else if (event.key === "Home") {
          nextIdx = 0;
        } else if (event.key === "End") {
          nextIdx = refs.tabButtons.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        selectTab(refs.tabButtons[nextIdx], true);
      });
    });
  }

  function createSvgIcon(kind) {
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");

    if (kind === "check") {
      var check = document.createElementNS(svgNS, "path");
      check.setAttribute("d", "M20 6 9 17l-5-5");
      svg.appendChild(check);
    } else {
      var rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", "9");
      rect.setAttribute("y", "9");
      rect.setAttribute("width", "13");
      rect.setAttribute("height", "13");
      rect.setAttribute("rx", "2");
      svg.appendChild(rect);
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");
      svg.appendChild(path);
    }
    return svg;
  }

  function markCopied(button, value) {
    var labelSpan = button.querySelector(".copy-label");
    var existingIcon = button.querySelector("svg");
    if (existingIcon) {
      button.replaceChild(createSvgIcon("check"), existingIcon);
    }
    if (labelSpan) {
      labelSpan.textContent = "Kopyalandı";
    }
    button.classList.add("is-copied");

    if (refs.copyAnnouncer) {
      refs.copyAnnouncer.textContent = value + " panoya kopyalandı.";
    }

    if (button._copyTimer) {
      window.clearTimeout(button._copyTimer);
    }
    button._copyTimer = window.setTimeout(function () {
      var iconNow = button.querySelector("svg");
      if (iconNow) {
        button.replaceChild(createSvgIcon("copy"), iconNow);
      }
      if (labelSpan) {
        labelSpan.textContent = "Kopyala";
      }
      button.classList.remove("is-copied");
    }, 1800);
  }

  function copyText(text, button) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(function () {
        markCopied(button, text);
      }).catch(function () {
        fallbackCopy(text, button);
      });
      return;
    }
    fallbackCopy(text, button);
  }

  function fallbackCopy(text, button) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "visually-hidden";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      markCopied(button, text);
    } finally {
      document.body.removeChild(area);
    }
  }

  function initCopyButtons() {
    refs.copyButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-copy");
        if (value) {
          copyText(value, button);
        }
      });
    });
  }

  function initialsOf(name) {
    var caps = name.replace(/[^A-ZÇĞİÖŞÜ]/g, "");
    if (caps.length >= 2) {
      return caps.slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }

  function createLogoElement(provider) {
    if (!provider.icon) {
      var mono = document.createElement("span");
      mono.className = "provider-monogram";
      mono.setAttribute("aria-hidden", "true");
      mono.textContent = initialsOf(provider.name);
      return mono;
    }

    var img = document.createElement("img");
    img.className = "provider-logo";
    img.src = provider.icon;
    img.alt = "";
    img.width = 44;
    img.height = 44;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () {
      var fallback = document.createElement("span");
      fallback.className = "provider-monogram";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = initialsOf(provider.name);
      if (img.parentNode) {
        img.parentNode.replaceChild(fallback, img);
      }
    });
    return img;
  }

  function buildStatusItem(clientName, info) {
    var wrap = document.createElement("div");
    wrap.className = "status-item";
    wrap.setAttribute("data-state", info.state);

    var dot = document.createElement("span");
    dot.className = "status-dot";
    dot.setAttribute("aria-hidden", "true");

    var clientSpan = document.createElement("span");
    clientSpan.className = "status-label";
    clientSpan.textContent = clientName;

    var stateSpan = document.createElement("span");
    stateSpan.textContent = info.label;

    wrap.appendChild(dot);
    wrap.appendChild(clientSpan);
    wrap.appendChild(stateSpan);
    return wrap;
  }

  function buildCard(provider) {
    var li = document.createElement("li");
    li.className = "provider-card";

    var head = document.createElement("div");
    head.className = "card-head";
    head.appendChild(createLogoElement(provider));

    var titleGroup = document.createElement("div");
    titleGroup.className = "card-title-group";

    var nameRow = document.createElement("div");
    nameRow.className = "card-name-row";

    var h3 = document.createElement("h3");
    h3.textContent = provider.name;
    nameRow.appendChild(h3);

    if (provider.vpnNote) {
      var vpn = document.createElement("span");
      vpn.className = "vpn-note";
      vpn.textContent = "VPN";
      nameRow.appendChild(vpn);
    }

    var typeP = document.createElement("p");
    typeP.className = "card-type";
    typeP.textContent = provider.type;

    titleGroup.appendChild(nameRow);
    titleGroup.appendChild(typeP);
    head.appendChild(titleGroup);

    var statuses = document.createElement("div");
    statuses.className = "card-statuses";

    var csInfo = !provider.cloudstream
      ? { state: "off", label: "Yok" }
      : (provider.passive ? { state: "off", label: "Pasif" } : { state: "ok", label: "Aktif" });

    var nvInfo = provider.nuvio
      ? { state: "ok", label: "Aktif" }
      : (provider.nuvioAddon ? { state: "live", label: "Canlı Addon" } : { state: "off", label: "Yok" });

    statuses.appendChild(buildStatusItem("Cloudstream", csInfo));
    statuses.appendChild(buildStatusItem("Nuvio", nvInfo));

    li.appendChild(head);
    li.appendChild(statuses);
    return li;
  }

  function matchesFilters(provider) {
    if (state.category !== "all") {
      var tags = Array.isArray(provider.tags) ? provider.tags : [];
      if (tags.indexOf(state.category) === -1 && provider.category !== state.category) {
        return false;
      }
    }

    if (state.platform === "cloudstream" && !provider.cloudstream) {
      return false;
    }

    if (state.platform === "nuvio" && !provider.nuvio && !provider.nuvioAddon) {
      return false;
    }

    if (state.query) {
      var q = state.query.toLocaleLowerCase("tr-TR");
      var haystack = (provider.name + " " + provider.type).toLocaleLowerCase("tr-TR");
      if (haystack.indexOf(q) === -1) {
        return false;
      }
    }

    return true;
  }

  function updateCategoryCounts() {
    if (!refs.categoryBar) {
      return;
    }
    var counts = { all: state.providers.length };
    CATEGORIES.forEach(function (cat) {
      if (cat.id !== "all") {
        counts[cat.id] = state.providers.filter(function (p) {
          var tags = Array.isArray(p.tags) ? p.tags : [];
          return tags.indexOf(cat.id) !== -1 || p.category === cat.id;
        }).length;
      }
    });

    var buttons = refs.categoryBar.querySelectorAll(".cat-pill");
    Array.prototype.forEach.call(buttons, function (btn) {
      var catId = btn.getAttribute("data-cat");
      var def = CATEGORIES.find(function (c) { return c.id === catId; });
      if (def) {
        btn.textContent = def.label + " (" + String(counts[catId] || 0) + ")";
      }
    });
  }

  function renderProviders() {
    var filtered = state.providers.filter(matchesFilters);
    refs.stateLoading.hidden = true;
    refs.stateError.hidden = true;

    if (refs.providerCount) {
      refs.providerCount.textContent = filtered.length + " sağlayıcı";
    }

    if (filtered.length === 0) {
      refs.providerGrid.hidden = true;
      refs.stateEmpty.hidden = false;
      return;
    }

    refs.stateEmpty.hidden = true;
    refs.providerGrid.hidden = false;
    var frag = document.createDocumentFragment();
    filtered.forEach(function (provider) {
      frag.appendChild(buildCard(provider));
    });
    refs.providerGrid.textContent = "";
    refs.providerGrid.appendChild(frag);
  }

  function updateClearButton() {
    if (refs.clearSearchBtn) {
      refs.clearSearchBtn.hidden = state.query.length === 0;
    }
  }

  function resetFilters() {
    state.query = "";
    state.category = "all";
    state.platform = "all";

    if (refs.searchInput) {
      refs.searchInput.value = "";
    }
    if (refs.platformSelect) {
      refs.platformSelect.value = "all";
    }
    updateClearButton();

    if (refs.categoryBar) {
      var buttons = refs.categoryBar.querySelectorAll(".cat-pill");
      Array.prototype.forEach.call(buttons, function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-cat") === "all"));
      });
    }

    renderProviders();
  }

  function initControls() {
    if (refs.searchInput) {
      refs.searchInput.addEventListener("input", function () {
        state.query = refs.searchInput.value.trim();
        updateClearButton();
        renderProviders();
      });

      refs.searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && state.query.length > 0) {
          event.preventDefault();
          state.query = "";
          refs.searchInput.value = "";
          updateClearButton();
          renderProviders();
        }
      });
    }

    if (refs.clearSearchBtn) {
      refs.clearSearchBtn.addEventListener("click", function () {
        state.query = "";
        if (refs.searchInput) {
          refs.searchInput.value = "";
          refs.searchInput.focus();
        }
        updateClearButton();
        renderProviders();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      var tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (refs.searchInput) {
        event.preventDefault();
        refs.searchInput.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        refs.searchInput.focus();
      }
    });

    if (refs.platformSelect) {
      refs.platformSelect.addEventListener("change", function () {
        var next = refs.platformSelect.value || "all";
        runTransition(function () {
          state.platform = next;
          renderProviders();
        });
      });
    }

    if (refs.categoryBar) {
      refs.categoryBar.addEventListener("click", function (event) {
        var btn = event.target.closest(".cat-pill");
        if (!btn) {
          return;
        }
        var cat = btn.getAttribute("data-cat") || "all";
        if (state.category === cat) {
          return;
        }
        state.category = cat;
        var buttons = refs.categoryBar.querySelectorAll(".cat-pill");
        runTransition(function () {
          Array.prototype.forEach.call(buttons, function (el) {
            el.setAttribute("aria-pressed", String(el === btn));
          });
          renderProviders();
        });
      });
    }

    if (refs.resetFiltersBtn) {
      refs.resetFiltersBtn.addEventListener("click", function () {
        runTransition(resetFilters);
      });
    }

    if (refs.retryLoadBtn) {
      refs.retryLoadBtn.addEventListener("click", loadProviders);
    }
  }

  function applyStats(data) {
    if (data.version) {
      if (refs.repoVersion) {
        refs.repoVersion.textContent = "v" + data.version;
      }
      if (refs.footerVersion) {
        refs.footerVersion.textContent = "v" + data.version;
      }
    }
    if (!data.stats) {
      return;
    }
    if (typeof data.stats.cloudstream === "number" && refs.statCs) {
      refs.statCs.textContent = String(data.stats.cloudstream);
    }
    if (typeof data.stats.nuvioActive === "number" && refs.statNuvio) {
      refs.statNuvio.textContent = String(data.stats.nuvioActive);
    }
    if (typeof data.stats.liveChannels === "number" && refs.statChannels) {
      refs.statChannels.textContent = String(data.stats.liveChannels);
    }
  }

  function loadProviders() {
    refs.stateLoading.hidden = false;
    refs.stateEmpty.hidden = true;
    refs.stateError.hidden = true;
    refs.providerGrid.hidden = true;

    fetch("data/providers.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        state.providers = Array.isArray(data.providers) ? data.providers : [];
        applyStats(data);
        updateCategoryCounts();
        renderProviders();
      })
      .catch(function () {
        refs.stateLoading.hidden = true;
        refs.stateError.hidden = false;
      });
  }

  var INSTALL_DEEPLINKS = {
    "cloudstream": {
      tabId: "tab-cs",
      uri: "cloudstreamrepo://raw.githubusercontent.com/F0Rextasy/bigbullapp-cs/master/repo.json"
    },
    "nuvio-katalog": {
      tabId: "tab-nuvio",
      uri: "nuvio://bigbullapp-katalog-worker.applio.workers.dev/manifest.json"
    },
    "nuvio-canli": {
      tabId: "tab-nuvio",
      uri: "nuvio://raw.githubusercontent.com/F0Rextasy/bigbullapp-cs/master/nuvio/addon-live/manifest.json"
    }
  };

  function initAutoInstall() {
    if (typeof URLSearchParams !== "function") {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var targetKey = params.get("install");
    var entry = targetKey ? INSTALL_DEEPLINKS[targetKey] : null;
    if (!entry) {
      return;
    }

    var tabEl = document.getElementById(entry.tabId);
    if (tabEl) {
      selectTab(tabEl, false);
    }

    var installSection = document.getElementById("kurulum");
    if (installSection) {
      installSection.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    }

    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", window.location.pathname + "#kurulum");
    }

    window.setTimeout(function () {
      window.location.href = entry.uri;
    }, 150);
  }

  initTheme();
  initMobileMenu();
  initTabs();
  initCopyButtons();
  initControls();
  initAutoInstall();
  loadProviders();
})();
