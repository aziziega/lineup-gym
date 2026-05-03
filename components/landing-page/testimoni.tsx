'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Ester Oktaviana Iswuryani',
    photo: 'https://lh3.googleusercontent.com/a-/ALV-UjULPnD1t_MGABsHAkHRRiUej7mhgpc_TAf0l80nKjMT3cwclU0=w45-h45-p-rp-mo-br100',
    stars: 5,
    text: 'Tempat strategis, tempat parkir luas, owner informatif terkait penggunaan alat + tempat bersih dan rapi, ada 2 wc. Sangat recommended buat pelajar karena harganya ramah dikantong. Selain itu alat-alat gymnya lengkap. Sukeses selalu'
  },
  {
    name: 'Haris Muhlisin',
    photo: 'https://lh3.googleusercontent.com/a-/ALV-UjWVLyQohoBvyHqljuPrIUpU3l2eslBPbHkJxQ7cBqjq-lX3UKRv=w45-h45-p-rp-mo-ba4-br100',
    stars: 5,
    text: 'Tempat latihan bagus, alat alatnya baru dan kualitas international, ada private training kalau berkenan. Hospitality dari owner juga sangat bagus, kalau ga bisa atau baru mulai dibimbing, walaupun pertama kali latihan menurutku tempat latihan yang bagus, dengan fasilitas lengkap, toilet, loker, musola. Ada bonus pemandangan selatan pengunungan selatan jawa, utara merapi'
  },
  {
    name: 'Vanyahya Arofat',
    photo: 'https://lh3.googleusercontent.com/a-/ALV-UjXv3EPYFuCty7QbsQlw8-JKbpJu3OBZ8A_mI3hKWcs7Vmcy5rc5Fw=w45-h45-p-rp-mo-ba2-br100',
    stars: 5,
    text: 'Tempat Gym dan Fitnes yang Nyaman dengan peralatan yang modern dan memadai, pelayanan ramah, yang punya juga sangat membantu khususnya bagi yang pemula seperti saya. Bagi yang mau gym disekitar Prambanan dg alat lengkap dan harga terjangkau? Line up Gym solusinnya'
  },
  {
    name: 'Eka Lutfi Dance',
    photo: 'https://lh3.googleusercontent.com/a-/ALV-UjWFljXCIO6V1aev3n2V6_K_nlWx2ARPau-TZMtzSez1Ebuv2rVZ=w45-h45-p-rp-mo-br100',
    stars: 5,
    text: 'Tempatnya nyaman, alatnya bagus dan proper. Dimainkan itu pelayanannya juga sangat ramah. Tidak hanya tempat untuk latian saja, namun saling berbagi pengetahuan dan diskusi tentang kesehatan tubuh sering terjadi. Oh iya sudah ada fasilitas loker kusus wanita dan pria sendiri termasuk toiletnya juga.'
  },
  {
    name: 'Pipit Sandra Leogupita',
    photo: 'https://lh3.googleusercontent.com/a/ACg8ocJ-2Tdcze3MMTnmPjtGjI-kp_eIxKX4edtgQvw1iZoxJa68CQ=w45-h45-p-rp-mo-br100',
    stars: 5,
    text: 'Gym dengan alat lengkap dan harga bersahabat. Owner yang sangat membantu dan komunikatif soal penggunaan alar dan program latihan. Kalau datang pagiiiii berasa punya gym pribadi dan personal trainer sendiri. Kamu sedang di Jogja bagian timur, gym rat, kudu kesini. Pagi lebih kuanjurkan'
  },
  {
    name: 'Agnes Shari',
    photo: 'https://lh3.googleusercontent.com/a/ACg8ocIbtlij3ApObWSGdM82TgVhlSs7ip37eU2ENAhjOc-aD-KZxw=w45-h45-p-rp-mo-br100',
    stars: 5,
    text: 'Ownernya ramah, alat gymnya modern, tempatnya bersih, ada 2 kamar mandi buat cwok dan cewek. Ada PTnya juga buat pemula..harganya juga terjangkau dengan alat yg bagus dan modern'
  }
]

export default function Testimoni() {
  return (
    <section className="bg-[#0A0A0A] py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 mb-12 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-[#FF2A2A]">Testimoni</p>
        <h2 className="mt-2 font-heading text-3xl text-white sm:text-4xl">Apa Kata Mereka?</h2>
        <p className="mt-2 text-sm text-[#888]">Review jujur dari member setia Lineup Gym</p>
      </div>

      {/* Testimonials Marquee */}
      <div className="relative flex overflow-hidden py-10 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div className="flex animate-marquee gap-6 whitespace-nowrap">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div 
              key={i} 
              className="w-[350px] flex-shrink-0 rounded-2xl border border-[#1A1A1A] bg-[#111] p-6 transition-all hover:border-[#FF2A2A]/30 whitespace-normal"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[#FF2A2A]/20">
                  <Image src={t.photo} alt={t.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{t.name}</h4>
                  <div className="flex gap-0.5">
                    {[...Array(t.stars)].map((_, idx) => (
                      <Star key={idx} className="h-3 w-3 fill-[#D4FF00] text-[#D4FF00]" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-[#aaa] italic">"{t.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}