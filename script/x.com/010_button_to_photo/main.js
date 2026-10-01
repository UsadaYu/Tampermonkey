// ==UserScript==
// @name              X(Twitter) quick jump to the `Photo` button
// @name:zh-CN        X（推特）快捷跳转 `Photo（相册照片）` 按钮
// @namespace         http://tampermonkey.net/
// @version           0.1.0
// @description       Add a button at the top right corner of the tweet that leads to the user's `Photo` page
// @description:zh-CN 在推文右上角添加跳转到该用户 `Photo（相册照片）` 页面的按钮
// @author            UsadaYu
// @match             https://x.com/*
// @match             https://twitter.com/*
// @icon              https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant             none
// @run-at            document-idle
// @license           MIT
// @homepage          https://github.com/UsadaYu/Tampermonkey
// @supportURL        https://github.com/UsadaYu/Tampermonkey/issues
// @downloadURL       https://raw.githubusercontent.com/UsadaYu/Tampermonkey/main/script/x.com/010_button_to_photo/main.js
// @updateURL         https://raw.githubusercontent.com/UsadaYu/Tampermonkey/main/script/x.com/010_button_to_photo/main.js
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_CLASS = 'custom-photo-btn';
  const FINETUNE_POSX_BUTTON = -4; // 微调按钮位置
  const FINETUNE_POSY_ICON = -4; // 微调图标位置

  function getUsername(article) {
    const userNameContainer =
      article.querySelector('[data-testid="User-Name"]');
    if (!userNameContainer) return null;

    const links = userNameContainer.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
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
      if (button) {
        return button;
      }
    }

    // fallback，仅中英文
    return (
      article.querySelector('button[aria-label="More"]') ||
      article.querySelector('button[aria-label*="More"]') ||
      article.querySelector('button[aria-label*="更多"]')
    );
  }

  function createPhotoButton(username) {
    const btn = document.createElement('a');
    btn.className = BUTTON_CLASS;
    btn.href = `https://x.com/${username}/media?filter=photo`;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.title = `View photos of @${username}`;
    btn.style.transform = `translateX(${FINETUNE_POSX_BUTTON}px)`;
    const icon = document.createElement('span');
    icon.textContent = '📷';
    icon.style.transform = `translateY(${FINETUNE_POSY_ICON}px)`;
    btn.appendChild(icon);

    Object.assign(btn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',

      width: '32px',
      height: '32px',

      padding: '0',
      margin: '0',

      fontSize: '14px',
      lineHeight: '1',

      textDecoration: 'none',
      cursor: 'pointer',

      borderRadius: '9999px',

      flexShrink: '0',

      boxSizing: 'border-box',

      transition: 'background-color 0.2s'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return btn;
  }

  function addPhotoButtons() {
    const articles =
      document.querySelectorAll('article[data-testid="tweet"]');
    for (const article of articles) {
      // 防止重复
      if (article.querySelector(`.${BUTTON_CLASS}`)) {
        continue;
      }

      const username = getUsername(article);
      if (!username) {
        continue;
      }

      const moreButton = getMoreButton(article);
      if (!moreButton) {
        continue;
      }

      const targetContainer = moreButton.parentElement;
      if (!targetContainer) {
        continue;
      }

      const btn = createPhotoButton(username);

      // 确保容器是横向 flex
      const style = getComputedStyle(targetContainer);

      if (style.display === 'flex' ||
        style.display === 'inline-flex') {
        targetContainer.insertBefore(btn, moreButton);
      } else {
        // 如果这一层不是 flex，再向上一层找
        const parent = targetContainer.parentElement;
        if (!parent) continue;

        const parentStyle = getComputedStyle(parent);
        if (parentStyle.display === 'flex' ||
          parentStyle.display === 'inline-flex') {
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
    subtree: true
  });

  addPhotoButtons();

})();
