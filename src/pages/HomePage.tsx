import { ArrowRight, Upload, CalendarDays, Images, PencilLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { JournalMockup } from '../components/JournalMockup';

const flow = [
  { title: '上传照片', text: '把这次旅行的照片放进来。', icon: Upload },
  { title: '自动整理', text: '按拍摄日期，找回每一天。', icon: CalendarDays },
  { title: '选择喜欢的照片', text: '留下心动瞬间，排好顺序。', icon: Images },
  { title: '生成并编辑', text: '选个风格，写下你的故事。', icon: PencilLine },
];
export default function HomePage() {
  return <main id="main-content"><section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="small-line" /> 留住旅途中的小美好</span><h1>让我们用照片<br />串起<span className="hand-underline">旅行回忆</span></h1><p className="hero-description">上传一次旅行的照片，我们会按拍摄日期帮你整理，<br className="hidden lg:block" />再快速生成一张可以继续编辑的旅行手账。</p><Link to="/upload" className="primary-button hero-cta">开始制作 <ArrowRight size={19} /></Link><div className="hero-footnote">不用从空白开始，让回忆自然成页。</div></div><div className="hero-art"><span className="art-annotation">a page of your journey</span><JournalMockup /></div></section><section className="flow-section" aria-label="四步制作手账"><div className="flow-title"><span>从照片到手账，只需四步</span><span className="eyebrow">MAKE MEMORIES TANGIBLE</span></div><div className="flow-grid">{flow.map(({ title, text, icon: Icon }, i) => <div className="flow-item" key={title}><div className="flex items-center gap-3"><span className="flow-number">0{i + 1}</span><Icon size={20} strokeWidth={1.5} /></div><h2>{title}</h2><p>{text}</p></div>)}</div></section></main>;
}
