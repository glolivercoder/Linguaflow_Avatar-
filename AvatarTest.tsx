import { Avatar } from './components/Avatar';
import './App.css';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Avatar Lip-Sync Test</h1>
                <p>The avatar below should move its mouth when speaking.</p>
                <Avatar text="Hello! This is a test of the Azure Speech lip-sync avatar." />
                <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                    <p>Make sure to configure VITE_AZURE_KEY and VITE_AZURE_REGION in your .env file</p>
                </div>
            </header>
        </div>
    );
}

export default App;
