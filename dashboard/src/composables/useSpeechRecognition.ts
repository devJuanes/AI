import { onUnmounted, ref } from 'vue'

type SpeechRecognitionCtor = new () => SpeechRecognition

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(onAppend: (text: string, isFinal: boolean) => void) {
  const supported = ref(!!getSpeechRecognition())
  const listening = ref(false)
  let recognition: SpeechRecognition | null = null
  let baseText = ''

  function start(currentInput: string) {
    const Ctor = getSpeechRecognition()
    if (!Ctor || listening.value) return

    baseText = currentInput ? `${currentInput.trimEnd()} ` : ''
    recognition = new Ctor()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      if (final) onAppend(baseText + final, true)
      else if (interim) onAppend(baseText + interim, false)
      if (final) baseText += final
    }

    recognition.onerror = () => stop()
    recognition.onend = () => {
      listening.value = false
    }

    recognition.start()
    listening.value = true
  }

  function stop() {
    recognition?.stop()
    recognition = null
    listening.value = false
  }

  function toggle(currentInput: string) {
    if (listening.value) stop()
    else start(currentInput)
  }

  onUnmounted(stop)

  return { supported, listening, toggle, stop }
}
