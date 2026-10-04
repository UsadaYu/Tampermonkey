// ==UserScript==
// @name              X(Twitter) quick jump to the `Photo` button
// @name:zh-CN        X（推特）快捷跳转 `Photo（相册照片）` 按钮
// @namespace         http://tampermonkey.net/
// @version           0.1.3
// @description       Add a button at the top right corner of the tweet that leads to the user's `Photo` page
// @description:zh-CN 在推文右上角添加跳转到该用户 `Photo（相册照片）` 页面的按钮
// @author            UsadaYu
// @match             https://x.com/*
// @match             https://twitter.com/*
// @icon              https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant             GM_getValue
// @grant             GM_setValue
// @grant             GM_registerMenuCommand
// @run-at            document-idle
// @license           MIT
// @homepage          https://github.com/UsadaYu/Tampermonkey
// @supportURL        https://github.com/UsadaYu/Tampermonkey/issues
// @downloadURL       https://raw.githubusercontent.com/UsadaYu/Tampermonkey/main/script/x.com/010_button_to_photo/main.js
// @updateURL         https://raw.githubusercontent.com/UsadaYu/Tampermonkey/main/script/x.com/010_button_to_photo/main.js
// ==/UserScript==

(function () {
  "use strict";

  const FINETUNE_POSX_BUTTON = -4; // 微调按钮位置
  const FINETUNE_POSY_ICON = -4; // 微调图标位置

  const OPEN_IN_NEW_TAB_KEY = "openInNewTab";
  const BUTTON_CLASS = "custom-photo-btn";

  let openInNewTab = GM_getValue(OPEN_IN_NEW_TAB_KEY, false);
  let menuCommandId = null;

  function updatePhotoButtonsTarget() {
    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((btn) => {
      if (openInNewTab) {
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
      } else {
        btn.removeAttribute("target");
        btn.removeAttribute("rel");
      }
    });
  }

  function registerOrUpdateMenuCommand() {
    const name = openInNewTab ? "✓ Photo → New tab" : "○ Photo → Current tab";

    const title = openInNewTab
      ? "Photo opens in a new tab"
      : "Photo opens in the current tab";

    const options = {
      title,
      autoClose: true,
    };

    if (menuCommandId !== null) {
      options.id = menuCommandId;
    }

    menuCommandId = GM_registerMenuCommand(name, toggleOpenInNewTab, options);
  }

  function toggleOpenInNewTab() {
    openInNewTab = !openInNewTab;
    GM_setValue(OPEN_IN_NEW_TAB_KEY, openInNewTab);
    updatePhotoButtonsTarget();
    registerOrUpdateMenuCommand();
  }

  function getUsername(article) {
    const userNameContainer = article.querySelector(
      '[data-testid="User-Name"]',
    );
    if (!userNameContainer) return null;

    const links = userNameContainer.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && /^\/[A-Za-z0-9_]+$/.test(href)) {
        return href.substring(1);
      }
    }

    return null;
  }

  function getMoreButton(article) {
    // 优先找 caret
    const caret = article.querySelector('[data-testid="caret"]');
    if (caret) {
      const button = caret.closest('button, [role="button"]');
      if (button) return button;
    }

    // fallback，仅中英文
    return (
      article.querySelector('button[aria-label="More"]') ||
      article.querySelector('button[aria-label*="More"]') ||
      article.querySelector('button[aria-label*="更多"]')
    );
  }

  function createPhotoButton(username) {
    const photoPath = `/${username}/media?filter=photo`;
    const btn = document.createElement("a");
    btn.className = BUTTON_CLASS;
    btn.href = photoPath;
    if (openInNewTab) {
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
    }
    btn.title = `View photos of @${username}`;
    btn.style.transform = `translateX(${FINETUNE_POSX_BUTTON}px)`;
    const icon = document.createElement("span");
    icon.textContent = "📷";
    icon.style.transform = `translateY(${FINETUNE_POSY_ICON}px)`;
    btn.appendChild(icon);

    Object.assign(btn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",

      width: "38px",
      height: "38px",

      padding: "0",
      margin: "0",

      fontSize: "14px",
      lineHeight: "1",

      textDecoration: "none",
      cursor: "pointer",

      borderRadius: "9999px",

      flexShrink: "0",

      boxSizing: "border-box",

      transition: "background-color 0.2s",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.backgroundColor = "rgba(29, 155, 240, 0.1)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.backgroundColor = "transparent";
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止冒泡，避免触发推文卡片的点击事件

      if (!openInNewTab) {
        if (
          e.button !== 0 ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }

        e.preventDefault();

        const currentState = window.history.state;
        const newState = currentState ? { ...currentState } : null;

        window.history.pushState(newState, "", photoPath);
        window.dispatchEvent(
          new PopStateEvent("popstate", { state: newState }),
        );
      }
    });

    return btn;
  }

  function addPhotoButtons() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    for (const article of articles) {
      // 防止重复
      if (article.querySelector(`.${BUTTON_CLASS}`)) continue;

      const username = getUsername(article);
      if (!username) continue;

      const moreButton = getMoreButton(article);
      if (!moreButton) continue;

      const targetContainer = moreButton.parentElement;
      if (!targetContainer) continue;

      const btn = createPhotoButton(username);

      // 确保容器是横向 flex
      const style = getComputedStyle(targetContainer);

      if (style.display === "flex" || style.display === "inline-flex") {
        targetContainer.insertBefore(btn, moreButton);
      } else {
        // 如果这一层不是 flex，再向上一层找
        const parent = targetContainer.parentElement;
        if (!parent) continue;

        const parentStyle = getComputedStyle(parent);
        if (
          parentStyle.display === "flex" ||
          parentStyle.display === "inline-flex"
        ) {
          parent.insertBefore(btn, targetContainer);
        }
      }
    }
  }

  // 防抖，避免 X 大量 DOM mutation 时疯狂执行
  let timer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      addPhotoButtons();
    }, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  registerOrUpdateMenuCommand();
  addPhotoButtons();
})();
