import { DETENT_ANGLES } from "./performance-data.js";

const HOLD_DELAY = 500;
const TAP_DISTANCE = 6;
const HYSTERESIS = 8;
const keys = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

export const normalizeAngle = (value) => ((value % 360) + 360) % 360;

export function shortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

export function pickDetent(angle, currentIndex, hysteresis) {
  const distances = DETENT_ANGLES.map((detent) => Math.abs(shortestAngleDelta(angle, detent)));
  const nearestIndex = distances.indexOf(Math.min(...distances));
  const currentDistance = distances[currentIndex];

  if (Number.isInteger(currentIndex)
    && currentIndex >= 0
    && currentIndex < DETENT_ANGLES.length
    && currentDistance - distances[nearestIndex] <= hysteresis) {
    return currentIndex;
  }

  return nearestIndex;
}

export function energyFromRotation(startEnergy, degrees) {
  return Math.max(0, Math.min(100, Math.round(startEnergy + (degrees / 120) * 100)));
}

const clampIndex = (index) => Math.max(0, Math.min(DETENT_ANGLES.length - 1, index));
const clampEnergy = (energy) => Math.max(0, Math.min(100, energy));
const isChooseMode = (mode) => mode === "choose" || mode === "idle-pose" || mode === "dial-preview";

function angleForPointer(element, event) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
}

function pointerDistance(interaction, event) {
  return Math.hypot(event.clientX - interaction.startX, event.clientY - interaction.startY);
}

export function createDialController(element, callbacks) {
  let currentIndex = 0;
  let interaction;
  let holdTimer;
  let hovered = false;

  const clearHoldTimer = () => {
    if (holdTimer !== undefined) clearTimeout(holdTimer);
    holdTimer = undefined;
  };

  const previewIndex = (index) => {
    const nextIndex = clampIndex(index);
    if (nextIndex === currentIndex) return currentIndex;
    currentIndex = nextIndex;
    callbacks.onPreview(currentIndex);
    return currentIndex;
  };

  const changeEnergy = (amount) => {
    const energy = clampEnergy(callbacks.getEnergy() + amount);
    callbacks.onEnergy(energy);
  };

  const handlePointerDown = (event) => {
    if (interaction || event.button !== undefined && event.button !== 0) return;

    const mode = callbacks.getMode();
    const startAngle = angleForPointer(element, event);
    interaction = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startAngle,
      lastAngle: startAngle,
      startTime: event.timeStamp,
      startEnergy: callbacks.getEnergy(),
      accumulatedDegrees: 0,
      didDrag: false,
      holdFired: false,
    };

    element.setPointerCapture(event.pointerId);
    holdTimer = setTimeout(() => {
      if (!interaction || interaction.didDrag) return;
      interaction.holdFired = true;
      callbacks.onHold();
    }, HOLD_DELAY);
  };

  const handlePointerMove = (event) => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;

    if (pointerDistance(interaction, event) >= TAP_DISTANCE) {
      interaction.didDrag = true;
      clearHoldTimer();
    }

    const angle = angleForPointer(element, event);
    if (isChooseMode(interaction.mode)) {
      const nextIndex = pickDetent(angle, currentIndex, HYSTERESIS);
      if (nextIndex !== currentIndex) {
        currentIndex = nextIndex;
        callbacks.onPreview(currentIndex);
      }
    } else {
      interaction.accumulatedDegrees += shortestAngleDelta(interaction.lastAngle, angle);
      callbacks.onEnergy(energyFromRotation(interaction.startEnergy, interaction.accumulatedDegrees));
    }
    interaction.lastAngle = angle;
  };

  const finishPointer = (event, cancelled = false) => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;

    const activeInteraction = interaction;
    interaction = undefined;
    clearHoldTimer();
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (cancelled || activeInteraction.holdFired) return;

    const duration = event.timeStamp - activeInteraction.startTime;
    const distance = pointerDistance(activeInteraction, event);
    if (isChooseMode(activeInteraction.mode) && activeInteraction.didDrag) {
      callbacks.onRelease(currentIndex);
    } else if (!isChooseMode(activeInteraction.mode) && distance < TAP_DISTANCE && duration < HOLD_DELAY) {
      callbacks.onTap();
    }
  };

  const handlePointerCancel = (event) => finishPointer(event, true);

  const handleKeyDown = (event) => {
    const direction = keys[event.key];
    const chooseMode = isChooseMode(callbacks.getMode());

    if (direction) {
      if (chooseMode) previewIndex(currentIndex + direction);
      else changeEnergy(direction * 5);
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      if (chooseMode) callbacks.onRelease(currentIndex);
      else callbacks.onTap();
      event.preventDefault();
      return;
    }

    if (!chooseMode && event.key === "Home") {
      callbacks.onEnergy(0);
      event.preventDefault();
    } else if (!chooseMode && event.key === "End") {
      callbacks.onEnergy(100);
      event.preventDefault();
    } else if (!chooseMode && event.key === "Escape") {
      callbacks.onHold();
      event.preventDefault();
    }
  };

  const handleWheel = (event) => {
    const active = hovered || element.ownerDocument?.activeElement === element;
    if (active) event.preventDefault();
    if (event.deltaY === 0) return;

    const direction = event.deltaY > 0 ? 1 : -1;
    if (isChooseMode(callbacks.getMode())) previewIndex(currentIndex + direction);
    else changeEnergy(direction * 5);
  };

  const handlePointerEnter = () => {
    hovered = true;
  };
  const handlePointerLeave = () => {
    hovered = false;
  };

  element.addEventListener("pointerdown", handlePointerDown);
  element.addEventListener("pointermove", handlePointerMove);
  element.addEventListener("pointerup", finishPointer);
  element.addEventListener("pointercancel", handlePointerCancel);
  element.addEventListener("keydown", handleKeyDown);
  element.addEventListener("wheel", handleWheel, { passive: false });
  element.addEventListener("pointerenter", handlePointerEnter);
  element.addEventListener("pointerleave", handlePointerLeave);

  return {
    destroy() {
      clearHoldTimer();
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", finishPointer);
      element.removeEventListener("pointercancel", handlePointerCancel);
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("pointerenter", handlePointerEnter);
      element.removeEventListener("pointerleave", handlePointerLeave);
    },
  };
}
