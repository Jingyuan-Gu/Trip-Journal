import { CalendarDays } from 'lucide-react';
import { PageFrame } from '../components/PageFrame';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTrip } from '../context/TripContext';
import { getPhotoDateGroups } from '../services/photoService';
import { DateGroupCard } from '../components/DateGroupCard';
export default function DateGroupPage() {
  const { state, setState } = useTrip();
  const navigate = useNavigate();
  const groups = useMemo(() => getPhotoDateGroups(state.photos), [state.photos]);
  const pending = state.photos.some(photo => photo.date === 'pending' || !photo.date);
  return <PageFrame title="照片已经整理好了" description="选择你想制作手账的那一天" back="/upload" placeholder={false}>
    {!state.photos.length || pending ? <section className="paper-panel mt-7"><div className="empty-heading"><CalendarDays size={29} strokeWidth={1.3} /><div><h2>{pending ? '照片还未完成日期整理' : '还没有上传照片'}</h2><p>{pending ? '请返回上传页，点击“整理这些照片”。' : '照片仅保存在当前浏览器会话中，刷新后需要重新上传。'}</p></div></div><Link to="/upload" className="primary-button">返回上传照片</Link></section>
      : <div className="date-groups">{groups.map(group => <DateGroupCard key={group.date} group={group} onSelect={date => {
        setState(previous => ({ ...previous, selectedDate: date })); navigate('/itinerary');
      }} />)}</div>}
  </PageFrame>;
}

