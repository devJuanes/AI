import { nextTick, type Ref } from 'vue'

/** Scroll inteligente: sigue el final salvo que el usuario haya subido manualmente. */
export function useChatAutoScroll(
  containerRef: Ref<HTMLElement | null>,
  anchorRef: Ref<HTMLElement | null>,
) {
  let stickToBottom = true
  let scrollRaf = 0

  function isNearBottom(threshold = 96) {
    const el = containerRef.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  function onScroll() {
    stickToBottom = isNearBottom()
  }

  function pinToBottom() {
    stickToBottom = true
  }

  async function scrollToBottom(force = false) {
    if (!force && !stickToBottom) return
    await nextTick()
    const el = containerRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
      return
    }
    anchorRef.value?.scrollIntoView({ block: 'end', behavior: 'auto' })
  }

  function scheduleScroll(force = false) {
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0
      void scrollToBottom(force)
    })
  }

  return {
    onScroll,
    pinToBottom,
    scrollToBottom,
    scheduleScroll,
    shouldStick: () => stickToBottom,
  }
}
