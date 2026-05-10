'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Image as ImageIcon, Camera, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { GYM_ID } from '@/lib/constants'

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('logo_url, gallery')
          .eq('id', GYM_ID)
          .single()

        if (data) {
          if (data.logo_url) setLogoUrl(data.logo_url)
          if (data.gallery) setGallery(data.gallery)
        }
      } catch (error) {
        console.error('Failed to fetch settings', error)
      } finally {
        setIsFetching(false)
      }
    }
    fetchSettings()
  }, [supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB.')
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setIsUploadingGallery(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `gallery/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('gym-assets')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('gym-assets')
          .getPublicUrl(fileName)

        return publicUrlData.publicUrl
      })

      const newUrls = await Promise.all(uploadPromises)
      const updatedGallery = [...gallery, ...newUrls]

      const { error: dbError } = await supabase
        .from('settings')
        .upsert({ id: GYM_ID, gallery: updatedGallery, updated_at: new Date().toISOString() })

      if (dbError) throw dbError

      setGallery(updatedGallery)
      toast.success(`${newUrls.length} foto berhasil ditambahkan ke galeri!`)
    } catch (error: any) {
      toast.error('Gagal upload galeri: ' + error.message)
    } finally {
      setIsUploadingGallery(false)
    }
  }

  const removeGalleryImage = async (urlToRemove: string) => {
    const updatedGallery = gallery.filter(url => url !== urlToRemove)
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: GYM_ID, gallery: updatedGallery, updated_at: new Date().toISOString() })

      if (error) throw error
      setGallery(updatedGallery)
      toast.success('Foto dihapus')
    } catch (error: any) {
      toast.error('Gagal menghapus foto')
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile && !logoUrl) {
      toast.error('Pilih logo terlebih dahulu.')
      return
    }

    setIsLoading(true)
    try {
      let finalLogoUrl = logoUrl

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `logo-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, selectedFile, {
            upsert: true,
            contentType: selectedFile.type
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName)

        finalLogoUrl = publicUrlData.publicUrl
      }

      const { error: dbError } = await supabase
        .from('settings')
        .upsert({
          id: GYM_ID,
          logo_url: finalLogoUrl,
          gallery: gallery,
          updated_at: new Date().toISOString()
        })

      if (dbError) throw dbError

      toast.success('Pengaturan berhasil disimpan!')
      setSelectedFile(null)
      setLogoUrl(finalLogoUrl)
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan pengaturan.')
    } finally {
      setIsLoading(false)
    }
  }

  const displayUrl = previewUrl || logoUrl

  return (
    <div className="flex-1 space-y-8 p-8 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengaturan Gym</h1>
            <p className="text-sm text-muted-foreground">Kelola identitas dan galeri visual gym Anda</p>
          </div>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-1">

        {/* Section 1: Logo */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Logo Identitas</h2>
              <p className="text-xs text-muted-foreground">Muncul di kartu member dan landing page</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 sm:flex-row">
            <div
              className={`relative flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 ${displayUrl ? 'border-primary shadow-[0_0_30px_rgba(212,255,0,0.2)]' : 'border-border'} bg-background`}
            >
              {isFetching ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : displayUrl ? (
                <img src={displayUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-foreground rounded-xl text-sm font-medium transition-all"
                >
                  <Upload className="h-4 w-4" />
                  Pilih Logo Baru
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !selectedFile}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-black rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Simpan Logo
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Rekomendasi: PNG transparan, ukuran persegi, max 2MB.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Galeri Suasana Gym */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Galeri Suasana Gym</h2>
                <p className="text-xs text-muted-foreground">Tampilkan suasana real latihan di gym Anda</p>
              </div>
            </div>

            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleGalleryUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={isUploadingGallery}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-bold transition-all"
            >
              {isUploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Tambah Foto
            </button>
          </div>

          {gallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Belum ada foto galeri.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {gallery.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-background">
                  <img src={url} alt={`Gallery ${i}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <button
                      onClick={() => removeGalleryImage(url)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Tips: Upload foto area gym, alat, atau saat member sedang latihan untuk hasil terbaik di landing page.</p>
        </div>

      </div>
    </div>
  )
}
