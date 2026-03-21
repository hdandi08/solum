import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/full" element={<FullSite />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </BrowserRouter>
  );
}
