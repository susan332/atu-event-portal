import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/auth';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Events from './pages/Events';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Profile from './pages/Profile';
import AdminEvents from './pages/admin/EventsManagement';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser.user);
    }
  }, []);

  return (
    <Router>
      <Header user={user} setUser={setUser} />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/events" element={<Events user={user} />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} 
          />
          <Route 
            path="/profile" 
            element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
          />
          {user?.role === 'admin' && (
            <Route path="/admin/events" element={<AdminEvents />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
