function Navbar({ user, setView, currentView, onLogout }) {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-danger sticky-top">
            <div className="container-fluid px-4">
                <a className="navbar-brand text-danger fw-bold" href="#" onClick={() => setView('sagas')}>
                    VTM 5E
                </a>
                
                <div className="collapse navbar-collapse">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <button className={`nav-link btn btn-link ${currentView === 'sagas' ? 'active text-danger' : ''}`} 
                                    onClick={() => setView('sagas')}>Sagas</button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link btn btn-link ${currentView === 'characters' ? 'active text-danger' : ''}`} 
                                    onClick={() => setView('characters')}>Personajes</button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link btn btn-link ${currentView === 'lore' ? 'active text-danger' : ''}`} 
                                    onClick={() => setView('lore')}>Archivos</button>
                        </li>
                    </ul>
                    <span className="navbar-text small text-muted me-3">
                        {user.username} <span className="badge bg-secondary">{user.role}</span>
                    </span>
                    <button onClick={onLogout} className="btn btn-outline-secondary btn-sm">SALIR</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;