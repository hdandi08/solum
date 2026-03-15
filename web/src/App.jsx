import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/full" element={<FullSite />} />
      </Routes>
    </BrowserRouter>
  );
}
