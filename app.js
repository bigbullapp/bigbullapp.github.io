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
  var SEARCH_DEBOUNCE_MS = 120;
  var SAFE_ICON_RE = /^assets\/(?:icons\/[a-z0-9._-]+\.(?:png|webp)|brand-mark\.webp)$/i;
  var FALLBACK_ICON = "assets/brand-mark.webp";

  var state = {
    providers: [],
    query: "",
    category: "all",
    platform: "all",
    visibleCount: PAGE_SIZE,
    renderedFilterKey: "",
    renderedCount: 0
  };

  var searchDebounceTimer = null;

  var refs = {
    root: document.documentElement,
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),
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
    installCtaBanner: document.getElementById("install-cta-banner"),
    installCtaText: document.getElementById("install-cta-text"),
    installCtaLink: document.getElementById("install-cta-link"),
    installCtaDismiss: document.getElementById("install-cta-dismiss"),
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
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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

    if (refs.themeColorMeta) {
      refs.themeColorMeta.setAttribute("content", safeTheme === "light" ? "#EEF2FA" : "#070B18");
    }

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
    area.setAttribute("aria-hidden", "true");
    area.tabIndex = -1;
    area.className = "copy-fallback-area";
    document.body.appendChild(area);
    if (typeof area.focus === "function") {
      area.focus({ preventScroll: true });
    }
    area.select();
    try {
      if (document.execCommand("copy")) {
        markCopied(button, text);
      }
    } finally {
      document.body.removeChild(area);
      if (button && typeof button.focus === "function") {
        button.focus({ preventScroll: true });
      }
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

  function safeIconPath(rawIcon) {
    if (typeof rawIcon === "string" && SAFE_ICON_RE.test(rawIcon)) {
      return rawIcon;
    }
    return FALLBACK_ICON;
  }

  function normalizeProvider(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    var name = typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : "Bilinmeyen Sağlayıcı";
    var type = typeof raw.type === "string" && raw.type.trim()
      ? raw.type.trim()
      : "Sağlayıcı";
    var category = typeof raw.category === "string" ? raw.category : "";
    var tags = Array.isArray(raw.tags)
      ? raw.tags.filter(function (t) { return typeof t === "string"; })
      : [];

    return {
      name: name,
      type: type,
      category: category,
      tags: tags,
      icon: safeIconPath(raw.icon),
      cloudstream: Boolean(raw.cloudstream),
      passive: Boolean(raw.passive),
      nuvio: Boolean(raw.nuvio),
      nuvioAddon: Boolean(raw.nuvioAddon),
      vpnNote: Boolean(raw.vpnNote),
      _searchText: (name + " " + type).toLocaleLowerCase("tr-TR")
    };
  }

  function initialsOf(name) {
    var safe = typeof name === "string" ? name.trim() : "";
    if (!safe) {
      return "BB";
    }
    var caps = safe.replace(/[^A-ZÇĞİÖŞÜ]/g, "");
    if (caps.length >= 2) {
      return caps.slice(0, 2);
    }
    return safe.slice(0, 2).toUpperCase();
  }

  function createLogoElement(provider) {
    var img = document.createElement("img");
    img.className = "provider-logo";
    img.src = safeIconPath(provider.icon);
    img.alt = "";
    img.width = 44;
    img.height = 44;
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    img.addEventListener("error", function () {
      if (img.getAttribute("data-fallback") !== "1" && img.getAttribute("src") !== FALLBACK_ICON) {
        img.setAttribute("data-fallback", "1");
        img.src = FALLBACK_ICON;
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

  function matchesFilters(provider, normalizedQuery) {
    if (state.category !== "all") {
      if (provider.tags.indexOf(state.category) === -1 && provider.category !== state.category) {
        return false;
      }
    }

    if (state.platform === "cloudstream" && !provider.cloudstream) {
      return false;
    }

    if (state.platform === "nuvio" && !provider.nuvio && !provider.nuvioAddon) {
      return false;
    }

    if (normalizedQuery) {
      var haystack = provider._searchText || (provider.name + " " + provider.type).toLocaleLowerCase("tr-TR");
      if (haystack.indexOf(normalizedQuery) === -1) {
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
          return p.tags.indexOf(cat.id) !== -1 || p.category === cat.id;
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
    var nuvioActiveCount = state.providers.filter(function (p) {
      return Boolean((p.nuvio || p.nuvioAddon) && !p.passive);
    }).length;

    var pct = total ? Math.round((activeCount / total) * 100) : 0;
    var circumference = 2 * Math.PI * 46;
    var activeLen = total ? (activeCount / total) * circumference : 0;
    var passiveLen = total ? (passiveCount / total) * circumference : 0;

    if (refs.donutActiveArc) {
      refs.donutActiveArc.classList.toggle("is-hidden", activeCount <= 0);
      refs.donutActiveArc.setAttribute("stroke-dasharray", activeLen.toFixed(2) + " " + circumference.toFixed(2));
      refs.donutActiveArc.setAttribute("stroke-dashoffset", "0");
    }

    if (refs.donutPassiveArc) {
      refs.donutPassiveArc.classList.toggle("is-hidden", passiveCount <= 0);
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

  function renderProviders(options) {
    var focusNewSlice = Boolean(options && options.focusNewSlice);
    var normalizedQuery = state.query ? state.query.toLocaleLowerCase("tr-TR") : "";
    var filtered = state.providers.filter(function (provider) {
      return matchesFilters(provider, normalizedQuery);
    });

    refs.stateLoading.hidden = true;
    refs.stateError.hidden = true;

    if (filtered.length === 0) {
      state.renderedFilterKey = "";
      state.renderedCount = 0;
      if (refs.providerCount) {
        refs.providerCount.textContent = "0 sağlayıcı";
      }
      refs.providerGrid.hidden = true;
      refs.providerGrid.textContent = "";
      refs.stateEmpty.hidden = false;
      if (refs.loadMoreBar) {
        refs.loadMoreBar.hidden = true;
      }
      return;
    }

    var visible = filtered.slice(0, state.visibleCount);
    var remaining = filtered.length - visible.length;
    var filterKey = state.category + "\0" + state.platform + "\0" + state.query;
    var canAppend = (
      filterKey === state.renderedFilterKey &&
      !refs.providerGrid.hidden &&
      state.renderedCount > 0 &&
      visible.length >= state.renderedCount
    );

    if (refs.providerCount) {
      refs.providerCount.textContent = filtered.length + " sağlayıcı";
    }

    refs.stateEmpty.hidden = true;
    refs.providerGrid.hidden = false;

    var firstNewCard = null;
    var startIdx = canAppend ? state.renderedCount : 0;

    if (startIdx < visible.length) {
      var frag = document.createDocumentFragment();
      for (var i = startIdx; i < visible.length; i++) {
        var card = buildCard(visible[i]);
        if (!firstNewCard) {
          firstNewCard = card;
        }
        frag.appendChild(card);
      }
      if (!canAppend) {
        refs.providerGrid.textContent = "";
      }
      refs.providerGrid.appendChild(frag);
    } else if (!canAppend) {
      refs.providerGrid.textContent = "";
    }

    state.renderedFilterKey = filterKey;
    state.renderedCount = visible.length;

    var barWillHide = remaining <= 0;
    if (refs.loadMoreBar) {
      refs.loadMoreBar.hidden = barWillHide;
      if (!barWillHide) {
        if (refs.loadMoreBtn) {
          refs.loadMoreBtn.textContent =
            "Daha Fazla Göster (+" + Math.min(PAGE_SIZE, remaining) + " · " + remaining + " kalan)";
        }
        if (refs.showAllBtn) {
          refs.showAllBtn.textContent = "Tümünü Göster (" + filtered.length + ")";
        }
      }
    }

    if (focusNewSlice && barWillHide && firstNewCard && typeof firstNewCard.focus === "function") {
      firstNewCard.tabIndex = -1;
      firstNewCard.focus({ preventScroll: true });
    }
  }

  function updateClearButton() {
    if (refs.clearSearchBtn) {
      var currentVal = refs.searchInput ? refs.searchInput.value.trim() : state.query;
      refs.clearSearchBtn.hidden = currentVal.length === 0;
    }
  }

  function clearSearchTimer() {
    if (searchDebounceTimer !== null) {
      window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
  }

  function resetFilters() {
    clearSearchTimer();
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
        updateClearButton();
        clearSearchTimer();
        searchDebounceTimer = window.setTimeout(function () {
          searchDebounceTimer = null;
          var nextQuery = refs.searchInput.value.trim();
          if (state.query === nextQuery) {
            return;
          }
          state.query = nextQuery;
          state.visibleCount = PAGE_SIZE;
          renderProviders();
        }, SEARCH_DEBOUNCE_MS);
      });

      refs.searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && (state.query.length > 0 || refs.searchInput.value.length > 0)) {
          event.preventDefault();
          clearSearchTimer();
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
        clearSearchTimer();
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
        var buttons = refs.categoryBar.querySelectorAll(".cat-pill");
        runTransition(function () {
          state.category = cat;
          state.visibleCount = PAGE_SIZE;
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
        renderProviders({ focusNewSlice: true });
      });
    }

    if (refs.showAllBtn) {
      refs.showAllBtn.addEventListener("click", function () {
        state.visibleCount = state.providers.length;
        renderProviders({ focusNewSlice: true });
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
    state.renderedFilterKey = "";
    state.renderedCount = 0;
    refs.stateLoading.hidden = false;
    refs.stateEmpty.hidden = true;
    refs.stateError.hidden = true;
    refs.providerGrid.hidden = true;
    if (refs.loadMoreBar) {
      refs.loadMoreBar.hidden = true;
    }

    fetch("data/providers.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        var rawList = data && Array.isArray(data.providers) ? data.providers : [];
        state.providers = rawList.map(normalizeProvider).filter(Boolean);
        applyStats(data || {});
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

  var INSTALL_DEEPLINKS = Object.assign(Object.create(null), {
    "cloudstream": {
      tabId: "tab-cs",
      label: "Cloudstream deposu",
      actionLabel: "Cloudstream'e Ekle",
      uri: "cloudstreamrepo://repo.bigbullapp.com/repo.json"
    },
    "nuvio-katalog": {
      tabId: "tab-nuvio",
      label: "BigBullApp Katalog addon'u",
      actionLabel: "Nuvio'ya Ekle",
      uri: "nuvio://katalog.bigbullapp.com/manifest.json"
    },
    "nuvio-canli": {
      tabId: "tab-nuvio",
      label: "BigBull Canlı TV addon'u",
      actionLabel: "Nuvio'ya Ekle",
      uri: "nuvio://katalog.bigbullapp.com/live/manifest.json"
    }
  });

  function resolveInstallTarget(targetKey) {
    if (typeof targetKey !== "string" || !targetKey) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(INSTALL_DEEPLINKS, targetKey)) {
      return null;
    }
    var entry = INSTALL_DEEPLINKS[targetKey];
    if (!entry || typeof entry.uri !== "string" || typeof entry.tabId !== "string") {
      return null;
    }
    return entry;
  }

  function initAutoInstall() {
    if (refs.installCtaDismiss && refs.installCtaBanner) {
      refs.installCtaDismiss.addEventListener("click", function () {
        refs.installCtaBanner.hidden = true;
      });
    }

    if (typeof URLSearchParams !== "function") {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var entry = resolveInstallTarget(params.get("install"));
    if (!entry) {
      return;
    }

    var tabEl = document.getElementById(entry.tabId);
    if (tabEl) {
      selectTab(tabEl, false);
    }

    if (refs.installCtaBanner && refs.installCtaText && refs.installCtaLink) {
      refs.installCtaText.textContent = entry.label + " kurulum bağlantısı hazır.";
      refs.installCtaLink.setAttribute("href", entry.uri);
      refs.installCtaLink.textContent = entry.actionLabel || "Uygulamada Aç";
      refs.installCtaBanner.hidden = false;
    }

    var installSection = document.getElementById("kurulum");
    if (installSection && typeof installSection.scrollIntoView === "function") {
      installSection.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    }

    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", window.location.pathname + "#kurulum");
    }

    if (refs.installCtaLink && typeof refs.installCtaLink.focus === "function") {
      refs.installCtaLink.focus({ preventScroll: true });
    }
  }

  initTheme();
  initMobileMenu();
  initTabs();
  initCopyButtons();
  initControls();
  initAutoInstall();
  loadProviders();
})();
