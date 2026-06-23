import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { loadEnv } from '../../config/env.config';

export interface VozResultado {
  audioBase64: string;
  mime: string;
}

/**
 * TTS via ElevenLabs — usa a MESMA voz/modelo do WhatsApp (n8n) para a voz do app
 * (`/falar`) ter exatamente o mesmo timbre. Voz e modelo são config-driven (env);
 * a chave nunca é hardcoded. Se a chave faltar, lança 503 e o app cai no TTS do navegador.
 */
@Injectable()
export class ElevenLabsAdapter {
  private readonly env = loadEnv();

  get configurado(): boolean {
    return Boolean(this.env.elevenlabsApiKey);
  }

  async tts(texto: string): Promise<VozResultado> {
    if (!this.configurado) {
      throw new ServiceUnavailableException('ELEVENLABS_API_KEY ausente — voz indisponível.');
    }
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.env.elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.env.elevenlabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({ text: texto, model_id: this.env.elevenlabsModel }),
      },
    );
    if (!res.ok) {
      throw new ServiceUnavailableException(`ElevenLabs respondeu ${res.status}.`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { audioBase64: buf.toString('base64'), mime: 'audio/mpeg' };
  }
}
