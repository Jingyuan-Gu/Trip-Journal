import { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { Header } from './components/Header';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import DateGroupPage from './pages/DateGroupPage';
import PhotoSelectPage from './pages/PhotoSelectPage';
import TemplatePage from './pages/TemplatePage';
import EditorPage from './pages/EditorPage';
import ItineraryPage from './pages/ItineraryPage';
import { PRODUCT, STEPS } from './config';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${STEPS.find(step => step.path === pathname)?.label ?? '把旅行照片变成一本小手账'} · ${PRODUCT.name}`;
    window.scrollTo(0, 0);
    document.getElementById('route-focus')?.focus({ preventScroll: true });
  }, [pathname]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">跳转到主要内容</a><Header /><div id="route-focus" tabIndex={-1} className="route-focus"><Routes><Route path="/" element={<HomePage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/dates" element={<DateGroupPage />} /><Route path="/select" element={<PhotoSelectPage />} /><Route path="/template" element={<TemplatePage />} /><Route path="/itinerary" element={<ItineraryPage />} /><Route path="/editor" element={<EditorPage />} /><Route path="*" element={<main id="main-content" className="page-content"><h1>这一页还没有留下足迹</h1><Link className="text-link mt-6" to="/">返回首页</Link></main>} /></Routes></div><footer className="site-footer"><span>{PRODUCT.name} · 让旅行有迹可循</span></footer></div>;
}


