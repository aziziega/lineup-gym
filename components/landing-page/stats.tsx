'use client'

export default function Stats() {
  return (
    <div className="mt-16 grid grid-cols-3 gap-4">
      {[
        { value: '4.9', label: 'Rating Google' },
        { value: '400+', label: 'Member Terdaftar' },
        { value: '06.00-21.00 WIB', label: 'Jam Operasional' },
      ].map(s => (
        <div key={s.label} className="rounded-xl border border-[#1A1A1A] bg-[#111]/70 px-3 py-4 backdrop-blur-sm">
          <p className="font-heading text-2xl text-[#FF2A2A] sm:text-3xl">{s.value}</p>
          <p className="text-[11px] text-[#888] sm:text-xs">{s.label}</p>
        </div>
      ))}
    </div>
  )
}