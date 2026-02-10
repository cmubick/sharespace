export interface MockMediaItem {
  mediaId: string
  s3Key: string
  thumbnailKey: string
  mediaType: 'image/jpeg'
  uploaderName: string
  caption?: string
  year: number
  uploadTimestamp: string
}

const randomYear = () => 2005 + Math.floor(Math.random() * 21)

const randomCaption = (index: number) => {
  if (Math.random() > 0.5) return undefined
  const captions = [
    'A favorite memory.',
    'Shared with love.',
    'A moment we cherish.',
    'Captured in time.',
    'Always remembered.',
  ]
  return captions[index % captions.length]
}

export const mockMedia: MockMediaItem[] = Array.from({ length: 150 }, (_, index) => {
  const id = (index + 1).toString().padStart(3, '0')
  return {
    mediaId: `mock-${id}`,
    s3Key: `https://picsum.photos/seed/${id}/1200/800`,
    thumbnailKey: `https://picsum.photos/seed/${id}/400/300`,
    mediaType: 'image/jpeg',
    uploaderName: `Guest ${((index % 8) + 1).toString().padStart(2, '0')}`,
    caption: randomCaption(index),
    year: randomYear(),
    uploadTimestamp: new Date(Date.now() - index * 86400000).toISOString(),
  }
})
