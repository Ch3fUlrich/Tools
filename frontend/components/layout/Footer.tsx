"use client";

export default function Footer() {
  return (
    <footer style={{background:'var(--bg-secondary)', borderTop:'1px solid var(--card-border)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{color:'var(--muted)'}}>
            &copy; {new Date().getFullYear()} Tools Collection
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Rust'].map((tech) => (
              <span key={tech} className="rounded-full text-xs font-medium" style={{padding:'0.2rem 0.65rem', background:'var(--input-bg)', color:'var(--fg-secondary)', border:'1px solid var(--card-border)'}}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
