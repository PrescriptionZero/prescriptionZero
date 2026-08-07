import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Medico from './pages/Medico';
import Paciente from './pages/Paciente';
import Farmacia from './pages/Farmacia';

function App() {
  return (
    <BrowserRouter>
      {/* El Header se renderiza fuera de las Rutas para que siempre esté visible */}
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/medico" element={<Medico />} />
        <Route path="/paciente" element={<Paciente />} />
        <Route path="/farmacia" element={<Farmacia />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;