import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { generatePdf } from '@/lib/pdf/generate-pdf';
import { generateHtml } from './builders';
import { generateMarkdown, generatePlainText } from './plain-text';
import { generateDocxBuffer } from './docx';

// Chromium download + PDF render needs more time on Vercel serverless
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const format = request.nextUrl.searchParams.get('format') || 'json';
    const title = resume.title || 'resume';
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `${title}-${ts}`;

    switch (format) {
      case 'json': {
        return NextResponse.json(resume);
      }
      case 'html': {
        const html = await generateHtml(resume);
        const body = Buffer.from(html, 'utf8');
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': String(body.byteLength),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.html"`,
          },
        });
      }
      case 'txt': {
        const text = generatePlainText(resume);
        const body = Buffer.from(text, 'utf8');
        return new NextResponse(text, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Length': String(body.byteLength),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.txt"`,
          },
        });
      }
      case 'markdown':
      case 'md': {
        const markdown = generateMarkdown(resume);
        const body = Buffer.from(markdown, 'utf8');
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Length': String(body.byteLength),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.md"`,
          },
        });
      }
      case 'docx': {
        const docxBuffer = await generateDocxBuffer(resume);
        return new NextResponse(new Uint8Array(docxBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Length': String(docxBuffer.length),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`,
          },
        });
      }
      case 'pdf': {
        const fitOnePage = request.nextUrl.searchParams.get('fitOnePage') === 'true';
        const pdfHtml = await generateHtml(resume, true);
        const pdfBuffer = await generatePdf(pdfHtml, { fitOnePage });
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(pdfBuffer.length),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
          },
        });
      }
      default: {
        return NextResponse.json(
          { error: `Unsupported format: ${format}. Supported: json, html, txt, markdown, md, docx, pdf` },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('GET /api/resume/[id]/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
