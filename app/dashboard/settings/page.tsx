'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Image as ImageIcon, Camera, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { GYM_ID } from '@/lib/constants'

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchLogo() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('logo_url')
          .eq('id', GYM_ID)
          .single()

        if (data?.logo_url) {
          setLogoUrl(data.logo_url)
        }
      } catch (error) {
        console.error('Failed to fetch logo', error)
      } finally {
        setIsFetching(false)
      }
    }
    fetchLogo()
  }, [supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validation
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      
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

  const handleSubmit = async () => {
    if (!selectedFile && !logoUrl) {
      toast.error('Pilih logo terlebih dahulu.')
      return
    }

    setIsLoading(true)
    try {
      let finalLogoUrl = logoUrl

      if (selectedFile) {
        // Double check size validation
        if (selectedFile.size > 2 * 1024 * 1024) {
          toast.error('Ukuran file maksimal 2MB!')
          setIsLoading(false)
          return
        }
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `logo-${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
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

      // Pastikan tabel settings ada / upsert data
      const { error: dbError } = await supabase
        .from('settings')
        .upsert({ id: GYM_ID, logo_url: finalLogoUrl, updated_at: new Date().toISOString() })

      if (dbError) throw dbError

      toast.success('Pengaturan berhasil disimpan! Memuat ulang...')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan logo. Pastikan tabel "settings" sudah dibuat.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const displayUrl = previewUrl || logoUrl

  return (
    <div className="flex-1 space-y-8 p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Profil Perusahaan</h1>
            <p className="text-sm text-muted-foreground">Buat perubahan pada profil Anda di sini</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-12">
        
        {/* Section: Logo */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Logo Keren Anda</h2>
              <p className="text-xs text-muted-foreground">Logo anda akan ditampilkan pada member card dan landing page</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-10">
            
            {/* Logo Preview Circle */}
            <div 
              className={`relative flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 ${displayUrl ? 'border-[#FF2A2A]' : 'border-border'} bg-background transition-all`}
              style={{
                boxShadow: displayUrl ? '0 0 40px rgba(255, 42, 42, 0.4)' : 'none'
              }}
            >
              {isFetching ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : displayUrl ? (
                <img src={displayUrl} alt="Logo Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Belum ada logo</span>
                </div>
              )}
            </div>

            {/* Upload Area */}
            <div 
              className="w-full rounded-2xl bg-[#151515] p-8 border border-border text-center transition-all hover:bg-card"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6 shadow-[0_0_20px_rgba(255,42,42,0.4)]">
                <Upload className="h-8 w-8 text-foreground" />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2">Upload Logo Anda</h3>
              <p className="text-sm text-muted-foreground mb-6">Drag and drop atau klik dan cari logo anda</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/webp" 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#2A2A2A] hover:bg-[#333] text-foreground rounded-xl text-sm font-medium transition-colors mb-8"
              >
                <Upload className="h-4 w-4" />
                Pilih File
              </button>

              {selectedFile && (
                <p className="text-sm text-accent mb-6">
                  File terpilih: {selectedFile.name}
                </p>
              )}

              <div className="flex items-center justify-center gap-6 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  PNG, JPG, WEBP
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  Max 2MB
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                  Persegi lebih baik
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-border flex justify-end">
          <button 
            onClick={handleSubmit}
            disabled={isLoading || (!selectedFile && !logoUrl)}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Simpan Perubahan
          </button>
        </div>

      </div>
    </div>
  )
}
