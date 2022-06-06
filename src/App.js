import { HashRouter } from 'react-router-dom';

import { AppRoutes } from 'pages/Routes';

import './App.scss'

function App() {
  return (
    <div className="app">
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </div>
  );
}

export default App;
