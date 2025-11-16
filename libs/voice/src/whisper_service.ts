/**
 * OpenAI Whisper API Service
 * V1.5: Voice transcription for voice-first interface
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Transcribe audio file to text using Whisper API
 * @param audioFile - File buffer or File object
 * @param language - Optional language code (e.g., 'en')
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioFile: File | Buffer,
  language?: string
): Promise<string> {
  try {
    // Convert Buffer to File if needed
    let file: File
    if (Buffer.isBuffer(audioFile)) {
      // Create a File-like object from Buffer
      // Note: In Node.js environment, we need to use FormData
      const formData = new FormData()
      const blob = new Blob([audioFile as BlobPart])
      file = new File([blob], 'audio.webm', { type: 'audio/webm' })
    } else {
      file = audioFile
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language || 'en',
      response_format: 'text'
    })

    return transcription as unknown as string
  } catch (error: any) {
    console.error('[Whisper] Error transcribing audio:', error)
    throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Transcribe audio from base64 string
 */
export async function transcribeAudioFromBase64(
  base64Audio: string,
  language?: string
): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64Data = base64Audio.includes(',')
      ? base64Audio.split(',')[1]
      : base64Audio

    const audioBuffer = Buffer.from(base64Data, 'base64')

    // Create a File-like object
    const blob = new Blob([audioBuffer])
    const file = new File([blob], 'audio.webm', { type: 'audio/webm' })

    return await transcribeAudio(file, language)
  } catch (error: any) {
    console.error('[Whisper] Error transcribing base64 audio:', error)
    throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`)
  }
}

