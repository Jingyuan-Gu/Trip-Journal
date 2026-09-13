import { Compass, Mountain, Sun, Waves } from 'lucide-react';

/** Phase 1 internal illustration only; never used as uploaded photo data. */
export function JournalMockup({ empty = false }: { empty?: boolean }) {
  return <div className={`journal-mockup ${empty ? 'empty-journal' : ''}`} aria-label={empty ? '手账画布占位示意' : '旅行拼贴模板示意，非用户照片'}>
    <span className="tape tape-top" /><div className="journal-topline"><span>TRAVEL JOURNAL</span><Compass size={23} /></div>
    <h2>{empty ? '你的旅行，待续' : '去有风的地方'}</h2><p className="journal-date">{empty ? '每一个瞬间，都值得收藏' : 'SEP 11, 2026 · ON THE ROAD'}</p>
    <div className="mock-photo-grid">{[Mountain, Waves, Sun, Mountain].map((Icon, index) => <div className={`mock-photo photo-${index}`} key={index}><div className="illustration"><Icon strokeWidth={0.9} size={56} /></div><span>{empty ? `照片 ${String(index + 1).padStart(2, '0')}` : ['山野之间', '听海的声音', '收集阳光', '慢慢走，慢慢看'][index]}</span></div>)}</div>
    <div className="journal-bottom"><p>{empty ? '选好照片，把今天留在这一页。' : '把日子放慢一点，把回忆留久一点。'}</p><span>✳</span></div><span className="tape tape-bottom" />
  </div>;
}
