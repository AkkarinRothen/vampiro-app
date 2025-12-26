import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- IMPORTANTE
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'; // Asegúrate de importar el CSS donde pusiste Tailwind

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- ENVOLVER LA APP */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)