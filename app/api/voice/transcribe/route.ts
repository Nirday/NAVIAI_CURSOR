import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { transcribeAudio, transcribeAudioFromBase64 } from '@/libs/voice/src/whisper_service'


export const dynamic = 'force-dynamic'
/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using OpenAI Whisper
 * V1.5: Voice-first interface support
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const base64Audio = formData.get('base64Audio') as string
    const language = formData.get('language') as string || 'en'

    if (!audioFile && !base64Audio) {
      return NextResponse.json(
        { error: 'Either audio file or base64Audio is required' },
        { status: 400 }
      )
    }

    let transcription: string

    if (audioFile) {
      transcription = await transcribeAudio(audioFile, language)
    } else {
      transcription = await transcribeAudioFromBase64(base64Audio, language)
    }

    return NextResponse.json({ transcription })
  } catch (error: any) {
    console.error('Error transcribing audio:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

