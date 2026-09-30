// Chromium-only proof of concept: the AudioContext is forced to 24 kHz.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Int16Array(480); // 20 ms at 24 kHz
    this.position = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (const sample of input) {
        this.chunk[this.position++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        if (this.position === this.chunk.length) {
          this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
          this.chunk = new Int16Array(480);
          this.position = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
