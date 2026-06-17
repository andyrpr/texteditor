import fse from 'fs-extra'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip
} from 'docx'
import type { ExportFormatting, ExportOptions, ExportSection } from '@shared/types'
import { docxFontName, marginInches, pageDimensions } from './formatting'
import { htmlToDocxParagraphs, titleParagraph } from './htmlToDocx'

function sectionsToParagraphs(sections: ExportSection[], formatting: ExportFormatting): Paragraph[] {
  const { fontFamily, fontSize } = formatting
  const paragraphs: Paragraph[] = []

  for (const section of sections) {
    if (section.level === 'chapter' && !section.html.trim()) {
      paragraphs.push(titleParagraph(section.title, 'chapter', fontFamily, fontSize))
      continue
    }
    if (section.level === 'scene') {
      paragraphs.push(titleParagraph(section.title, 'scene', fontFamily, fontSize))
      paragraphs.push(...htmlToDocxParagraphs(section.html, fontFamily, fontSize))
      continue
    }
    if (section.level === 'chapter') {
      paragraphs.push(titleParagraph(section.title, 'chapter', fontFamily, fontSize))
      paragraphs.push(...htmlToDocxParagraphs(section.html, fontFamily, fontSize))
    }
  }

  return paragraphs
}

export async function exportDocx(
  savePath: string,
  options: ExportOptions,
  sections: ExportSection[]
): Promise<void> {
  const { formatting, title, author } = options
  const margin = marginInches(formatting.marginPreset)
  const { width, height } = pageDimensions(formatting.pageSize)
  const font = docxFontName(formatting.fontFamily)

  const titlePage: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: title,
          font,
          size: (formatting.fontSize + 10) * 2,
          bold: true
        })
      ]
    })
  ]
  if (author) {
    titlePage.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: author,
            font,
            size: (formatting.fontSize + 2) * 2,
            italics: true
          })
        ]
      })
    )
  }
  titlePage.push(new Paragraph({ children: [new TextRun({ break: 1 })] }))

  const body = sectionsToParagraphs(sections, formatting)

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width, height },
            margin: {
              top: convertInchesToTwip(margin),
              bottom: convertInchesToTwip(margin),
              left: convertInchesToTwip(margin),
              right: convertInchesToTwip(margin)
            }
          }
        },
        children: [...titlePage, ...body]
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  await fse.writeFile(savePath, buffer)
}
