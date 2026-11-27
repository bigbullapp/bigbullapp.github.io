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

  var PAGE_SIZE = 18;

  var state = {
    providers: [],
    query: "",
    category: "all",
    platform: "all",
    visibleCount: PAGE_SIZE
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
    donutActiveArc: document.getElementById("donut-active-arc"),
    donutPassiveArc: document.getElementById("donut-passive-arc"),
    chartActivePct: document.getElementById("chart-active-pct"),
    chartTotal: document.getElementById("chart-total"),
    chartActive: document.getElementById("chart-active"),
    chartPassive: document.getElementById("chart-passive"),
    barCsVal: document.getElementById("bar-cs-val"),
    barCsFill: document.getElementById("bar-cs-fill"),
    barNuvioVal: document.getElementById("bar-nuvio-val"),
    barNuvioFill: document.getElementById("bar-nuvio-fill"),
    barPassiveVal: document.getElementById("bar-passive-val"),
    barPassiveFill: document.getElementById("bar-passive-fill"),
    statsChartCaption: document.getElementById("stats-chart-caption"),
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
    providerGrid: document.getElementById("provider-grid"),
    loadMoreBar: document.getElementById("load-more-bar"),
    loadMoreBtn: document.getElementById("load-more-btn"),
    showAllBtn: document.getElementById("show-all-btn")
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
      var isLightTheme = safeTheme === "light";
      var nextSrc = isLightTheme
        ? refs.heroBgImg.getAttribute("data-light-src")
        : refs.heroBgImg.getAttribute("data-dark-src");
      var nextSrcset = isLightTheme
        ? refs.heroBgImg.getAttribute("data-light-srcset")
        : refs.heroBgImg.getAttribute("data-dark-srcset");
      if (nextSrcset && refs.heroBgImg.getAttribute("srcset") !== nextSrcset) {
        refs.heroBgImg.setAttribute("srcset", nextSrcset);
      }
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

    document.addEventListener("click", function (event) {
      if (!refs.mobileNav.hidden && !event.target.closest(".site-header")) {
        setMobileMenu(false);
      }
    });

    if (window.matchMedia) {
      var wideQuery = window.matchMedia("(min-width: 1181px)");
      var closeOnWide = function (mq) {
        if (mq.matches && !refs.mobileNav.hidden) {
          setMobileMenu(false);
        }
      };
      if (typeof wideQuery.addEventListener === "function") {
        wideQuery.addEventListener("change", closeOnWide);
      } else if (typeof wideQuery.addListener === "function") {
        wideQuery.addListener(closeOnWide);
      }
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !refs.mobileNav.hidden) {
        setMobileMenu(false);
        refs.mobileMenuBtn.focus();
      }
    });
  }

  function selectTab(nextTab, moveFocus) {
    var targetId = nextTab.getAttribute("aria-controls");
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
    var img = document.createElement("img");
    img.className = "provider-logo";
    img.src = provider.icon || "assets/brand-mark.webp";
    img.alt = "";
    img.width = 44;
    img.height = 44;
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    img.addEventListener("error", function () {
      if (img.getAttribute("data-fallback") !== "1" && img.getAttribute("src") !== "assets/brand-mark.webp") {
        img.setAttribute("data-fallback", "1");
        img.src = "assets/brand-mark.webp";
        return;
      }
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

  function renderStatsChart() {
    var total = state.providers.length;
    var passiveCount = state.providers.filter(function (p) { return Boolean(p.passive); }).length;
    var activeCount = total - passiveCount;
    var csActiveCount = state.providers.filter(function (p) { return Boolean(p.cloudstream && !p.passive); }).length;
    var nuvioActiveCount = state.providers.filter(function (p) { return Boolean(p.nuvio && !p.passive); }).length;

    var pct = total ? Math.round((activeCount / total) * 100) : 0;
    var circumference = 2 * Math.PI * 46;
    var activeLen = total ? (activeCount / total) * circumference : 0;
    var passiveLen = total ? (passiveCount / total) * circumference : 0;

    if (refs.donutActiveArc) {
      refs.donutActiveArc.style.display = activeCount > 0 ? "" : "none";
      refs.donutActiveArc.setAttribute("stroke-dasharray", activeLen.toFixed(2) + " " + circumference.toFixed(2));
      refs.donutActiveArc.setAttribute("stroke-dashoffset", "0");
    }

    if (refs.donutPassiveArc) {
      refs.donutPassiveArc.style.display = passiveCount > 0 ? "" : "none";
      if (passiveCount > 0) {
        refs.donutPassiveArc.setAttribute("stroke-dasharray", passiveLen.toFixed(2) + " " + circumference.toFixed(2));
        refs.donutPassiveArc.setAttribute("stroke-dashoffset", (-activeLen).toFixed(2));
      } else {
        refs.donutPassiveArc.setAttribute("stroke-dasharray", "0 " + circumference.toFixed(2));
        refs.donutPassiveArc.setAttribute("stroke-dashoffset", "0");
      }
    }

    if (refs.chartActivePct) {
      refs.chartActivePct.textContent = "%" + String(pct);
    }
    if (refs.chartTotal) {
      refs.chartTotal.textContent = String(total);
    }
    if (refs.chartActive) {
      refs.chartActive.textContent = String(activeCount);
    }
    if (refs.chartPassive) {
      refs.chartPassive.textContent = String(passiveCount);
    }

    if (refs.barCsVal) {
      refs.barCsVal.textContent = csActiveCount + " / " + total;
    }
    if (refs.barCsFill) {
      refs.barCsFill.style.inlineSize = (total ? (csActiveCount / total) * 100 : 0).toFixed(1) + "%";
    }
    if (refs.barNuvioVal) {
      refs.barNuvioVal.textContent = nuvioActiveCount + " / " + total;
    }
    if (refs.barNuvioFill) {
      refs.barNuvioFill.style.inlineSize = (total ? (nuvioActiveCount / total) * 100 : 0).toFixed(1) + "%";
    }
    if (refs.barPassiveVal) {
      refs.barPassiveVal.textContent = passiveCount + " / " + total;
    }
    if (refs.barPassiveFill) {
      refs.barPassiveFill.style.inlineSize = (total ? (passiveCount / total) * 100 : 0).toFixed(1) + "%";
    }
    if (refs.statsChartCaption) {
      refs.statsChartCaption.textContent =
        "Toplam " + total + " sağlayıcıdan " + activeCount + " tanesi aktif, " + passiveCount + " tanesi pasif.";
    }
  }

  function renderProviders() {
    var filtered = state.providers.filter(matchesFilters);
    refs.stateLoading.hidden = true;
    refs.stateError.hidden = true;

    if (filtered.length === 0) {
      if (refs.providerCount) {
        refs.providerCount.textContent = "0 sağlayıcı";
      }
      refs.providerGrid.hidden = true;
      refs.stateEmpty.hidden = false;
      if (refs.loadMoreBar) {
        refs.loadMoreBar.hidden = true;
      }
      return;
    }

    var visible = filtered.slice(0, state.visibleCount);
    var remaining = filtered.length - visible.length;

    if (refs.providerCount) {
      refs.providerCount.textContent = filtered.length + " sağlayıcı";
    }

    refs.stateEmpty.hidden = true;
    refs.providerGrid.hidden = false;
    var frag = document.createDocumentFragment();
    visible.forEach(function (provider) {
      frag.appendChild(buildCard(provider));
    });
    refs.providerGrid.textContent = "";
    refs.providerGrid.appendChild(frag);

    if (refs.loadMoreBar) {
      refs.loadMoreBar.hidden = remaining <= 0;
      if (remaining > 0) {
        if (refs.loadMoreBtn) {
          refs.loadMoreBtn.textContent =
            "Daha Fazla Göster (+" + Math.min(PAGE_SIZE, remaining) + " · " + remaining + " kalan)";
        }
        if (refs.showAllBtn) {
          refs.showAllBtn.textContent = "Tümünü Göster (" + filtered.length + ")";
        }
      }
    }
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
    state.visibleCount = PAGE_SIZE;

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
        state.visibleCount = PAGE_SIZE;
        updateClearButton();
        renderProviders();
      });

      refs.searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && state.query.length > 0) {
          event.preventDefault();
          state.query = "";
          state.visibleCount = PAGE_SIZE;
          refs.searchInput.value = "";
          updateClearButton();
          renderProviders();
        }
      });
    }

    if (refs.clearSearchBtn) {
      refs.clearSearchBtn.addEventListener("click", function () {
        state.query = "";
        state.visibleCount = PAGE_SIZE;
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
          state.visibleCount = PAGE_SIZE;
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
        state.visibleCount = PAGE_SIZE;
        var buttons = refs.categoryBar.querySelectorAll(".cat-pill");
        runTransition(function () {
          Array.prototype.forEach.call(buttons, function (el) {
            el.setAttribute("aria-pressed", String(el === btn));
          });
          renderProviders();
        });
      });
    }

    if (refs.loadMoreBtn) {
      refs.loadMoreBtn.addEventListener("click", function () {
        state.visibleCount += PAGE_SIZE;
        renderProviders();
      });
    }

    if (refs.showAllBtn) {
      refs.showAllBtn.addEventListener("click", function () {
        state.visibleCount = state.providers.length;
        renderProviders();
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
    if (refs.loadMoreBar) {
      refs.loadMoreBar.hidden = true;
    }

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
        renderStatsChart();
        updateCategoryCounts();
        renderProviders();
      })
      .catch(function () {
        refs.stateLoading.hidden = true;
        refs.stateError.hidden = false;
        if (refs.loadMoreBar) {
          refs.loadMoreBar.hidden = true;
        }
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
      uri: "nuvio://bigbullapp-katalog-worker.applio.workers.dev/live/manifest.json"
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
  if (document.readyState === "complete") {
    loadProviders();
  } else {
    window.addEventListener("load", loadProviders, { once: true });
  }
})();
