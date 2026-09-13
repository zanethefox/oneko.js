/*!
 * MIT License
 *
 * Copyright © 2022 adryd
 * Copyright © 2026 kyrie25
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// oneko.js: https://github.com/adryd325/oneko.js
// Drag reactions inspired by https://github.com/kyrie25/spicetify-oneko

(function oneko() {
  const isReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");
  let persistPosition = true;
  let isTracking = false;
  let toggleTrackingOnClick = true;
  let isHovered = false;
  let drag = null;
  let drop = null;
  let suppressClick = false;

  let nekoPosX = 32;
  let nekoPosY = 32;

  let mousePosX = 0;
  let mousePosY = 0;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;
  let nextIdleAnimationTime = 30 + Math.floor(Math.random() * 40);
  let spriteName = "idle";
  let spriteFrame = 0;

  const sessionKey = "oneko:session";

  const nekoSpeed = 10;
  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  function init() {
    let nekoFile = "/oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }
    if (curScript && curScript.dataset.persistPosition !== undefined) {
      if (curScript.dataset.persistPosition === "") {
        persistPosition = true;
      } else {
        persistPosition = JSON.parse(
          curScript.dataset.persistPosition.toLowerCase(),
        );
      }
    }
    if (curScript && curScript.dataset.tracking) {
      isTracking = JSON.parse(curScript.dataset.tracking.toLowerCase());
    }
    if (curScript && curScript.dataset.toggleTrackingOnClick) {
      toggleTrackingOnClick = JSON.parse(
        curScript.dataset.toggleTrackingOnClick.toLowerCase(),
      );
    }

    if (persistPosition) {
      try {
        const storedNeko = JSON.parse(window.localStorage.getItem("oneko"));
        // A fresh tab remembers only the position and starts with a seated cat.
        if (
          Number.isFinite(storedNeko?.nekoPosX) &&
          Number.isFinite(storedNeko?.nekoPosY)
        ) {
          nekoPosX = storedNeko.nekoPosX;
          nekoPosY = storedNeko.nekoPosY;
        }
      } catch {
        // The cat still works if storage is unavailable or contains invalid data.
      }
    }

    nekoEl.id = "oneko";
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.cursor = "grab";
    nekoEl.style.touchAction = "none";
    nekoEl.style.userSelect = "none";
    nekoEl.style.transformOrigin = "center bottom";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.setAttribute("role", "button");
    nekoEl.setAttribute("tabindex", "0");
    mousePosX = nekoPosX;
    mousePosY = nekoPosY;
    restoreSession();
    updateTrackingState();
    updatePosition();
    nekoEl.style.zIndex = 2147483647;

    nekoEl.style.backgroundImage = `url(${nekoFile})`;
    setSprite(spriteName, spriteFrame);

    document.body.appendChild(nekoEl);

    function toggleTracking() {
      if (!toggleTrackingOnClick || drag) {
        return;
      }
      isTracking = !isTracking;
      updateTrackingState();
      if (drop) return;
      resetIdleAnimation();
      if (isTracking) {
        idleTime = 7;
        setSprite("alert", 0);
      } else {
        updateAttention();
      }
    }

    function updateTrackingState() {
      nekoEl.setAttribute(
        "aria-label",
        isTracking ? "Let the cat rest" : "Let the cat follow your cursor",
      );
      nekoEl.setAttribute("aria-pressed", String(isTracking));
      nekoEl.title = isTracking
        ? "Click to rest · Drag to move"
        : "Click to follow · Drag to move";
    }

    function updateAttention() {
      if (isTracking || drag || drop) return;
      resetIdleAnimation();
      setSprite(isAttentive() ? "alert" : "idle", 0);
    }

    nekoEl.addEventListener("pointerdown", function (event) {
      if (!event.isPrimary || event.button !== 0 || drag) return;

      // Picking the cat up again interrupts the landing at its current position.
      drop = null;
      nekoEl.style.transform = "";
      suppressClick = false;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startNekoX: nekoPosX,
        startNekoY: nekoPosY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
        sprite: "alert",
        lastMoveTime: 0,
      };
      nekoEl.setPointerCapture(event.pointerId);
      resetIdleAnimation();
      setSprite("alert", 0);
    });

    nekoEl.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      const offsetX = event.clientX - drag.startX;
      const offsetY = event.clientY - drag.startY;
      // Allow a little hand movement during a click before picking the cat up.
      if (!drag.moved && Math.hypot(offsetX, offsetY) < 6) return;

      drag.moved = true;
      nekoEl.style.cursor = "grabbing";
      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      if (deltaX !== 0 || deltaY !== 0) {
        // The cat braces its paws against the direction it is being carried.
        drag.sprite =
          Math.abs(deltaX) > Math.abs(deltaY)
            ? deltaX > 0
              ? "scratchWallW"
              : "scratchWallE"
            : deltaY > 0
              ? "scratchWallN"
              : "scratchWallS";
        drag.lastMoveTime = performance.now();
        setSprite(drag.sprite, frameCount);
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      nekoPosX = drag.startNekoX + offsetX;
      nekoPosY = drag.startNekoY + offsetY;
      updatePosition();
    });

    function releaseDrag(event) {
      if (
        !drag ||
        (event.pointerId !== undefined && event.pointerId !== drag.pointerId)
      ) {
        return;
      }

      const pointerId = drag.pointerId;
      const shouldDrop = drag.moved && event.type === "pointerup";
      suppressClick = drag.moved || event.type !== "pointerup";
      drag = null;
      if (nekoEl.hasPointerCapture(pointerId)) {
        nekoEl.releasePointerCapture(pointerId);
      }
      nekoEl.style.cursor = "grab";
      isHovered =
        event.type === "pointerup" &&
        event.pointerType !== "touch" &&
        document.elementFromPoint(event.clientX, event.clientY) === nekoEl;
      resetIdleAnimation();
      idleTime = isTracking ? 7 : 0;
      setSprite(isAttentive() ? "alert" : "idle", 0);
      if (shouldDrop) {
        const targetY = Math.min(nekoPosY + 24, window.innerHeight - 16);
        drop = {
          startY: nekoPosY,
          targetY: Math.max(16, targetY),
          startTime: null,
          fallDuration: targetY > nekoPosY ? 180 : 0,
        };
        setSprite("S", 0);
      }
    }

    nekoEl.addEventListener("pointerup", releaseDrag);
    nekoEl.addEventListener("pointercancel", releaseDrag);
    nekoEl.addEventListener("lostpointercapture", releaseDrag);
    window.addEventListener("blur", releaseDrag);

    nekoEl.addEventListener("pointerenter", function () {
      isHovered = true;
      updateAttention();
    });
    nekoEl.addEventListener("pointerleave", function () {
      isHovered = false;
      updateAttention();
    });
    nekoEl.addEventListener("focus", updateAttention);
    nekoEl.addEventListener("blur", updateAttention);
    nekoEl.addEventListener("click", function (event) {
      // A completed drag also generates a click; it should only reposition the cat.
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      toggleTracking();
    });
    nekoEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) toggleTracking();
      }
    });

    document.addEventListener("pointermove", function (event) {
      if (!event.isPrimary) return;
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    });
    window.addEventListener("resize", updatePosition);

    window.addEventListener("pagehide", function (event) {
      // Pointer capture cannot carry over to another document.
      releaseDrag(event);
      finishDrop();
      try {
        window.sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            version: 1,
            nekoPosX,
            nekoPosY,
            mousePosX,
            mousePosY,
            isTracking,
            frameCount,
            idleTime,
            idleAnimation,
            idleAnimationFrame,
            nextIdleAnimationTime,
            spriteName,
            spriteFrame,
          }),
        );
      } catch {
        // Navigation still works when session storage is unavailable.
      }

      if (persistPosition) {
        try {
          window.localStorage.setItem(
            "oneko",
            JSON.stringify({ nekoPosX, nekoPosY }),
          );
        } catch {
          // Position persistence is optional when storage is unavailable.
        }
      }
    });

    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      // Back/Forward may revive an old document: use the latest cat state.
      syncSession();
    });

    window.addEventListener("storage", function (event) {
      // Cached documents can receive the latest session update after pageshow.
      if (event.key === sessionKey) syncSession();
    });

    function syncSession() {
      finishDrop();
      restoreSession();
      isHovered = false;
      suppressClick = false;
      updateTrackingState();
      updatePosition();
      setSprite(spriteName, spriteFrame);
    }

    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function restoreSession() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(sessionKey));
      if (
        saved?.version !== 1 ||
        typeof saved.isTracking !== "boolean" ||
        ![
          saved.nekoPosX,
          saved.nekoPosY,
          saved.mousePosX,
          saved.mousePosY,
        ].every(Number.isFinite) ||
        ![
          saved.frameCount,
          saved.idleTime,
          saved.idleAnimationFrame,
          saved.nextIdleAnimationTime,
          saved.spriteFrame,
        ].every((value) => Number.isSafeInteger(value) && value >= 0) ||
        ![
          null,
          "sleeping",
          "scratchSelf",
          "scratchWallN",
          "scratchWallS",
          "scratchWallE",
          "scratchWallW",
        ].includes(saved.idleAnimation) ||
        !Object.hasOwn(spriteSets, saved.spriteName)
      ) {
        return;
      }

      nekoPosX = saved.nekoPosX;
      nekoPosY = saved.nekoPosY;
      mousePosX = saved.mousePosX;
      mousePosY = saved.mousePosY;
      isTracking = saved.isTracking;
      frameCount = saved.frameCount;
      idleTime = saved.idleTime;
      idleAnimation = saved.idleAnimation;
      idleAnimationFrame = saved.idleAnimationFrame;
      nextIdleAnimationTime = saved.nextIdleAnimationTime;
      spriteName = saved.spriteName;
      spriteFrame = saved.spriteFrame;
    } catch {
      // Invalid or inaccessible storage falls back to the fresh-visit state.
    }
  }

  function onAnimationFrame(timestamp) {
    // Stops execution if the neko element is removed from DOM
    if (!nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (drop) {
      animateDrop(timestamp);
      lastFrameTimestamp = timestamp;
    } else if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function animateDrop(timestamp) {
    drop.startTime ??= timestamp;
    const elapsed = timestamp - drop.startTime;

    if (elapsed < drop.fallDuration) {
      const progress = elapsed / drop.fallDuration;
      // Accelerate gently into the landing, keeping the paws facing down.
      nekoPosY =
        drop.startY + (drop.targetY - drop.startY) * progress * progress;
      setSprite("S", Math.floor(elapsed / 100));
    } else {
      const progress = (elapsed - drop.fallDuration) / 240;
      if (progress >= 1) {
        finishDrop();
        return;
      }

      // A quick squash at the feet, then one tiny rebound before settling.
      const rebound = Math.max(0, (progress - 0.25) / 0.75);
      nekoPosY = drop.targetY - Math.sin(rebound * Math.PI) * 3;
      const squash = Math.max(0, 1 - progress * 4);
      nekoEl.style.transform = `scaleY(${1 - squash * 0.18})`;
      setSprite("idle", 0);
    }
    updatePosition();
  }

  function finishDrop() {
    if (!drop) return;
    nekoPosY = drop.targetY;
    drop = null;
    nekoEl.style.transform = "";
    updatePosition();
    resetIdleAnimation();
    idleTime = isTracking ? 1 : 0;
    setSprite(isAttentive() ? "alert" : "idle", 0);
  }

  function setSprite(name, frame) {
    spriteName = name;
    spriteFrame = frame;
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleTime = 0;
    idleAnimation = null;
    idleAnimationFrame = 0;
    nextIdleAnimationTime = 30 + Math.floor(Math.random() * 40);
  }

  function isAttentive() {
    return isHovered || nekoEl.matches(":focus-visible");
  }

  function updatePosition() {
    nekoPosX = Math.max(16, Math.min(nekoPosX, window.innerWidth - 16));
    nekoPosY = Math.max(16, Math.min(nekoPosY, window.innerHeight - 16));
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  function idle() {
    idleTime += 1;

    // Sit for 3–7 seconds between grooming, scratching, and naps.
    if (idleTime >= nextIdleAnimationTime && idleAnimation === null) {
      const availableIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosX < 32) {
        availableIdleAnimations.push("scratchWallW");
      }
      if (nekoPosY < 32) {
        availableIdleAnimations.push("scratchWallN");
      }
      if (nekoPosX > window.innerWidth - 32) {
        availableIdleAnimations.push("scratchWallE");
      }
      if (nekoPosY > window.innerHeight - 32) {
        availableIdleAnimations.push("scratchWallS");
      }
      idleAnimation =
        availableIdleAnimations[
          Math.floor(Math.random() * availableIdleAnimations.length)
        ];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    if (drag) {
      frameCount += 1;
      const sprite =
        drag.moved && performance.now() - drag.lastMoveTime < 150
          ? drag.sprite
          : "alert";
      setSprite(sprite, frameCount);
      return;
    }

    if (!isTracking) {
      if (isAttentive()) {
        setSprite("alert", 0);
      } else {
        idle();
      }
      return;
    }

    frameCount += 1;
    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 48) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction;
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    updatePosition();
  }

  init();
})();
